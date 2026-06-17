import { getSmoothStepPath, Position } from "reactflow";

export type FlowPoint = { x: number; y: number };

const SMOOTH_STEP_RADIUS = 16;

function segmentPositions(from: FlowPoint, to: FlowPoint): {
  sourcePosition: Position;
  targetPosition: Position;
} {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      sourcePosition: dx >= 0 ? Position.Right : Position.Left,
      targetPosition: dx >= 0 ? Position.Left : Position.Right,
    };
  }

  return {
    sourcePosition: dy >= 0 ? Position.Bottom : Position.Top,
    targetPosition: dy >= 0 ? Position.Top : Position.Bottom,
  };
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

/** Chain smooth-step segments through optional waypoints for stable bendable edges. */
export function buildWaypointPath(
  source: FlowPoint,
  target: FlowPoint,
  waypoints: FlowPoint[],
  borderRadius = SMOOTH_STEP_RADIUS,
): string {
  const points = [source, ...waypoints, target];
  if (points.length < 2) return "";

  let combined = "";

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const { sourcePosition, targetPosition } = segmentPositions(from, to);
    const [segment] = getSmoothStepPath({
      sourceX: from.x,
      sourceY: from.y,
      sourcePosition,
      targetX: to.x,
      targetY: to.y,
      targetPosition,
      borderRadius,
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
): FlowPoint {
  if (waypoints.length > 0) {
    const all = [source, ...waypoints, target];
    const sum = all.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 },
    );
    return { x: sum.x / all.length, y: sum.y / all.length };
  }

  return {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  };
}
