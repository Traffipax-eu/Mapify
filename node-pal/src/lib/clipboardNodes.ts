import type { Node } from "reactflow";
import type { SystemNodeData } from "@/components/nodes/SystemNode";
import { getAbsolutePosition, buildNodeLookup } from "@/lib/containerUtils";

export const COPYABLE_NODE_TYPES = new Set([
  "system",
  "touchpoint",
  "stickyNote",
  "textNode",
  "shapeNode",
  "container",
  "customObject",
]);

const PASTE_OFFSET = { x: 30, y: 30 };

const DISPLAY_ONLY_DATA_KEYS = [
  "inLineage",
  "faded",
  "activeFieldIds",
  "hasImpact",
  "fieldLineageActive",
] as const;

function stripDisplayData<T extends Record<string, unknown>>(data: T): T {
  const next = structuredClone(data);
  for (const key of DISPLAY_ONLY_DATA_KEYS) {
    delete next[key];
  }
  return next;
}

function cloneSystemNodeData(data: SystemNodeData): SystemNodeData {
  const cloned = stripDisplayData(data);

  const fields = (cloned.fields ?? []).map((field, index) => ({
    ...field,
    id: `f_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
    metadata: field.metadata ? { ...field.metadata } : undefined,
  }));

  return {
    ...cloned,
    fields,
    metadata: cloned.metadata ? { ...cloned.metadata } : {},
    sections: cloned.sections?.map((section) => ({ ...section })),
    visibleColumns: cloned.visibleColumns ? [...cloned.visibleColumns] : undefined,
    fieldAttributeKeys: cloned.fieldAttributeKeys ? [...cloned.fieldAttributeKeys] : undefined,
  };
}

function cloneNodeData(node: Node): Record<string, unknown> {
  if (node.type === "system") {
    return cloneSystemNodeData(node.data as SystemNodeData);
  }
  return stripDisplayData(structuredClone(node.data as Record<string, unknown>));
}

export function getSelectedCopyableNodes(nodes: Node[]): Node[] {
  return nodes.filter((node) => node.selected && COPYABLE_NODE_TYPES.has(node.type ?? ""));
}

export function cloneNodesForClipboard(nodes: Node[]): Node[] {
  return getSelectedCopyableNodes(nodes).map((node) => ({
    ...node,
    data: cloneNodeData(node),
    style: node.style ? { ...node.style } : undefined,
    selected: false,
  }));
}

export function duplicateNodesFromClipboard(
  clipboard: Node[],
  nextId: () => string,
  pasteGeneration: number,
): Node[] {
  if (clipboard.length === 0) return [];

  const offset = {
    x: PASTE_OFFSET.x * pasteGeneration,
    y: PASTE_OFFSET.y * pasteGeneration,
  };

  const lookup = buildNodeLookup(clipboard);
  const idMap = new Map<string, string>();

  for (const node of clipboard) {
    idMap.set(node.id, nextId());
  }

  return clipboard.map((node) => {
    const newId = idMap.get(node.id)!;
    const parentCopied = node.parentNode ? idMap.has(node.parentNode) : false;

    let position = { ...node.position };

    if (node.parentNode && parentCopied) {
      // Keep relative position inside copied parent.
    } else if (node.parentNode) {
      const absolute = getAbsolutePosition(node, lookup);
      position = {
        x: absolute.x + offset.x,
        y: absolute.y + offset.y,
      };
    } else {
      position = {
        x: node.position.x + offset.x,
        y: node.position.y + offset.y,
      };
    }

    const base = {
      ...node,
      id: newId,
      position,
      data: cloneNodeData(node),
      style: node.style ? { ...node.style } : undefined,
      selected: true,
    };

    if (!parentCopied) {
      return {
        ...base,
        parentNode: undefined,
        extent: undefined,
        zIndex: node.type === "container" ? 0 : node.zIndex,
      };
    }

    return {
      ...base,
      parentNode: idMap.get(node.parentNode!)!,
      extent: node.extent,
      zIndex: node.zIndex,
    };
  });
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}
