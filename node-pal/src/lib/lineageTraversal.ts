import type { Edge, Node } from "reactflow";
import { isInternalBlockFieldEdge } from "@/lib/internalFieldLinks";
import type { SystemNodeData } from "@/components/nodes/SystemNode";
import { parseFieldSourceId, parseFieldTargetId } from "@/lib/connectionUtils";
import { buildMarker, type EdgeMarkerStyle } from "@/lib/edgeMarkers";

export type LineageAnchor = {
  nodeId: string;
  fieldId?: string | null;
};

export type LineageDirection = "upstream" | "downstream" | "full";

export type LineageTrace = {
  anchor: LineageAnchor;
  direction: LineageDirection;
};

export type LineageResult = {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
  /** Field IDs to highlight per node — only fields on traversed edges. */
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

function isParentToParentEdge(edge: Edge) {
  const sourceFieldId = getEdgeSourceFieldId(edge);
  const targetFieldId = getEdgeTargetFieldId(edge);
  return (
    !sourceFieldId &&
    !targetFieldId &&
    (edge.sourceHandle?.startsWith("parent-") ?? false) &&
    (edge.targetHandle?.startsWith("parent-") ?? false)
  );
}

function fieldsOnNode(nodes: Node[], nodeId: string) {
  return (nodes.find((item) => item.id === nodeId)?.data as SystemNodeData | undefined)?.fields ?? [];
}

function isSystemBlockAnchor(nodes: Node[], nodeId: string) {
  const node = nodes.find((item) => item.id === nodeId);
  return node?.type === "system" && fieldsOnNode(nodes, nodeId).length > 0;
}

function connectedUpstreamFieldSeeds(anchorNodeId: string, nodes: Node[], edges: Edge[]) {
  return fieldsOnNode(nodes, anchorNodeId)
    .filter((field) =>
      edges.some(
        (edge) => edge.target === anchorNodeId && getEdgeTargetFieldId(edge) === field.id,
      ),
    )
    .map((field) => ({ nodeId: anchorNodeId, fieldId: field.id }));
}

function connectedDownstreamFieldSeeds(anchorNodeId: string, nodes: Node[], edges: Edge[]) {
  return fieldsOnNode(nodes, anchorNodeId)
    .filter((field) =>
      edges.some(
        (edge) => edge.source === anchorNodeId && getEdgeSourceFieldId(edge) === field.id,
      ),
    )
    .map((field) => ({ nodeId: anchorNodeId, fieldId: field.id }));
}

function createFieldTracker() {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const fieldIdsByNode = new Map<string, Set<string>>();

  const addField = (nodeId: string, fieldId: string) => {
    if (!fieldIdsByNode.has(nodeId)) fieldIdsByNode.set(nodeId, new Set());
    fieldIdsByNode.get(nodeId)!.add(fieldId);
    nodeIds.add(nodeId);
  };

  const addNode = (nodeId: string) => {
    nodeIds.add(nodeId);
  };

  return { nodeIds, edgeIds, fieldIdsByNode, addField, addNode };
}

/** BFS upstream along field handles: follow edges where target field matches the current seed. */
function runUpstreamFieldLineage(seeds: { nodeId: string; fieldId: string }[], edges: Edge[]) {
  const { nodeIds, edgeIds, fieldIdsByNode, addField, addNode } = createFieldTracker();
  const queue = [...seeds];
  const visited = new Set(seeds.map(({ nodeId, fieldId }) => `${nodeId}:${fieldId}`));

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
        addNode(edge.source);
      }
    }
  }

  return { nodeIds, edgeIds, fieldIdsByNode };
}

/** BFS downstream along field handles: follow edges where source field matches the current seed. */
function runDownstreamFieldLineage(seeds: { nodeId: string; fieldId: string }[], edges: Edge[]) {
  const { nodeIds, edgeIds, fieldIdsByNode, addField, addNode } = createFieldTracker();
  const queue = [...seeds];
  const visited = new Set(seeds.map(({ nodeId, fieldId }) => `${nodeId}:${fieldId}`));

  for (const seed of seeds) {
    addField(seed.nodeId, seed.fieldId);
  }

  while (queue.length) {
    const { nodeId, fieldId } = queue.shift()!;

    for (const edge of edges) {
      const edgeSourceFieldId = getEdgeSourceFieldId(edge);
      if (edge.source !== nodeId || edgeSourceFieldId !== fieldId) continue;

      edgeIds.add(edge.id);
      const downstreamFieldId = getEdgeTargetFieldId(edge);
      if (downstreamFieldId && edge.target) {
        const key = `${edge.target}:${downstreamFieldId}`;
        if (!visited.has(key)) {
          visited.add(key);
          addField(edge.target, downstreamFieldId);
          queue.push({ nodeId: edge.target, fieldId: downstreamFieldId });
        }
      } else if (edge.target) {
        addNode(edge.target);
      }
    }
  }

  return { nodeIds, edgeIds, fieldIdsByNode };
}

