import type { Edge, Node } from "reactflow";
import { isInternalBlockFieldEdge } from "@/lib/internalFieldLinks";
import type { SystemNodeData } from "@/components/nodes/SystemNode";
import { parseFieldSourceId, parseFieldTargetId } from "@/lib/connectionUtils";
import { buildMarker, type EdgeMarkerStyle } from "@/lib/edgeMarkers";

export type LineageAnchor = {
  nodeId: string;
  fieldId?: string | null;
};

export type LineageResult = {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
  fieldIdsByNode: Map<string, Set<string>>;
};

const emptyLineage = (): LineageResult => ({
  nodeIds: new Set<string>(),
  edgeIds: new Set<string>(),
  fieldIdsByNode: new Map<string, Set<string>>(),
});

function getEdgeSourceFieldId(edge: Edge) {
  return edge.data?.sourceFieldId ?? (edge.sourceHandle ? parseFieldSourceId(edge.sourceHandle) : null);
}

function getEdgeTargetFieldId(edge: Edge) {
  return edge.data?.targetFieldId ?? (edge.targetHandle ? parseFieldTargetId(edge.targetHandle) : null);
}

/** Upstream lineage from a system node or field selection. */
export function computeLineage(
  anchor: LineageAnchor | null,
  nodes: Node[],
  edges: Edge[],
): LineageResult {
  if (!anchor) return emptyLineage();

  const { nodeId: anchorNodeId, fieldId: anchorFieldId } = anchor;

  const runUpstreamFieldLineage = (seeds: { nodeId: string; fieldId: string }[]) => {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    const fieldIdsByNode = new Map<string, Set<string>>();
    const queue = [...seeds];
    const visited = new Set(seeds.map(({ nodeId, fieldId }) => `${nodeId}:${fieldId}`));

    const addField = (nodeId: string, fieldId: string) => {
      if (!fieldIdsByNode.has(nodeId)) fieldIdsByNode.set(nodeId, new Set());
      fieldIdsByNode.get(nodeId)!.add(fieldId);
      nodeIds.add(nodeId);
    };

    for (const seed of seeds) {
      addField(seed.nodeId, seed.fieldId);
    }

    while (queue.length) {
      const { nodeId, fieldId } = queue.shift()!;

      for (const edge of edges) {
        const edgeTargetFieldId = getEdgeTargetFieldId(edge);
        if (edge.target !== nodeId || edgeTargetFieldId !== fieldId) continue;

        edgeIds.add(edge.id);
        const upstreamFieldId = getEdgeSourceFieldId(edge);
        if (upstreamFieldId && edge.source) {
          const key = `${edge.source}:${upstreamFieldId}`;
          if (!visited.has(key)) {
            visited.add(key);
            addField(edge.source, upstreamFieldId);
            queue.push({ nodeId: edge.source, fieldId: upstreamFieldId });
          }
        } else if (edge.source) {
          nodeIds.add(edge.source);
        }
      }
    }

    return { nodeIds, edgeIds, fieldIdsByNode };
  };

  const runUpstreamNodeLineage = (anchorId: string) => {
    const nodeIds = new Set<string>([anchorId]);
    const edgeIds = new Set<string>();
    const fieldIdsByNode = new Map<string, Set<string>>();
    const queue = [anchorId];
    const visitedNodes = new Set<string>([anchorId]);

    const addField = (nodeId: string, fieldId: string) => {
      if (!fieldIdsByNode.has(nodeId)) fieldIdsByNode.set(nodeId, new Set());
      fieldIdsByNode.get(nodeId)!.add(fieldId);
      nodeIds.add(nodeId);
    };

    const fieldsOnNode = (nodeId: string) =>
      (nodes.find((item) => item.id === nodeId)?.data as SystemNodeData | undefined)?.fields ?? [];

    while (queue.length) {
      const current = queue.shift()!;

      for (const edge of edges) {
        if (edge.target !== current) continue;

        const sourceFieldId = getEdgeSourceFieldId(edge);
        const targetFieldId = getEdgeTargetFieldId(edge);
        const isParentToParent =
          !sourceFieldId &&
          !targetFieldId &&
          edge.sourceHandle?.startsWith("parent-") &&
          edge.targetHandle?.startsWith("parent-");

        if (sourceFieldId && targetFieldId) {
          if (!fieldsOnNode(current).some((field) => field.id === targetFieldId)) continue;
          edgeIds.add(edge.id);
          if (edge.source) {
            nodeIds.add(edge.source);
            addField(edge.source, sourceFieldId);
            if (!visitedNodes.has(edge.source)) {
              visitedNodes.add(edge.source);
              queue.push(edge.source);
            }
          }
          continue;
        }

        if (sourceFieldId && !targetFieldId) {
          edgeIds.add(edge.id);
          if (edge.source) {
            nodeIds.add(edge.source);
            addField(edge.source, sourceFieldId);
            if (!visitedNodes.has(edge.source)) {
              visitedNodes.add(edge.source);
              queue.push(edge.source);
            }
          }
          continue;
        }

        if (!sourceFieldId && targetFieldId) {
          if (!fieldsOnNode(current).some((field) => field.id === targetFieldId)) continue;
          edgeIds.add(edge.id);
          if (edge.source && !visitedNodes.has(edge.source)) {
            visitedNodes.add(edge.source);
            nodeIds.add(edge.source);
            queue.push(edge.source);
          }
          continue;
        }

        if (isParentToParent && edge.source && !visitedNodes.has(edge.source)) {
          edgeIds.add(edge.id);
          visitedNodes.add(edge.source);
          nodeIds.add(edge.source);
          queue.push(edge.source);
        }
      }
    }

    return { nodeIds, edgeIds, fieldIdsByNode };
  };

  if (anchorFieldId) {
    return runUpstreamFieldLineage([{ nodeId: anchorNodeId, fieldId: anchorFieldId }]);
  }

  const anchorNode = nodes.find((item) => item.id === anchorNodeId);
  const nodeFields = (anchorNode?.data as SystemNodeData | undefined)?.fields ?? [];
  const connectedSeeds = nodeFields
    .filter((field) =>
      edges.some(
        (edge) => edge.target === anchorNodeId && getEdgeTargetFieldId(edge) === field.id,
      ),
    )
    .map((field) => ({ nodeId: anchorNodeId, fieldId: field.id }));

  if (connectedSeeds.length > 0) {
    return runUpstreamFieldLineage(connectedSeeds);
  }

  return runUpstreamNodeLineage(anchorNodeId);
}

