import type { Edge, Node } from "reactflow";
import {
  containerSourceHandle,
  containerTargetHandle,
  parentSourceHandle,
  parentTargetHandle,
} from "./connectionUtils";
import type { EdgeData } from "./storage";
import type { SystemNodeData } from "@/components/nodes/SystemNode";

function isSystemNode(node: Node | undefined): node is Node<SystemNodeData> {
  return node?.type === "system";
}

function isInternalEdgeEndpoint(
  nodeId: string,
  edge: Edge<EdgeData>,
  role: "source" | "target",
): boolean {
  const data = edge.data;
  if (!data) return false;
  if (role === "source") {
    return Boolean(data.sourceFieldId || data.sourceContainerId);
  }
  return Boolean(data.targetFieldId || data.targetContainerId);
}

function resolveFieldContainerId(
  data: SystemNodeData,
  fieldId: string,
): string | null {
  const field = data.fields?.find((item) => item.id === fieldId);
  if (!field) return null;

  const groups = data.groups ?? [];
  const sections = data.sections ?? [];

  if (field.groupId) {
    const group = groups.find((item) => item.id === field.groupId);
    if (group?.collapsed) return group.id;
  }

  const sectionId = field.sectionId;
  if (sectionId) {
    const section = sections.find((item) => item.id === sectionId);
    if (section?.collapsed) return section.id;
  }

  return null;
}

function resolveContainerIfAncestorCollapsed(
  data: SystemNodeData,
  containerId: string,
): string | null {
  const groups = data.groups ?? [];
  const sections = data.sections ?? [];

  const group = groups.find((item) => item.id === containerId);
  if (group) {
    const section = sections.find((item) => item.id === group.sectionId);
    if (section?.collapsed) return section.id;
    return null;
  }

  return null;
}

export function resolveCollapsedDisplayHandle(
  nodeId: string,
  node: Node | undefined,
  role: "source" | "target",
  edge: Edge<EdgeData>,
): { handle: string | null | undefined; rerouted: boolean } {
  const currentHandle = role === "source" ? edge.sourceHandle : edge.targetHandle;
  if (!isSystemNode(node)) {
    return { handle: currentHandle, rerouted: false };
  }

  const data = node.data ?? {};
  const edgeData = edge.data;

  if (data.collapsed && isInternalEdgeEndpoint(nodeId, edge, role)) {
    return {
      handle: role === "source" ? parentSourceHandle(nodeId) : parentTargetHandle(nodeId),
      rerouted: true,
    };
  }

  if (role === "source") {
    if (edgeData?.sourceFieldId) {
      const containerId = resolveFieldContainerId(data, edgeData.sourceFieldId);
      if (containerId) {
        return { handle: containerSourceHandle(containerId), rerouted: true };
      }
    }
    if (edgeData?.sourceContainerId) {
      const parentSectionId = resolveContainerIfAncestorCollapsed(data, edgeData.sourceContainerId);
      if (parentSectionId) {
        return { handle: containerSourceHandle(parentSectionId), rerouted: true };
      }
    }
  } else {
    if (edgeData?.targetFieldId) {
      const containerId = resolveFieldContainerId(data, edgeData.targetFieldId);
      if (containerId) {
        return { handle: containerTargetHandle(containerId), rerouted: true };
      }
    }
    if (edgeData?.targetContainerId) {
      const parentSectionId = resolveContainerIfAncestorCollapsed(data, edgeData.targetContainerId);
      if (parentSectionId) {
        return { handle: containerTargetHandle(parentSectionId), rerouted: true };
      }
    }
  }

  return { handle: currentHandle, rerouted: false };
}

export function rerouteEdgesForCollapsedNodes(edges: Edge<EdgeData>[], nodes: Node[]): Edge<EdgeData>[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return edges.map((edge) => {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);

    const sourceResolution = resolveCollapsedDisplayHandle(edge.source, sourceNode, "source", edge);
    const targetResolution = resolveCollapsedDisplayHandle(edge.target, targetNode, "target", edge);

    const rerouted = sourceResolution.rerouted || targetResolution.rerouted;
    if (!rerouted) return edge;

    return {
      ...edge,
      sourceHandle: sourceResolution.handle ?? edge.sourceHandle,
      targetHandle: targetResolution.handle ?? edge.targetHandle,
      data: {
        ...edge.data,
        rerouted: true,
      },
    };
  });
}
