import type { Node } from "reactflow";

const DEFAULT_SIZE = { width: 520, height: 360 };

export function createContainerNode(
  position: { x: number; y: number },
  nextId: () => string,
): Node {
  return {
    id: nextId(),
    type: "container",
    position,
    className: "node-container",
    style: { width: DEFAULT_SIZE.width, height: DEFAULT_SIZE.height },
    zIndex: 0,
    data: { label: "CORE DATA HUB" },
    draggable: true,
    selectable: true,
    connectable: false,
  };
}
