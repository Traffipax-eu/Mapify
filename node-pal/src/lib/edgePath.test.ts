import { describe, expect, it } from "vitest";
import { Position } from "reactflow";
import {
  buildAutoStepPath,
  buildWaypointPath,
  computeRouteOffset,
  inferPortPosition,
} from "./edgePath";

describe("edgePath auto routing", () => {
  it("uses a larger gutter for same-side ports", () => {
    const from = { x: 100, y: 100 };
    const to = { x: 120, y: 260 };
    const defaultOffset = computeRouteOffset(from, to);
    const sameSideOffset = computeRouteOffset(from, to, Position.Right, Position.Right);
    expect(sameSideOffset).toBeGreaterThanOrEqual(defaultOffset);
    expect(sameSideOffset).toBeGreaterThanOrEqual(44);
  });

  it("builds a non-empty orthogonal path for opposing handles", () => {
    const [path, labelX, labelY] = buildAutoStepPath(
      { x: 50, y: 80 },
      { x: 320, y: 180 },
      Position.Right,
      Position.Left,
    );
    expect(path.length).toBeGreaterThan(0);
    expect(path.startsWith("M")).toBe(true);
    expect(Number.isFinite(labelX)).toBe(true);
    expect(Number.isFinite(labelY)).toBe(true);
  });

  it("routes backward horizontal connections with a loop", () => {
    const [path] = buildAutoStepPath(
      { x: 400, y: 120 },
      { x: 120, y: 220 },
      Position.Right,
      Position.Left,
    );
    expect(path).toMatch(/[QL]/);
  });

  it("infers port sides toward the next point", () => {
    expect(inferPortPosition({ x: 0, y: 0 }, { x: 100, y: 5 }, "exit")).toBe(Position.Right);
    expect(inferPortPosition({ x: 100, y: 5 }, { x: 0, y: 0 }, "entry")).toBe(Position.Left);
  });

  it("chains waypoint legs with terminal handle positions", () => {
    const path = buildWaypointPath(
      { x: 0, y: 0 },
      { x: 300, y: 200 },
      [{ x: 150, y: 40 }],
      Position.Right,
      Position.Left,
    );
    expect(path.length).toBeGreaterThan(0);
    expect(path.startsWith("M")).toBe(true);
  });
});
