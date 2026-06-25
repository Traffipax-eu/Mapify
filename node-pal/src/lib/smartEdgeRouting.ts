import type { Node } from "reactflow";
import { Position } from "reactflow";
import { buildNodeLookup, getAbsolutePosition, getNodeDimensions } from "./containerUtils";
import { inferPortPosition, type FlowPoint } from "./edgePath";

export type NodeBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

const BORDER_INSET = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getNodeBounds(node: Node, nodes?: Node[]): NodeBounds {
  const lookup = buildNodeLookup(nodes ?? [node]);
  const position = getAbsolutePosition(node, lookup);
  const fallback = getNodeDimensions(node);
  const width = Number(node.measured?.width ?? node.width ?? fallback.width);
  const height = Number(node.measured?.height ?? node.height ?? fallback.height);

  return {
    left: position.x,
    right: position.x + width,
    top: position.y,
    bottom: position.y + height,
    centerX: position.x + width / 2,
    centerY: position.y + height / 2,
    width,
    height,
  };
}

/** Snap a preferred point onto a node border for the chosen port side. */
export function borderPoint(bounds: NodeBounds, position: Position, preferred: FlowPoint): FlowPoint {
  const y = clamp(preferred.y, bounds.top + BORDER_INSET, bounds.bottom - BORDER_INSET);
  const x = clamp(preferred.x, bounds.left + BORDER_INSET, bounds.right - BORDER_INSET);

  switch (position) {
    case Position.Left:
      return { x: bounds.left, y };
    case Position.Right:
      return { x: bounds.right, y };
    case Position.Top:
      return { x, y: bounds.top };
    case Position.Bottom:
      return { x, y: bounds.bottom };
    default:
      return preferred;
  }
}

export type SmartEdgeTerminals = {
  source: FlowPoint;
  target: FlowPoint;
  sourcePosition: Position;
  targetPosition: Position;
};

/**
 * Draw.io-style closest-side routing: pick exit/entry ports from node centers,
 * then snap to the node border while preserving field-row Y from handle positions.
 */
export function resolveSmartEdgeTerminals(
  sourceNode: Node | null | undefined,
  targetNode: Node | null | undefined,
  handleSource: FlowPoint,
  handleTarget: FlowPoint,
  nodes?: Node[],
): SmartEdgeTerminals {
  if (!sourceNode || !targetNode) {
    return {
      source: handleSource,
      target: handleTarget,
      sourcePosition: inferPortPosition(handleSource, handleTarget, "exit"),
      targetPosition: inferPortPosition(handleTarget, handleSource, "entry"),
    };
  }

  const sourceBounds = getNodeBounds(sourceNode, nodes);
  const targetBounds = getNodeBounds(targetNode, nodes);
  const sourceCenter = { x: sourceBounds.centerX, y: sourceBounds.centerY };
  const targetCenter = { x: targetBounds.centerX, y: targetBounds.centerY };

  const sourcePosition = inferPortPosition(sourceCenter, targetCenter, "exit");
  const targetPosition = inferPortPosition(targetCenter, sourceCenter, "entry");

  return {
    source: borderPoint(sourceBounds, sourcePosition, handleSource),
    target: borderPoint(targetBounds, targetPosition, handleTarget),
    sourcePosition,
    targetPosition,
  };
}