function runUpstreamNodeLineage(anchorId: string, nodes: Node[], edges: Edge[]) {
  const { nodeIds, edgeIds, fieldIdsByNode, addField, addNode } = createFieldTracker();
  const queue = [anchorId];
  const visitedNodes = new Set<string>([anchorId]);
  addNode(anchorId);

  const activeFieldsAtNode = (nodeId: string) => fieldIdsByNode.get(nodeId) ?? new Set<string>();

  while (queue.length) {
    const current = queue.shift()!;
    const activeFields = activeFieldsAtNode(current);
    const hasActiveFields = activeFields.size > 0;
    const nodeFields = fieldsOnNode(nodes, current);

    for (const edge of edges) {
      if (edge.target !== current) continue;

      const sourceFieldId = getEdgeSourceFieldId(edge);
      const targetFieldId = getEdgeTargetFieldId(edge);

      if (sourceFieldId && targetFieldId) {
        if (!hasActiveFields || !activeFields.has(targetFieldId)) continue;
        if (!nodeFields.some((field) => field.id === targetFieldId)) continue;
        edgeIds.add(edge.id);
        addField(current, targetFieldId);
        if (edge.source) {
          addField(edge.source, sourceFieldId);
          if (!visitedNodes.has(edge.source)) {
            visitedNodes.add(edge.source);
            queue.push(edge.source);
          }
        }
        continue;
      }

      if (sourceFieldId && !targetFieldId) {
        if (hasActiveFields) continue;
        edgeIds.add(edge.id);
        if (edge.source) {
          addField(edge.source, sourceFieldId);
          if (!visitedNodes.has(edge.source)) {
            visitedNodes.add(edge.source);
            queue.push(edge.source);
          }
        }
        continue;
      }

      if (!sourceFieldId && targetFieldId) {
        if (!hasActiveFields || !activeFields.has(targetFieldId)) continue;
        if (!nodeFields.some((field) => field.id === targetFieldId)) continue;
        edgeIds.add(edge.id);
        addField(current, targetFieldId);
        if (edge.source && !visitedNodes.has(edge.source)) {
          visitedNodes.add(edge.source);
          addNode(edge.source);
          queue.push(edge.source);
        }
        continue;
      }

      if (isParentToParentEdge(edge) && edge.source && !visitedNodes.has(edge.source)) {
        if (hasActiveFields) continue;
        edgeIds.add(edge.id);
        visitedNodes.add(edge.source);
        addNode(edge.source);
        queue.push(edge.source);
      }
    }
  }

  return { nodeIds, edgeIds, fieldIdsByNode };
}

