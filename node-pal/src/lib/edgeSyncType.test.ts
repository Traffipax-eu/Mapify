import { describe, expect, it } from "vitest";
import {
  getSyncVisuals,
  isSemanticSyncType,
  resolveEdgeSyncType,
} from "./edgeSyncType";

describe("edgeSyncType", () => {
  it("defaults unknown sync types to push", () => {
    expect(resolveEdgeSyncType({})).toBe("push");
    expect(resolveEdgeSyncType({ syncType: "invalid" as "push" })).toBe("push");
  });

  it("preserves the none sync type", () => {
    expect(resolveEdgeSyncType({ syncType: "none" })).toBe("none");
  });

  it("maps pull to dashed line", () => {
    const visuals = getSyncVisuals("pull");
    expect(visuals.lineStyle).toBe("dashed");
    expect(visuals.markerEnd).toBe("arrowclosed");
    expect(visuals.animated).toBe(false);
  });

  it("maps stream to animated purple stroke", () => {
    const visuals = getSyncVisuals("stream");
    expect(visuals.animated).toBe(true);
    expect(visuals.strokeColor).toBe("#7c3aed");
  });

  it("maps api to bidirectional arrows", () => {
    const visuals = getSyncVisuals("api");
    expect(visuals.markerStart).toBe("arrowclosed");
    expect(visuals.markerEnd).toBe("arrowclosed");
  });

  it("classifies semantic vs custom sync types", () => {
    expect(isSemanticSyncType("push")).toBe(true);
    expect(isSemanticSyncType("pull")).toBe(true);
    expect(isSemanticSyncType("stream")).toBe(true);
    expect(isSemanticSyncType("api")).toBe(true);
    expect(isSemanticSyncType("none")).toBe(false);
  });

  it("honors manual line style only for the none sync type", () => {
    expect(getSyncVisuals("none", { manualLineStyle: "dashed" }).lineStyle).toBe("dashed");
    expect(getSyncVisuals("none", { manualLineStyle: "solid" }).lineStyle).toBe("solid");
    expect(getSyncVisuals("none").lineStyle).toBe("solid");
    // Semantic types ignore the manual override.
    expect(getSyncVisuals("push", { manualLineStyle: "dashed" }).lineStyle).toBe("solid");
    expect(getSyncVisuals("pull", { manualLineStyle: "solid" }).lineStyle).toBe("dashed");
  });
});