export function decorateEdgesForDisplay(
  edges: Edge[],
  options: {
    lineageEdgeIds: Set<string>;
    hasLineage: boolean;
    selectedEdgeId?: string | null;
    hiddenNodeIds?: Set<string>;
    defaultStrokeColor?: string;
  },
): Edge[] {
  const {
    lineageEdgeIds,
    hasLineage,
    selectedEdgeId = null,
    hiddenNodeIds,
    defaultStrokeColor = "#475569",
  } = options;

  return edges.map((edge) => {
    const inLineage = lineageEdgeIds.has(edge.id);
    const isSelected = edge.id === selectedEdgeId;
    const faded = hasLineage && !inLineage && !isSelected;
    const markerStartStyle = edge.data?.markerStart ?? "none";
    const markerEndStyle = edge.data?.markerEnd ?? "arrowclosed";
    const strokeColor = inLineage
      ? "oklch(0.72 0.22 35)"
      : isSelected
        ? "#2563eb"
        : defaultStrokeColor;

    return {
      ...edge,
      type: edge.type ?? "custom",
      selected: isSelected,
      hidden: Boolean(
        hiddenNodeIds?.has(edge.source) ||
          hiddenNodeIds?.has(edge.target) ||
          isInternalBlockFieldEdge(edge),
      ),
      animated: inLineage,
      zIndex: inLineage || isSelected ? 3 : 1,
      markerStart:
        edge.markerStart ??
        buildMarker(markerStartStyle as EdgeMarkerStyle, strokeColor),
      markerEnd:
        edge.markerEnd ??
        buildMarker(markerEndStyle as EdgeMarkerStyle, strokeColor),
      className: `${inLineage ? "edge-lineage" : ""} ${faded ? "edge-faded" : ""}`.trim(),
    };
  });
}
