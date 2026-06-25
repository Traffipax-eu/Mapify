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

/** React Flow transient props — must not be copied to clipboard or new nodes. */
function stripEphemeralNodeState(node: Node, selected: boolean): Node {
  const {
    dragging: _dragging,
    positionAbsolute: _positionAbsolute,
    resizing: _resizing,
    selected: _selected,
    ...stable
  } = node as Node & {
    dragging?: boolean;
    positionAbsolute?: { x: number; y: number };
    resizing?: boolean;
  };

  return {
    ...stable,
    selected,
  };
}

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

  const groupIdMap = new Map<string, string>();
  const groups = (cloned.groups ?? []).map((group, index) => {
    const newId = `grp_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
    groupIdMap.set(group.id, newId);
    return { ...group, id: newId };
  });

  const fields = (cloned.fields ?? []).map((field, index) => ({
    ...field,
    id: `f_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
    groupId: field.groupId ? groupIdMap.get(field.groupId) : undefined,
    metadata: field.metadata ? { ...field.metadata } : undefined,
  }));

  return {
    ...cloned,
    fields,
    metadata: cloned.metadata ? { ...cloned.metadata } : {},
    sections: cloned.sections?.map((section) => ({ ...section })),
    groups,
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
  return getSelectedCopyableNodes(nodes).map((node) =>
    stripEphemeralNodeState(
      {
        ...node,
        data: cloneNodeData(node),
        style: node.style ? { ...node.style } : undefined,
      },
      false,
    ),
  );
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
      return stripEphemeralNodeState(
        {
          ...base,
          parentNode: undefined,
          extent: undefined,
          zIndex: node.type === "container" ? 0 : node.zIndex,
        },
        true,
      );
    }

    return stripEphemeralNodeState(
      {
        ...base,
        parentNode: idMap.get(node.parentNode!)!,
        extent: node.extent,
        zIndex: node.zIndex,
      },
      true,
    );
  });
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/** True when focus is on a block field/table paste zone — canvas must not create a textbox on Ctrl+V. */
export function isFieldTablePasteTarget(target: EventTarget | null): boolean {
  const element =
    target instanceof HTMLElement
      ? target
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  if (!element) return false;

  return Boolean(
    element.closest(
      [
        ".system-node__field-list-item-inner",
        ".system-node__table--editable",
        ".system-node__section-header.is-paste-target",
        ".system-node__group-header.is-paste-target",
        ".system-node__section-empty.is-paste-target",
        ".system-node__group-empty.is-paste-target",
      ].join(", "),
    ),
  );
}

export const MAPIFY_CLIPBOARD_MARKER = "mapify.clipboard.v1";

export type MapifyClipboardPayload = {
  mapify: typeof MAPIFY_CLIPBOARD_MARKER;
  nodes: Node[];
};

export function serializeNodesToClipboard(nodes: Node[]): string {
  const payload: MapifyClipboardPayload = {
    mapify: MAPIFY_CLIPBOARD_MARKER,
    nodes,
  };
  return JSON.stringify(payload);
}

export function parseClipboardNodes(text: string): Node[] | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(trimmed) as Partial<MapifyClipboardPayload>;
    if (parsed.mapify !== MAPIFY_CLIPBOARD_MARKER || !Array.isArray(parsed.nodes)) {
      return null;
    }

    const nodes = parsed.nodes
      .filter(
        (node): node is Node =>
          Boolean(node) &&
          typeof node === "object" &&
          typeof (node as Node).id === "string" &&
          COPYABLE_NODE_TYPES.has((node as Node).type ?? ""),
      )
      .map((node) => stripEphemeralNodeState(node, false));

    return nodes.length > 0 ? nodes : null;
  } catch {
    return null;
  }
}

export function isMapifyNodeClipboard(text: string): boolean {
  return parseClipboardNodes(text) !== null;
}
