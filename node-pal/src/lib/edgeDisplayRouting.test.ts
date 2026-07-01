import { describe, expect, it } from "vitest";
import type { Edge, Node } from "reactflow";
import {
  fieldSourceHandle,
  fieldTargetHandle,
  parentSourceHandle,
  parentTargetHandle,
  containerSourceHandle,
  containerTargetHandle,
} from "./connectionUtils";
import { rerouteEdgesForCollapsedNodes } from "./edgeDisplayRouting";
import type { EdgeData } from "./storage";
import type { SystemNodeData } from "@/components/nodes/SystemNode";

function systemNode(id: string, data: Partial<SystemNodeData>): Node<SystemNodeData> {
  return {
    id,
    type: "system",
    position: { x: 0, y: 0 },
    data: {
      label: "Block",
      fields: [],
      sections: [],
      groups: [],
      ...data,
    },
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  data: EdgeData,
  handles?: { sourceHandle?: string; targetHandle?: string },
): Edge<EdgeData> {
  return {
    id,
    source,
    target,
    sourceHandle: handles?.sourceHandle ?? parentSourceHandle(source),
    targetHandle: handles?.targetHandle ?? parentTargetHandle(target),
    data,
  };
}

describe("rerouteEdgesForCollapsedNodes", () => {
  it("reroutes field edges to parent handles when the block is collapsed", () => {
    const nodeA = systemNode("node-a", {
      collapsed: true,
      fields: [{ id: "f_1", label: "Email" }],
    });
    const nodeB = systemNode("node-b", { fields: [{ id: "f_2", label: "Name" }] });

    const original = edge(
      "e1",
      "node-a",
      "node-b",
      {
        sourceFieldId: "f_1",
        targetFieldId: "f_2",
        sourceNodeId: "node-a",
        targetNodeId: "node-b",
      },
      {
        sourceHandle: fieldSourceHandle("node-a", "f_1"),
        targetHandle: fieldTargetHandle("node-b", "f_2"),
      },
    );

    const [rerouted] = rerouteEdgesForCollapsedNodes([original], [nodeA, nodeB]);

    expect(rerouted.sourceHandle).toBe(parentSourceHandle("node-a"));
    expect(rerouted.targetHandle).toBe(fieldTargetHandle("node-b", "f_2"));
    expect(rerouted.data?.rerouted).toBe(true);
  });

  it("reroutes field edges to container handles when a section is collapsed", () => {
    const nodeA = systemNode("node-a", {
      sections: [{ id: "sec_1", name: "PII", collapsed: true }],
      fields: [{ id: "f_1", label: "Email", sectionId: "sec_1" }],
    });
    const nodeB = systemNode("node-b", {
      fields: [{ id: "f_2", label: "Name" }],
    });

    const original = edge(
      "e1",
      "node-a",
      "node-b",
      {
        sourceFieldId: "f_1",
        targetFieldId: "f_2",
        sourceNodeId: "node-a",
        targetNodeId: "node-b",
      },
      {
        sourceHandle: fieldSourceHandle("node-a", "f_1"),
        targetHandle: fieldTargetHandle("node-b", "f_2"),
      },
    );

    const [rerouted] = rerouteEdgesForCollapsedNodes([original], [nodeA, nodeB]);

    expect(rerouted.sourceHandle).toBe(containerSourceHandle("sec_1"));
    expect(rerouted.data?.rerouted).toBe(true);
  });

  it("reroutes field edges to group handles when a group is collapsed", () => {
    const nodeA = systemNode("node-a", {
      sections: [{ id: "sec_1", name: "General" }],
      groups: [{ id: "grp_1", name: "IDs", sectionId: "sec_1", collapsed: true }],
      fields: [{ id: "f_1", label: "User ID", sectionId: "sec_1", groupId: "grp_1" }],
    });
    const nodeB = systemNode("node-b", {
      fields: [{ id: "f_2", label: "Name" }],
    });

    const original = edge(
      "e1",
      "node-a",
      "node-b",
      {
        sourceFieldId: "f_1",
        targetFieldId: "f_2",
        sourceNodeId: "node-a",
        targetNodeId: "node-b",
      },
      {
        sourceHandle: fieldSourceHandle("node-a", "f_1"),
        targetHandle: fieldTargetHandle("node-b", "f_2"),
      },
    );

    const [rerouted] = rerouteEdgesForCollapsedNodes([original], [nodeA, nodeB]);

    expect(rerouted.sourceHandle).toBe(containerSourceHandle("grp_1"));
    expect(rerouted.data?.rerouted).toBe(true);
  });

  it("leaves expanded field edges unchanged", () => {
    const nodeA = systemNode("node-a", {
      fields: [{ id: "f_1", label: "Email" }],
    });
    const nodeB = systemNode("node-b", {
      fields: [{ id: "f_2", label: "Name" }],
    });

    const original = edge(
      "e1",
      "node-a",
      "node-b",
      {
        sourceFieldId: "f_1",
        targetFieldId: "f_2",
        sourceNodeId: "node-a",
        targetNodeId: "node-b",
      },
      {
        sourceHandle: fieldSourceHandle("node-a", "f_1"),
        targetHandle: fieldTargetHandle("node-b", "f_2"),
      },
    );

    const [rerouted] = rerouteEdgesForCollapsedNodes([original], [nodeA, nodeB]);

    expect(rerouted.sourceHandle).toBe(fieldSourceHandle("node-a", "f_1"));
    expect(rerouted.targetHandle).toBe(fieldTargetHandle("node-b", "f_2"));
    expect(rerouted.data?.rerouted).toBeUndefined();
  });
});
