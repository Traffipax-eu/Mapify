import type { Edge, Node } from "reactflow";

const DISPLAY_ONLY_DATA_KEYS = [
  "inLineage",
  "faded",
  "activeFieldIds",
  "hasImpact",
  "fieldLineageActive",
] as const;

export type CanvasSnapshot = {
  nodes: Node[];
  edges: Edge[];
};

function stripDisplayData<T extends Record<string, unknown>>(data: T): T {
  const next = { ...data };
  for (const key of DISPLAY_ONLY_DATA_KEYS) {
    delete next[key];
  }
  return next;
}

export function cloneCanvasSnapshot(nodes: Node[], edges: Edge[]): CanvasSnapshot {
  return {
    nodes: nodes.map((node) => ({
      ...node,
      data: stripDisplayData(structuredClone(node.data as Record<string, unknown>)),
      position: { ...node.position },
      style: node.style ? { ...node.style } : undefined,
    })),
    edges: structuredClone(edges),
  };
}

export const CANVAS_HISTORY_LIMIT = 60;

export function createCanvasHistoryState() {
  let undoStack: CanvasSnapshot[] = [];
  let redoStack: CanvasSnapshot[] = [];

  return {
    push(snapshot: CanvasSnapshot) {
      undoStack = [...undoStack.slice(-(CANVAS_HISTORY_LIMIT - 1)), snapshot];
      redoStack = [];
    },
    undo(current: CanvasSnapshot): CanvasSnapshot | null {
      if (undoStack.length === 0) return null;
      const previous = undoStack[undoStack.length - 1]!;
      undoStack = undoStack.slice(0, -1);
      redoStack = [...redoStack, cloneCanvasSnapshot(current.nodes, current.edges)];
      return cloneCanvasSnapshot(previous.nodes, previous.edges);
    },
    redo(current: CanvasSnapshot): CanvasSnapshot | null {
      if (redoStack.length === 0) return null;
      const next = redoStack[redoStack.length - 1]!;
      redoStack = redoStack.slice(0, -1);
      undoStack = [...undoStack, cloneCanvasSnapshot(current.nodes, current.edges)];
      return cloneCanvasSnapshot(next.nodes, next.edges);
    },
    canUndo() {
      return undoStack.length > 0;
    },
    canRedo() {
      return redoStack.length > 0;
    },
    clear() {
      undoStack = [];
      redoStack = [];
    },
  };
}
