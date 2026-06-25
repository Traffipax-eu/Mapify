import { describe, expect, it } from "vitest";
import type { Node } from "reactflow";
import {
  isMapifyNodeClipboard,
  parseClipboardNodes,
  serializeNodesToClipboard,
} from "@/lib/clipboardNodes";

const sampleNode: Node = {
  id: "n1",
  type: "system",
  position: { x: 0, y: 0 },
  data: { label: "Block A", fields: [] },
};

describe("clipboardNodes OS clipboard format", () => {
  it("serializes and parses Mapify node clipboard payloads", () => {
    const serialized = serializeNodesToClipboard([sampleNode]);
    expect(isMapifyNodeClipboard(serialized)).toBe(true);
    expect(parseClipboardNodes(serialized)).toEqual([
      expect.objectContaining({ id: "n1", type: "system" }),
    ]);
  });

  it("does not treat plain text or Excel TSV as node clipboard data", () => {
    expect(parseClipboardNodes("Name\tValue\nA\t1")).toBeNull();
    expect(isMapifyNodeClipboard('{"foo":"bar"}')).toBe(false);
  });

  it("strips dragging state from parsed clipboard nodes", () => {
    const serialized = JSON.stringify({
      mapify: "mapify.clipboard.v1",
      nodes: [
        {
          ...sampleNode,
          dragging: true,
          positionAbsolute: { x: 10, y: 20 },
        },
      ],
    });

    const parsed = parseClipboardNodes(serialized);
    expect(parsed?.[0]?.dragging).toBeUndefined();
    expect(parsed?.[0]?.positionAbsolute).toBeUndefined();
  });
});
