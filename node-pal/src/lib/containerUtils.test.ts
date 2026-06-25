import { describe, expect, it } from "vitest";
import type { Node } from "reactflow";
import { applySafeNodeRemovals } from "@/lib/containerUtils";

describe("applySafeNodeRemovals", () => {
  it("unparents children when a container is deleted", () => {
    const nodes: Node[] = [
      {
        id: "container-1",
        type: "container",
        position: { x: 0, y: 0 },
        data: { label: "Group" },
      },
      {
        id: "child-1",
        type: "system",
        parentNode: "container-1",
        extent: "parent",
        position: { x: 20, y: 40 },
        data: { label: "Child", fields: [] },
      },
    ];

    const next = applySafeNodeRemovals(nodes, ["container-1"]);
    expect(next.some((node) => node.id === "container-1")).toBe(false);
    const child = next.find((node) => node.id === "child-1");
    expect(child?.parentNode).toBeUndefined();
    expect(child?.position).toEqual({ x: 20, y: 40 });
  });
});
