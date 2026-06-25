import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import type { Node } from "reactflow";
import {
  applyNodeChangesToYMap,
  readNodesFromYMap,
  serializeNode,
  YJS_NODES_KEY,
} from "./yjsBindings";

describe("yjsBindings", () => {
  it("serializes nodes without selection or display-only lineage flags", () => {
    const node: Node = {
      id: "n1",
      type: "system",
      position: { x: 10, y: 20 },
      data: { label: "CRM", inLineage: true, faded: true },
      selected: true,
      dragging: true,
    };

    const serialized = serializeNode(node);
    expect(serialized.selected).toBe(false);
    expect(serialized.dragging).toBe(false);
    expect(serialized.data).toEqual({ label: "CRM" });
  });

  it("applies position changes to the shared Y.Map", () => {
    const doc = new Y.Doc();
    const nodesMap = doc.getMap(YJS_NODES_KEY);
    nodesMap.set("n1", serializeNode({
      id: "n1",
      type: "system",
      position: { x: 0, y: 0 },
      data: { label: "A" },
    }));

    doc.transact(() => {
      applyNodeChangesToYMap(nodesMap, [
        { id: "n1", type: "position", position: { x: 120, y: 48 }, dragging: false },
      ]);
    });

    const nodes = readNodesFromYMap(nodesMap);
    expect(nodes[0]?.position).toEqual({ x: 120, y: 48 });
  });
});
