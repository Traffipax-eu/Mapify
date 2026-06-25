import { getSmoothStepPath, Position } from "reactflow";

export type FlowPoint = { x: number; y: number };

/** Rounded corners on auto-routed elbows (draw.io uses 0; we keep a subtle radius). */
export const ROUTE_BORDER_RADIUS = 8;

const MIN_ROUTE_OFFSET = 32;
const MAX_ROUTE_OFFSET = 72;

/** Pick the port side that faces another point (draw.io-style orthogonal hints). */
export function inferPortPosition(
  point: FlowPoint,
  toward: FlowPoint,
  role: "exit" | "entry",
): Position {
  const dx = toward.x - point.x;
  const dy = toward.y - point.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (role === "exit") return dx >= 0 ? Position.Right : Position.Left;
    return dx >= 0 ? Position.Right : Position.Left;
  }

  if (role === "exit") return dy >= 0 ? Position.Bottom : Position.Top;
  return dy >= 0 ? Position.Bottom : Position.Top;
}

/**
 * Gutter distance before the first bend — similar to draw.io jetty size.
 * Larger for long spans and when both ports share the same side (loop routing).
 */
export function computeRouteOffset(
  from: FlowPoint,
  to: FlowPoint,
  sourcePosition?: Position,
  targetPosition?: Position,
): number {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const span = Math.max(dx, dy);
  let offset = Math.max(MIN_ROUTE_OFFSET, Math.min(MAX_ROUTE_OFFSET, span * 0.14 + 28));

  if (!sourcePosition || !targetPosition) return offset;

  const sameSide =
    sourcePosition === targetPosition &&
    (sourcePosition === Position.Left ||
      sourcePosition === Position.Right ||
      sourcePosition === Position.Top ||
      sourcePosition === Position.Bottom);

  if (sameSide) {
    offset = Math.max(offset, 44);
  }

  const reversedHorizontal =
    (sourcePosition === Position.Right &&
      targetPosition === Position.Left &&
      from.x > to.x + 4) ||
    (sourcePosition === Position.Left &&
      targetPosition === Position.Right &&
      from.x < to.x - 4);

  const reversedVertical =
    (sourcePosition === Position.Bottom &&
      targetPosition === Position.Top &&
      from.y > to.y + 4) ||
    (sourcePosition === Position.Top &&
      targetPosition === Position.Bottom &&
      from.y < to.y - 4);

  if (reversedHorizontal || reversedVertical) {
    offset = Math.max(offset, 52);
  }

  return offset;
}

/** Automatic orthogonal step path (draw.io-style) using handle positions from React Flow. */
export function buildAutoStepPath(
  source: FlowPoint,
  target: FlowPoint,
  sourcePosition: Position,
  targetPosition: Position,
): [string, number, number] {
  const offset = computeRouteOffset(source, target, sourcePosition, targetPosition);

  return getSmoothStepPath({
    sourceX: source.x,
    sourceY: source.y,
    sourcePosition,
    targetX: target.x,
    targetY: target.y,
    targetPosition,
    borderRadius: ROUTE_BORDER_RADIUS,
    offset,
  });
}

/** User-placed bend points between source and target (flow coordinates). */
export function resolveWaypoints(stored?: FlowPoint[] | null): FlowPoint[] {
  if (!stored?.length) return [];
  return stored.map((point) => ({ x: point.x, y: point.y }));
}

/** @deprecated Use resolveWaypoints — kept for imports that expect the old name. */
export function resolveControlPoints(
  _source: FlowPoint,
  _target: FlowPoint,
  stored?: FlowPoint[] | null,
): FlowPoint[] {
  return resolveWaypoints(stored);
}

/** Chain orthogonal segments through optional waypoints, respecting terminal handle sides. */
export function buildWaypointPath(
  source: FlowPoint,
  target: FlowPoint,
  waypoints: FlowPoint[],
  sourcePosition?: Position,
  targetPosition?: Position,
  borderRadius = ROUTE_BORDER_RADIUS,
): string {
  const points = [source, ...waypoints, target];
  if (points.length < 2) return "";

  let combined = "";

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const isFirst = index === 0;
    const isLast = index === points.length - 2;

    const legSourcePosition = isFirst
      ? sourcePosition ?? inferPortPosition(from, to, "exit")
      : inferPortPosition(from, to, "exit");

    const legTargetPosition = isLast
      ? targetPosition ?? inferPortPosition(to, from, "entry")
      : inferPortPosition(to, from, "entry");

    const offset = computeRouteOffset(from, to, legSourcePosition, legTargetPosition);

    const [segment] = getSmoothStepPath({
      sourceX: from.x,
      sourceY: from.y,
      sourcePosition: legSourcePosition,
      targetX: to.x,
      targetY: to.y,
      targetPosition: legTargetPosition,
      borderRadius,
      offset,
    });

    if (index === 0) {
      combined = segment;
      continue;
    }

    combined += segment.replace(/^M\s*[-\d.,]+\s+[-\d.,]+\s*/, "");
  }

  return combined;
}

/** @deprecated use buildWaypointPath */
export function buildFlexiblePath(
  source: FlowPoint,
  controlPoints: FlowPoint[],
  target: FlowPoint,
): string {
  return buildWaypointPath(source, target, controlPoints);
}

/** @deprecated use buildWaypointPath */
export function buildCubicBezierPath(
  source: FlowPoint,
  controlPoints: FlowPoint[],
  target: FlowPoint,
): string {
  return buildWaypointPath(source, target, controlPoints);
}

export function getPathMidpoint(
  source: FlowPoint,
  target: FlowPoint,
  waypoints: FlowPoint[],
  sourcePosition?: Position,
  targetPosition?: Position,
): FlowPoint {
  if (waypoints.length > 0) {
    const all = [source, ...waypoints, target];
    const sum = all.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 },
    );
    return { x: sum.x / all.length, y: sum.y / all.length };
  }

  if (sourcePosition && targetPosition) {
    const [, labelX, labelY] = buildAutoStepPath(source, target, sourcePosition, targetPosition);
    return { x: labelX, y: labelY };
  }

  return {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  };
}
