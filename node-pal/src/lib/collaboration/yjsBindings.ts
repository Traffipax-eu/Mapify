import * as Y from "yjs";
import type { Edge, Node, NodeChange, EdgeChange } from "reactflow";

export const YJS_NODES_KEY = "nodes";
export const YJS_EDGES_KEY = "edges";

const DISPLAY_ONLY_DATA_KEYS = [
  "inLineage",
  "faded",
  "activeFieldIds",
  "hasImpact",
  "fieldLineageActive",
] as const;

export function stripDisplayNodeData<T extends Record<string, unknown>>(data: T): T {
  const next = { ...data };
  for (const key of DISPLAY_ONLY_DATA_KEYS) {
    delete next[key];
  }
  return next;
}

export function serializeNode(node: Node): Node {
  return {
    ...node,
    selected: false,
    dragging: false,
    data: stripDisplayNodeData((node.data ?? {}) as Record<string, unknown>),
  };
}

export function serializeEdge(edge: Edge): Edge {
  return {
    ...edge,
    selected: false,
  };
}

export function readNodesFromYMap(nodesMap: Y.Map<unknown>): Node[] {
  return Array.from(nodesMap.values()) as Node[];
}

export function readEdgesFromYMap(edgesMap: Y.Map<unknown>): Edge[] {
  return Array.from(edgesMap.values()) as Edge[];
}

export function seedYjsFromReactState(
  doc: Y.Doc,
  nodes: Node[],
  edges: Edge[],
): void {
  const nodesMap = doc.getMap(YJS_NODES_KEY);
  const edgesMap = doc.getMap(YJS_EDGES_KEY);

  if (nodesMap.size > 0 || edgesMap.size > 0) return;

  doc.transact(() => {
    for (const node of nodes) {
      nodesMap.set(node.id, serializeNode(node));
    }
    for (const edge of edges) {
      edgesMap.set(edge.id, serializeEdge(edge));
    }
  });
}

export function applyNodeChangesToYMap(nodesMap: Y.Map<unknown>, changes: NodeChange[]): void {
  for (const change of changes) {
    if (change.type === "add") {
      nodesMap.set(change.item.id, serializeNode(change.item));
      continue;
    }

    if (change.type === "remove") {
      nodesMap.delete(change.id);
      continue;
    }

    if (change.type === "reset") {
      const items = "items" in change && Array.isArray(change.items) ? change.items : [change.item];
      const nextIds = new Set(items.map((item: Node) => item.id));
      for (const key of Array.from(nodesMap.keys())) {
        if (!nextIds.has(key)) nodesMap.delete(key);
      }
      for (const item of items) {
        nodesMap.set(item.id, serializeNode(item));
      }
      continue;
    }

    if (!("id" in change)) continue;
    const existing = nodesMap.get(change.id) as Node | undefined;
    if (!existing) continue;

    if (change.type === "position" && change.position) {
      nodesMap.set(change.id, {
        ...existing,
        position: change.position,
        dragging: change.dragging ?? false,
      });
      continue;
    }

    if (change.type === "dimensions" && change.dimensions) {
      nodesMap.set(change.id, {
        ...existing,
        width: change.dimensions.width,
        height: change.dimensions.height,
        measured: change.dimensions,
      });
    }
  }
}

export function applyEdgeChangesToYMap(edgesMap: Y.Map<unknown>, changes: EdgeChange[]): void {
  for (const change of changes) {
    if (change.type === "add") {
      edgesMap.set(change.item.id, serializeEdge(change.item));
      continue;
    }

    if (change.type === "remove") {
      edgesMap.delete(change.id);
      continue;
    }

    if (!("id" in change)) continue;
    const existing = edgesMap.get(change.id) as Edge | undefined;
    if (!existing) continue;

    if (change.type === "select") {
      edgesMap.set(change.id, { ...existing, selected: change.selected });
    }
  }
}

export function upsertNodeInYMap(nodesMap: Y.Map<unknown>, node: Node): void {
  nodesMap.set(node.id, serializeNode(node));
}

export function upsertEdgeInYMap(edgesMap: Y.Map<unknown>, edge: Edge): void {
  edgesMap.set(edge.id, serializeEdge(edge));
}

export function removeEdgesFromYMap(edgesMap: Y.Map<unknown>, edgeIds: string[]): void {
  for (const id of edgeIds) {
    edgesMap.delete(id);
  }
}
