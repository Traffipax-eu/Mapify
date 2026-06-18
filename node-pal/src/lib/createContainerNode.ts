import type { Node } from "reactflow";
import type { ContainerNodeData } from "@/lib/containerUtils";

const DEFAULT_SIZE = { width: 520, height: 360 };

export function getNextContainerLabel(existingNodes: Node[] = []): string {
  let max = 0;
  for (const node of existingNodes) {
    if (node.type !== "container") continue;
    const label = ((node.data ?? {}) as ContainerNodeData).label?.trim() ?? "";
    const match = /^Container\s+(\d+)$/i.exec(label);
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }
  return `Container ${max + 1}`;
}

export function createContainerNode(
  position: { x: number; y: number },
  nextId: () => string,
  existingNodes: Node[] = [],
): Node {
  return {
    id: nextId(),
    type: "container",
    position,
    className: "node-container",
    style: { width: DEFAULT_SIZE.width, height: DEFAULT_SIZE.height },
    zIndex: 0,
    data: { label: getNextContainerLabel(existingNodes) },
    draggable: true,
    selectable: true,
    connectable: false,
  };
}
