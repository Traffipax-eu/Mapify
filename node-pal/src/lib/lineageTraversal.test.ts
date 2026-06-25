import { describe, expect, it } from "vitest";
import type { Edge, Node } from "reactflow";
import {
  fieldSourceHandle,
  fieldTargetHandle,
  parentSourceHandle,
  parentTargetHandle,
} from "./connectionUtils";
import { traceDownstream, traceFullLineage, traceUpstream } from "./lineageTraversal";

function systemNode(id: string, fields: { id: string; label: string }[]): Node {
  return {
    id,
    type: "system",
    position: { x: 0, y: 0 },
    data: { label: id, fields },
  };
}

function customObjectNode(id: string): Node {
  return {
    id,
    type: "customObject",
    position: { x: 0, y: 0 },
    data: { objectId: id, label: id },
  };
}

function fieldEdge(
  id: string,
  source: string,
  sourceFieldId: string,
  target: string,
  targetFieldId: string,
): Edge {
  return {
    id,
    source,
    target,
    sourceHandle: fieldSourceHandle(source, sourceFieldId),
    targetHandle: fieldTargetHandle(target, targetFieldId),
    data: { sourceFieldId, targetFieldId },
  };
}

describe("traceUpstream", () => {
  it("highlights only fields on the upstream path, not sibling fields", () => {
    const nodes = [
      systemNode("a", [
        { id: "f_a1", label: "A1" },
        { id: "f_a2", label: "A2" },
      ]),
      systemNode("b", [
        { id: "f_b1", label: "B1" },
        { id: "f_b2", label: "B2" },
      ]),
    ];
    const edges = [
      fieldEdge("e1", "a", "f_a1", "b", "f_b1"),
      fieldEdge("e2", "a", "f_a2", "b", "f_b2"),
    ];

    const result = traceUpstream({ nodeId: "b", fieldId: "f_b1" }, nodes, edges);

    expect(result.edgeIds).toEqual(new Set(["e1"]));
    expect(result.nodeIds).toEqual(new Set(["a", "b"]));
    expect(result.fieldIdsByNode.get("a")).toEqual(new Set(["f_a1"]));
    expect(result.fieldIdsByNode.get("b")).toEqual(new Set(["f_b1"]));
    expect(result.fieldIdsByNode.get("b")?.has("f_b2")).toBe(false);
  });

  it("does not fan out to sibling fields when a middle block has multiple inputs", () => {
    const nodes = [
      systemNode("left", [{ id: "f_left", label: "asd" }]),
      systemNode("middle", [
        { id: "f_top", label: "asd" },
        { id: "f_bottom", label: "asd" },
      ]),
      customObjectNode("pbi"),
    ];
    const edges: Edge[] = [
      fieldEdge("left-top", "left", "f_left", "middle", "f_top"),
      fieldEdge("left-bottom", "left", "f_left", "middle", "f_bottom"),
      {
        id: "middle-pbi",
        source: "middle",
        target: "pbi",
        sourceHandle: parentSourceHandle("middle"),
        targetHandle: parentTargetHandle("pbi"),
      },
    ];

    const result = traceUpstream({ nodeId: "pbi", fieldId: null }, nodes, edges);

    expect(result.edgeIds).toEqual(new Set(["middle-pbi"]));
    expect(result.nodeIds).toEqual(new Set(["pbi", "middle"]));
    expect(result.fieldIdsByNode.get("middle")).toBeUndefined();
  });

  it("from system block seeds field-to-field connections on upstream trace", () => {
    const nodes = [
      systemNode("left", [{ id: "f_left", label: "Left" }]),
      systemNode("middle", [
        { id: "f_conn", label: "Connected" },
        { id: "f_orphan", label: "Orphan" },
      ]),
    ];
    const edges = [fieldEdge("in", "left", "f_left", "middle", "f_conn")];

    const result = traceUpstream({ nodeId: "middle", fieldId: null }, nodes, edges);

    expect(result.edgeIds).toEqual(new Set(["in"]));
    expect(result.fieldIdsByNode.get("middle")).toEqual(new Set(["f_conn"]));
    expect(result.fieldIdsByNode.get("middle")?.has("f_orphan")).toBe(false);
    expect(result.fieldIdsByNode.get("left")).toEqual(new Set(["f_left"]));
  });

  it("follows parent handles upstream from a custom object", () => {
    const nodes = [systemNode("src", [{ id: "f_src", label: "Src" }]), customObjectNode("obj")];
    const edges: Edge[] = [
      {
        id: "p1",
        source: "src",
        target: "obj",
        sourceHandle: parentSourceHandle("src"),
        targetHandle: parentTargetHandle("obj"),
      },
    ];

    const result = traceUpstream({ nodeId: "obj", fieldId: null }, nodes, edges);

    expect(result.edgeIds).toEqual(new Set(["p1"]));
    expect(result.nodeIds).toEqual(new Set(["obj", "src"]));
    expect(result.fieldIdsByNode.size).toBe(0);
  });
});

