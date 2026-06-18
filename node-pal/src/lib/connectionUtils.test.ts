import { describe, expect, it } from "vitest";
import {
  fieldSourceHandle,
  fieldTargetHandle,
  normalizeConnection,
  parentSourceHandle,
  parentTargetHandle,
} from "./connectionUtils";

describe("normalizeConnection", () => {
  it("accepts field-to-field connections with field-src / field-tgt ids", () => {
    const result = normalizeConnection({
      source: "node-a",
      target: "node-b",
      sourceHandle: fieldSourceHandle("node-a", "f_1"),
      targetHandle: fieldTargetHandle("node-b", "f_2"),
    });

    expect(result).not.toBeNull();
    expect(result?.isFieldToField).toBe(true);
    expect(result?.sourceFieldId).toBe("f_1");
    expect(result?.targetFieldId).toBe("f_2");
    expect(result?.sourceHandle).toBe("field-src-node-a-f_1");
    expect(result?.targetHandle).toBe("field-tgt-node-b-f_2");
  });

  it("swaps reversed field handles in loose mode", () => {
    const result = normalizeConnection({
      source: "node-a",
      target: "node-b",
      sourceHandle: fieldTargetHandle("node-a", "f_1"),
      targetHandle: fieldSourceHandle("node-b", "f_2"),
    });

    expect(result).not.toBeNull();
    expect(result?.sourceNodeId).toBe("node-b");
    expect(result?.targetNodeId).toBe("node-a");
    expect(result?.sourceFieldId).toBe("f_2");
    expect(result?.targetFieldId).toBe("f_1");
  });

  it("accepts field-to-parent connections", () => {
    const result = normalizeConnection({
      source: "node-a",
      target: "node-b",
      sourceHandle: fieldSourceHandle("node-a", "f_1"),
      targetHandle: parentTargetHandle("node-b"),
    });

    expect(result).not.toBeNull();
    expect(result?.sourceFieldId).toBe("f_1");
    expect(result?.targetFieldId).toBeNull();
    expect(result?.targetHandle).toBe("parent-target-node-b");
  });

  it("accepts parent-to-field connections", () => {
    const result = normalizeConnection({
      source: "node-a",
      target: "node-b",
      sourceHandle: parentSourceHandle("node-a"),
      targetHandle: fieldTargetHandle("node-b", "f_3"),
    });

    expect(result).not.toBeNull();
    expect(result?.sourceFieldId).toBeNull();
    expect(result?.targetFieldId).toBe("f_3");
  });
});
