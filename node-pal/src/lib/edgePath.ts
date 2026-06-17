export type FlowPoint = { x: number; y: number };

export function defaultBezierControlPoints(
  source: FlowPoint,
  target: FlowPoint,
): [FlowPoint, FlowPoint] {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const offset = Math.max(Math.abs(dx), Math.abs(dy), 80) * 0.45;

  return [
    { x: source.x + offset, y: source.y + dy * 0.15 },
    { x: target.x - offset, y: target.y - dy * 0.15 },
  ];
}

export function resolveControlPoints(
  source: FlowPoint,
  target: FlowPoint,
  stored?: FlowPoint[] | null,
): FlowPoint[] {
  if (stored && stored.length >= 2) {
    return stored;
  }
  return defaultBezierControlPoints(source, target);
}

export function buildFlexiblePath(
  source: FlowPoint,
  controlPoints: FlowPoint[],
  target: FlowPoint,
): string {
  const knots = [source, ...controlPoints, target];

  if (knots.length === 2) {
    return `M ${knots[0].x} ${knots[0].y} L ${knots[1].x} ${knots[1].y}`;
  }

  if (knots.length === 3) {
    return `M ${knots[0].x} ${knots[0].y} Q ${knots[1].x} ${knots[1].y} ${knots[2].x} ${knots[2].y}`;
  }

  if (knots.length === 4) {
    const [, cp1, cp2, end] = knots;
    return `M ${source.x} ${source.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
  }

  let path = `M ${knots[0].x} ${knots[0].y}`;
  for (let index = 1; index < knots.length - 1; index += 1) {
    const current = knots[index];
    const next = knots[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }

  const last = knots[knots.length - 1];
  path += ` T ${last.x} ${last.y}`;
  return path;
}

/** @deprecated use buildFlexiblePath */
export function buildCubicBezierPath(
  source: FlowPoint,
  controlPoints: FlowPoint[],
  target: FlowPoint,
): string {
  return buildFlexiblePath(source, controlPoints, target);
}

export function getPathMidpoint(
  source: FlowPoint,
  target: FlowPoint,
  controlPoints: FlowPoint[],
): FlowPoint {
  if (controlPoints.length > 0) {
    const all = [source, ...controlPoints, target];
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