describe("traceDownstream", () => {
  it("highlights only fields on the downstream path", () => {
    const nodes = [
      systemNode("a", [{ id: "f_a1", label: "A1" }]),
      systemNode("b", [
        { id: "f_b1", label: "B1" },
        { id: "f_b2", label: "B2" },
      ]),
      systemNode("c", [{ id: "f_c1", label: "C1" }]),
    ];
    const edges = [
      fieldEdge("e1", "a", "f_a1", "b", "f_b1"),
      fieldEdge("e2", "b", "f_b1", "c", "f_c1"),
      fieldEdge("e3", "a", "f_a1", "b", "f_b2"),
    ];

    const result = traceDownstream({ nodeId: "a", fieldId: "f_a1" }, nodes, edges);

    expect(result.edgeIds).toEqual(new Set(["e1", "e2", "e3"]));
    expect(result.fieldIdsByNode.get("a")).toEqual(new Set(["f_a1"]));
    expect(result.fieldIdsByNode.get("b")).toEqual(new Set(["f_b1", "f_b2"]));
    expect(result.fieldIdsByNode.get("c")).toEqual(new Set(["f_c1"]));
  });

  it("does not fan out to sibling fields when a middle block has multiple outputs", () => {
    const nodes = [
      customObjectNode("pbi"),
      systemNode("middle", [
        { id: "f_top", label: "asd" },
        { id: "f_bottom", label: "asd" },
      ]),
      systemNode("right", [{ id: "f_right", label: "asd" }]),
      systemNode("bottom", [{ id: "f_bottom_dst", label: "asd" }]),
    ];
    const edges: Edge[] = [
      {
        id: "pbi-middle",
        source: "pbi",
        target: "middle",
        sourceHandle: parentSourceHandle("pbi"),
        targetHandle: fieldTargetHandle("middle", "f_top"),
        data: { targetFieldId: "f_top" },
      },
      fieldEdge("top-right", "middle", "f_top", "right", "f_right"),
      fieldEdge("bottom-out", "middle", "f_bottom", "bottom", "f_bottom_dst"),
    ];

    const result = traceDownstream({ nodeId: "pbi", fieldId: null }, nodes, edges);

    expect(result.edgeIds).toEqual(new Set(["pbi-middle", "top-right"]));
    expect(result.nodeIds).toEqual(new Set(["pbi", "middle", "right"]));
    expect(result.fieldIdsByNode.get("middle")).toEqual(new Set(["f_top"]));
    expect(result.fieldIdsByNode.get("middle")?.has("f_bottom")).toBe(false);
    expect(result.nodeIds.has("bottom")).toBe(false);
  });

  it("from system block seeds field-to-field connections on downstream trace", () => {
    const nodes = [
      systemNode("middle", [
        { id: "f_conn", label: "Connected" },
        { id: "f_orphan", label: "Orphan" },
      ]),
      systemNode("right", [{ id: "f_right", label: "Right" }]),
    ];
    const edges = [fieldEdge("out", "middle", "f_conn", "right", "f_right")];

    const result = traceDownstream({ nodeId: "middle", fieldId: null }, nodes, edges);

    expect(result.edgeIds).toEqual(new Set(["out"]));
    expect(result.fieldIdsByNode.get("middle")).toEqual(new Set(["f_conn"]));
    expect(result.fieldIdsByNode.get("middle")?.has("f_orphan")).toBe(false);
    expect(result.fieldIdsByNode.get("right")).toEqual(new Set(["f_right"]));
  });

  it("follows parent handles downstream from a custom object", () => {
    const nodes = [customObjectNode("obj"), systemNode("dst", [{ id: "f_dst", label: "Dst" }])];
    const edges: Edge[] = [
      {
        id: "p1",
        source: "obj",
        target: "dst",
        sourceHandle: parentSourceHandle("obj"),
        targetHandle: parentTargetHandle("dst"),
      },
    ];

    const result = traceDownstream({ nodeId: "obj", fieldId: null }, nodes, edges);

    expect(result.edgeIds).toEqual(new Set(["p1"]));
    expect(result.nodeIds).toEqual(new Set(["obj", "dst"]));
  });

  it("merges upstream and downstream for full lineage", () => {
    const nodes = [
      systemNode("a", [{ id: "f_a", label: "A" }]),
      systemNode("b", [{ id: "f_b", label: "B" }]),
      systemNode("c", [{ id: "f_c", label: "C" }]),
    ];
    const edges = [
      fieldEdge("ab", "a", "f_a", "b", "f_b"),
      fieldEdge("bc", "b", "f_b", "c", "f_c"),
    ];

    const result = traceFullLineage({ nodeId: "b", fieldId: "f_b" }, nodes, edges);

    expect(result.edgeIds).toEqual(new Set(["ab", "bc"]));
    expect(result.nodeIds).toEqual(new Set(["a", "b", "c"]));
    expect(result.fieldIdsByNode.get("b")).toEqual(new Set(["f_b"]));
  });
});
