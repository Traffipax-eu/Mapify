import type { Node } from "reactflow";

export type ContainerNodeData = {
  label: string;
};

export function isContainerNode(node: Node): boolean {
  return node.type === "container";
}

export function getNodeDimensions(node: Node): { width: number; height: number } {
  const style = node.style as { width?: number; height?: number } | undefined;
  return {
    width: Number(style?.width ?? node.width ?? 400),
    height: Number(style?.height ?? node.height ?? 300),
  };
}

export function buildNodeLookup(nodes: Node[]): Map<string, Node> {
  return new Map(nodes.map((node) => [node.id, node]));
}

export function getAbsolutePosition(node: Node, lookup: Map<string, Node>): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentNode;

  while (parentId) {
    const parent = lookup.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentNode;
  }

  return { x, y };
}

export function sortNodesParentFirst(nodes: Node[]): Node[] {
  const containers = nodes.filter((node) => isContainerNode(node) && !node.parentNode);
  const roots = nodes.filter((node) => !node.parentNode && !isContainerNode(node));
  const children = nodes.filter((node) => Boolean(node.parentNode));
  return [...containers, ...roots, ...children];
}

export function assignNodeParent(
  node: Node,
  container: Node | null,
  nodes: Node[],
): Node {
  const lookup = buildNodeLookup(nodes);
  const absolute = getAbsolutePosition(node, lookup);

  if (!container) {
    if (!node.parentNode) return node;
    return {
      ...node,
      parentNode: undefined,
      extent: undefined,
      position: absolute,
      zIndex: undefined,
    };
  }

  const containerAbsolute = getAbsolutePosition(container, lookup);
  return {
    ...node,
    parentNode: container.id,
    extent: "parent",
    position: {
      x: absolute.x - containerAbsolute.x,
      y: absolute.y - containerAbsolute.y,
    },
    zIndex: 2,
  };
}

export function pickInnermostContainer(containers: Node[]): Node | null {
  if (containers.length === 0) return null;

  return [...containers].sort((a, b) => {
    const areaA = getNodeDimensions(a).width * getNodeDimensions(a).height;
    const areaB = getNodeDimensions(b).width * getNodeDimensions(b).height;
    return areaA - areaB;
  })[0];
}

export function detachChildrenBeforeContainerDelete(nodes: Node[], deletedIds: Set<string>): Node[] {
  const lookup = buildNodeLookup(nodes);

  return nodes
    .filter((node) => !deletedIds.has(node.id))
    .map((node) => {
      if (!node.parentNode || !deletedIds.has(node.parentNode)) {
        return node;
      }

      const absolute = getAbsolutePosition(node, lookup);
      return {
        ...node,
        parentNode: undefined,
        extent: undefined,
        position: absolute,
        zIndex: undefined,
      };
    });
}
