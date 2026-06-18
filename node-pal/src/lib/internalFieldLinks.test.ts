import { describe, expect, it } from "vitest";
import type { Edge } from "reactflow";
import {
  buildInternalFieldLinkPath,
  getInternalFieldEdgesForNode,
  isInternalBlockFieldEdge,
  screenOffsetToLayout,
} from "@/lib/internalFieldLinks";

function makeEdge(overrides: Partial<Edge> & Pick<Edge, "id" | "source" | "target">): Edge {
  return {
    type: "custom",
    ...overrides,
  } as Edge;
}

describe("isInternalBlockFieldEdge", () => {
  it("returns true for same-node field-to-field edges", () => {
    const edge = makeEdge({
      id: "e1",
      source: "n1",
      target: "n1",
      data: { sourceFieldId: "f1", targetFieldId: "f2" },
    });
    expect(isInternalBlockFieldEdge(edge)).toBe(true);
  });

  it("returns false for cross-node field edges", () => {
    const edge = makeEdge({
      id: "e1",
      source: "n1",
      target: "n2",
      data: { sourceFieldId: "f1", targetFieldId: "f2" },
    });
    expect(isInternalBlockFieldEdge(edge)).toBe(false);
  });

  it("returns false when field ids are missing or identical", () => {
    expect(
      isInternalBlockFieldEdge(
        makeEdge({ id: "e1", source: "n1", target: "n1", data: {} }),
      ),
    ).toBe(false);
    expect(
      isInternalBlockFieldEdge(
        makeEdge({
          id: "e1",
          source: "n1",
          target: "n1",
          data: { sourceFieldId: "f1", targetFieldId: "f1" },
        }),
      ),
    ).toBe(false);
  });
});

describe("getInternalFieldEdgesForNode", () => {
  it("collects internal field edges for a node", () => {
    const edges = [
      makeEdge({
        id: "internal",
        source: "n1",
        target: "n1",
        data: { sourceFieldId: "a", targetFieldId: "b", label: "maps" },
      }),
      makeEdge({
        id: "external",
        source: "n1",
        target: "n2",
        data: { sourceFieldId: "a", targetFieldId: "c" },
      }),
      makeEdge({
        id: "other-internal",
        source: "n2",
        target: "n2",
        data: { sourceFieldId: "x", targetFieldId: "y" },
      }),
    ];

    expect(getInternalFieldEdgesForNode("n1", edges)).toEqual([
      {
        edgeId: "internal",
        sourceFieldId: "a",
        targetFieldId: "b",
        lineStyle: undefined,
        label: "maps",
      },
    ]);
  });
});

describe("buildInternalFieldLinkPath", () => {
  it("curves outside the block to the right between two field rows", () => {
    const path = buildInternalFieldLinkPath(20, 60, 190, 0);
    expect(path).toBe("M 190 20 C 222 20, 222 60, 190 60");
  });
});

describe("screenOffsetToLayout", () => {
  it("converts screen coordinates back to layout px at 50% zoom", () => {
    expect(screenOffsetToLayout(130, 100, 0.5)).toBe(60);
  });

  it("converts screen coordinates back to layout px at 200% zoom", () => {
    expect(screenOffsetToLayout(220, 100, 2)).toBe(60);
  });
});