function runDownstreamNodeLineage(anchorId: string, nodes: Node[], edges: Edge[]) {
  const { nodeIds, edgeIds, fieldIdsByNode, addField, addNode } = createFieldTracker();
  const queue = [anchorId];
  const visitedNodes = new Set<string>([anchorId]);
  addNode(anchorId);

  const activeFieldsAtNode = (nodeId: string) => fieldIdsByNode.get(nodeId) ?? new Set<string>();

  while (queue.length) {
    const current = queue.shift()!;
    const activeFields = activeFieldsAtNode(current);
    const hasActiveFields = activeFields.size > 0;
    const nodeFields = fieldsOnNode(nodes, current);

    for (const edge of edges) {
      if (edge.source !== current) continue;

      const sourceFieldId = getEdgeSourceFieldId(edge);
      const targetFieldId = getEdgeTargetFieldId(edge);

      if (sourceFieldId && targetFieldId) {
        if (!hasActiveFields || !activeFields.has(sourceFieldId)) continue;
        if (!nodeFields.some((field) => field.id === sourceFieldId)) continue;
        edgeIds.add(edge.id);
        addField(current, sourceFieldId);
        if (edge.target) {
          addField(edge.target, targetFieldId);
          if (!visitedNodes.has(edge.target)) {
            visitedNodes.add(edge.target);
            queue.push(edge.target);
          }
        }
        continue;
      }

      if (sourceFieldId && !targetFieldId) {
        if (hasActiveFields && !activeFields.has(sourceFieldId)) continue;
        if (!hasActiveFields) continue;
        if (!nodeFields.some((field) => field.id === sourceFieldId)) continue;
        edgeIds.add(edge.id);
        addField(current, sourceFieldId);
        if (edge.target && !visitedNodes.has(edge.target)) {
          visitedNodes.add(edge.target);
          addNode(edge.target);
          queue.push(edge.target);
        }
        continue;
      }

      if (!sourceFieldId && targetFieldId) {
        if (hasActiveFields) continue;
        edgeIds.add(edge.id);
        if (edge.target) {
          addField(edge.target, targetFieldId);
          if (!visitedNodes.has(edge.target)) {
            visitedNodes.add(edge.target);
            queue.push(edge.target);
          }
        }
        continue;
      }

      if (isParentToParentEdge(edge) && edge.target && !visitedNodes.has(edge.target)) {
        if (hasActiveFields) continue;
        edgeIds.add(edge.id);
        visitedNodes.add(edge.target);
        addNode(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return { nodeIds, edgeIds, fieldIdsByNode };
}

/** Trace upstream (sources / root cause) from an anchor field or node. */
export function traceUpstream(
  anchor: LineageAnchor,
  nodes: Node[],
  edges: Edge[],
): LineageResult {
  const { nodeId: anchorNodeId, fieldId: anchorFieldId } = anchor;

  if (anchorFieldId) {
    return runUpstreamFieldLineage([{ nodeId: anchorNodeId, fieldId: anchorFieldId }], edges);
  }

  if (isSystemBlockAnchor(nodes, anchorNodeId)) {
    const seeds = connectedUpstreamFieldSeeds(anchorNodeId, nodes, edges);
    const fieldResult =
      seeds.length > 0 ? runUpstreamFieldLineage(seeds, edges) : emptyLineage();
    const nodeResult = runUpstreamNodeLineage(anchorNodeId, nodes, edges);
    return mergeLineageResults(fieldResult, nodeResult);
  }

  return runUpstreamNodeLineage(anchorNodeId, nodes, edges);
}

/** Trace downstream (impact / consumers) from an anchor field or node. */
export function traceDownstream(
  anchor: LineageAnchor,
  nodes: Node[],
  edges: Edge[],
): LineageResult {
  const { nodeId: anchorNodeId, fieldId: anchorFieldId } = anchor;

  if (anchorFieldId) {
    return runDownstreamFieldLineage([{ nodeId: anchorNodeId, fieldId: anchorFieldId }], edges);
  }

  if (isSystemBlockAnchor(nodes, anchorNodeId)) {
    const seeds = connectedDownstreamFieldSeeds(anchorNodeId, nodes, edges);
    const fieldResult =
      seeds.length > 0 ? runDownstreamFieldLineage(seeds, edges) : emptyLineage();
    const nodeResult = runDownstreamNodeLineage(anchorNodeId, nodes, edges);
    return mergeLineageResults(fieldResult, nodeResult);
  }

  return runDownstreamNodeLineage(anchorNodeId, nodes, edges);
}

function mergeLineageResults(...results: LineageResult[]): LineageResult {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const fieldIdsByNode = new Map<string, Set<string>>();

  for (const result of results) {
    for (const nodeId of result.nodeIds) nodeIds.add(nodeId);
    for (const edgeId of result.edgeIds) edgeIds.add(edgeId);
    for (const [nodeId, fieldIds] of result.fieldIdsByNode) {
      if (!fieldIdsByNode.has(nodeId)) fieldIdsByNode.set(nodeId, new Set());
      for (const fieldId of fieldIds) fieldIdsByNode.get(nodeId)!.add(fieldId);
    }
  }

  return { nodeIds, edgeIds, fieldIdsByNode };
}

/** Trace both upstream and downstream from an anchor. */
export function traceFullLineage(
  anchor: LineageAnchor,
  nodes: Node[],
  edges: Edge[],
): LineageResult {
  return mergeLineageResults(
    traceUpstream(anchor, nodes, edges),
    traceDownstream(anchor, nodes, edges),
  );
}

export function computeLineageTrace(
  trace: LineageTrace | null,
  nodes: Node[],
  edges: Edge[],
): LineageResult {
  if (!trace) return emptyLineage();
  if (trace.direction === "upstream") {
    return traceUpstream(trace.anchor, nodes, edges);
  }
  if (trace.direction === "downstream") {
    return traceDownstream(trace.anchor, nodes, edges);
  }
  return traceFullLineage(trace.anchor, nodes, edges);
}

/** Upstream-only helper for embed view (click-to-trace). */
export function computeLineage(
  anchor: LineageAnchor | null,
  nodes: Node[],
  edges: Edge[],
): LineageResult {
  if (!anchor) return emptyLineage();
  return traceUpstream(anchor, nodes, edges);
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
