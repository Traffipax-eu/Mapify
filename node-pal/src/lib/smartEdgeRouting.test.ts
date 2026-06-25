import { describe, expect, it } from "vitest";
import { Position, type Node } from "reactflow";
import { getNodeBounds, resolveSmartEdgeTerminals } from "./smartEdgeRouting";

function makeNode(id: string, x: number, y: number, width = 320, height = 200): Node {
  return {
    id,
    type: "system",
    position: { x, y },
    data: { label: id },
    width,
    height,
  };
}

describe("smartEdgeRouting", () => {
  it("routes from source-right to target-left when target is to the right", () => {
    const source = makeNode("a", 0, 0);
    const target = makeNode("b", 500, 40);
    const nodes = [source, target];

    const terminals = resolveSmartEdgeTerminals(
      source,
      target,
      { x: 320, y: 80 },
      { x: 500, y: 100 },
      nodes,
    );

    expect(terminals.sourcePosition).toBe(Position.Right);
    expect(terminals.targetPosition).toBe(Position.Left);
    expect(terminals.source.x).toBe(getNodeBounds(source, nodes).right);
    expect(terminals.target.x).toBe(getNodeBounds(target, nodes).left);
  });

  it("routes from source-left to target-right when target is to the left", () => {
    const source = makeNode("a", 500, 0);
    const target = makeNode("b", 0, 40);
    const nodes = [source, target];

    const terminals = resolveSmartEdgeTerminals(
      source,
      target,
      { x: 820, y: 80 },
      { x: 0, y: 100 },
      nodes,
    );

    expect(terminals.sourcePosition).toBe(Position.Left);
    expect(terminals.targetPosition).toBe(Position.Right);
    expect(terminals.source.x).toBe(getNodeBounds(source, nodes).left);
    expect(terminals.target.x).toBe(getNodeBounds(target, nodes).right);
  });

  it("pins field target entry to the field row instead of the block top edge", () => {
    const source = makeNode("a", 200, 0, 120, 80);
    const target = makeNode("b", 180, 200, 320, 200);
    const fieldY = 280;

    const terminals = resolveSmartEdgeTerminals(
      source,
      target,
      { x: 260, y: 80 },
      { x: 180, y: fieldY },
      [source, target],
      { targetFieldId: "f_1" },
    );

    expect(terminals.targetPosition).toBe(Position.Left);
    expect(terminals.target.x).toBe(getNodeBounds(target, [source, target]).left);
    expect(terminals.target.y).toBe(fieldY);
  });
});
