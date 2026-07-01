import { describe, expect, it } from "vitest";
import {
  containerSourceHandle,
  containerTargetHandle,
  connectionFromDragDrop,
  fieldSourceHandle,
  fieldTargetHandle,
  isContainerConnectionHandle,
  normalizeConnection,
  parentSourceHandle,
  parentTargetHandle,
  upgradeConnectionWithFieldTarget,
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

  it("accepts container-to-field connections", () => {
    const result = normalizeConnection({
      source: "node-a",
      target: "node-b",
      sourceHandle: containerSourceHandle("sec_1"),
      targetHandle: fieldTargetHandle("node-b", "f_2"),
    });

    expect(result).not.toBeNull();
    expect(result?.sourceContainerId).toBe("sec_1");
    expect(result?.targetFieldId).toBe("f_2");
    expect(result?.sourceHandle).toBe("container-src-sec_1");
    expect(result?.targetHandle).toBe("field-tgt-node-b-f_2");
  });

  it("accepts field-to-container connections", () => {
    const result = normalizeConnection({
      source: "node-a",
      target: "node-b",
      sourceHandle: fieldSourceHandle("node-a", "f_1"),
      targetHandle: containerTargetHandle("grp_1"),
    });

    expect(result).not.toBeNull();
    expect(result?.sourceFieldId).toBe("f_1");
    expect(result?.targetContainerId).toBe("grp_1");
    expect(result?.targetHandle).toBe("container-tgt-grp_1");
  });

  it("rejects same-container source and target on one node", () => {
    const result = normalizeConnection({
      source: "node-a",
      target: "node-a",
      sourceHandle: containerSourceHandle("sec_1"),
      targetHandle: containerTargetHandle("sec_1"),
    });

    expect(result).toBeNull();
  });

  it("allows different containers on the same node", () => {
    const result = normalizeConnection({
      source: "node-a",
      target: "node-a",
      sourceHandle: containerSourceHandle("sec_1"),
      targetHandle: containerTargetHandle("grp_1"),
    });

    expect(result).not.toBeNull();
    expect(result?.sourceContainerId).toBe("sec_1");
    expect(result?.targetContainerId).toBe("grp_1");
  });

  it("recognizes container connection handles", () => {
    expect(isContainerConnectionHandle(containerSourceHandle("sec_1"))).toBe(true);
    expect(isContainerConnectionHandle(containerTargetHandle("grp_2"))).toBe(true);
    expect(isContainerConnectionHandle(fieldSourceHandle("n", "f"))).toBe(false);
  });

  it("builds drag-drop connections between containers and fields", () => {
    const conn = connectionFromDragDrop(
      { kind: "container-connection", sourceNodeId: "node-a", sourceContainerId: "sec_1" },
      { kind: "field", nodeId: "node-b", fieldId: "f_2" },
    );

    expect(conn).not.toBeNull();
    expect(conn?.sourceContainerId).toBe("sec_1");
    expect(conn?.targetFieldId).toBe("f_2");
  });

  it("builds drag-drop connections from fields to containers", () => {
    const conn = connectionFromDragDrop(
      { kind: "field-connection", sourceNodeId: "node-a", sourceFieldId: "f_1" },
      { kind: "container", nodeId: "node-b", containerId: "grp_1" },
    );

    expect(conn).not.toBeNull();
    expect(conn?.sourceFieldId).toBe("f_1");
    expect(conn?.targetContainerId).toBe("grp_1");
  });

  it("upgrades parent-to-parent to parent-to-field when pointer is over a field row", () => {
    const conn = normalizeConnection({
      source: "node-a",
      target: "node-b",
      sourceHandle: parentSourceHandle("node-a"),
      targetHandle: parentTargetHandle("node-b"),
    });

    expect(conn).not.toBeNull();

    const upgraded = upgradeConnectionWithFieldTarget(conn!, 0, 0, () => ({
      nodeId: "node-b",
      fieldId: "f_email",
    }));

    expect(upgraded.targetFieldId).toBe("f_email");
    expect(upgraded.targetHandle).toBe(fieldTargetHandle("node-b", "f_email"));
    expect(upgraded.isParentToParent).toBe(false);
  });
});
