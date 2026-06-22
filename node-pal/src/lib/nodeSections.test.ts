import { describe, expect, it } from "vitest";
import {
  DEFAULT_SECTION_ID,
  createGroup,
  createSection,
  deleteGroupFromNode,
  deleteSectionFromNode,
  ensureExplicitSections,
  getFieldsForGroup,
  getGroupsForSection,
  getRenderableSections,
  moveFieldToGroup,
  moveFieldToSection,
  moveFieldToTarget,
  reorderFieldsInList,
  resolveDeleteSectionTarget,
  toggleGroupCollapsed,
  toggleSectionCollapsed,
} from "./nodeSections";
import type { SystemNodeData } from "@/components/nodes/SystemNode";

const baseData: SystemNodeData = {
  label: "Test",
  nodeGroupId: "g1",
  fields: [
    { id: "f1", label: "A" },
    { id: "f2", label: "B", sectionId: "sec_b" },
  ],
  sections: [
    { id: DEFAULT_SECTION_ID, name: "General" },
    { id: "sec_b", name: "Details" },
    { id: "sec_empty", name: "Empty" },
  ],
};

describe("nodeSections", () => {
  it("renders explicit empty sections", () => {
    const sections = getRenderableSections(baseData, baseData.fields ?? []);
    expect(sections.map((section) => section.id)).toEqual([
      DEFAULT_SECTION_ID,
      "sec_b",
      "sec_empty",
    ]);
  });

  it("promotes implicit general section when creating explicit sections", () => {
    const implicit: SystemNodeData = {
      label: "Test",
      nodeGroupId: "g1",
      fields: [{ id: "f1", label: "A" }],
    };
    const next = ensureExplicitSections(implicit);
    expect(next.sections).toEqual([{ id: DEFAULT_SECTION_ID, name: "General" }]);
    expect(next.fields?.[0]?.sectionId).toBe(DEFAULT_SECTION_ID);
  });

  it("moves fields to another section before a target field", () => {
    const moved = moveFieldToSection(baseData.fields ?? [], "f1", "sec_b", "f2");
    expect(moved.map((field) => field.id)).toEqual(["f1", "f2"]);
    expect(moved[0]?.sectionId).toBe("sec_b");
    expect(moved[1]?.sectionId).toBe("sec_b");
  });

  it("reorders across sections by adopting the target section", () => {
    const reordered = reorderFieldsInList(baseData.fields ?? [], "f1", "f2");
    expect(reordered.map((field) => field.id)).toEqual(["f2", "f1"]);
    expect(reordered[1]?.sectionId).toBe("sec_b");
  });

  it("deletes a section and moves its fields to the fallback section", () => {
    const withFieldInEmpty: SystemNodeData = {
      ...baseData,
      fields: [...(baseData.fields ?? []), { id: "f3", label: "C", sectionId: "sec_empty" }],
    };
    const next = deleteSectionFromNode(withFieldInEmpty, "sec_empty");
    expect(next.sections?.some((section) => section.id === "sec_empty")).toBe(false);
    expect(next.fields?.find((field) => field.id === "f3")?.sectionId).toBe(DEFAULT_SECTION_ID);
  });

  it("picks a fallback section when deleting", () => {
    const sections = [
      { id: "sec_a", name: "A" },
      { id: "sec_b", name: "B" },
    ];
    expect(resolveDeleteSectionTarget(sections, "sec_a")).toBe("sec_b");
  });

  it("creates unique section ids", () => {
    const a = createSection();
    const b = createSection();
    expect(a.id).not.toBe(b.id);
  });

  it("creates groups inside a section", () => {
    const group = createGroup("sec_b");
    expect(group.sectionId).toBe("sec_b");
    expect(getGroupsForSection([group], "sec_b")).toEqual([group]);
  });

  it("moves fields into a group", () => {
    const moved = moveFieldToGroup(baseData.fields ?? [], "f1", "sec_b", "grp_1");
    expect(moved.find((field) => field.id === "f1")?.groupId).toBe("grp_1");
    expect(moved.find((field) => field.id === "f1")?.sectionId).toBe("sec_b");
  });

  it("keeps ungrouped fields separate from grouped fields", () => {
    const withGroup: SystemNodeData = {
      ...baseData,
      groups: [{ id: "grp_1", name: "Keys", sectionId: DEFAULT_SECTION_ID }],
      fields: [
        { id: "f1", label: "A", sectionId: DEFAULT_SECTION_ID },
        { id: "f2", label: "B", sectionId: DEFAULT_SECTION_ID, groupId: "grp_1" },
      ],
    };
    expect(getFieldsForGroup(withGroup.fields ?? [], DEFAULT_SECTION_ID, null).map((f) => f.id)).toEqual([
      "f1",
    ]);
    expect(getFieldsForGroup(withGroup.fields ?? [], DEFAULT_SECTION_ID, "grp_1").map((f) => f.id)).toEqual([
      "f2",
    ]);
  });

  it("deletes a group and ungroups its fields", () => {
    const withGroup: SystemNodeData = {
      ...baseData,
      groups: [{ id: "grp_1", name: "Keys", sectionId: "sec_b" }],
      fields: [{ id: "f9", label: "C", sectionId: "sec_b", groupId: "grp_1" }],
    };
    const next = deleteGroupFromNode(withGroup, "grp_1");
    expect(next.groups).toEqual([]);
    expect(next.fields?.find((field) => field.id === "f9")?.groupId).toBeUndefined();
  });

  it("toggles section and group collapse state", () => {
    const collapsedSection = toggleSectionCollapsed(baseData, DEFAULT_SECTION_ID);
    expect(collapsedSection.sections?.find((section) => section.id === DEFAULT_SECTION_ID)?.collapsed).toBe(
      true,
    );

    const withGroup: SystemNodeData = {
      ...baseData,
      groups: [{ id: "grp_1", name: "Keys", sectionId: "sec_b" }],
    };
    const collapsedGroup = toggleGroupCollapsed(withGroup, "grp_1");
    expect(collapsedGroup.groups?.find((group) => group.id === "grp_1")?.collapsed).toBe(true);
  });

  it("clears group when moving to section root", () => {
    const fields = [
      { id: "f1", label: "A", sectionId: "sec_b", groupId: "grp_1" },
      { id: "f2", label: "B", sectionId: "sec_b" },
    ];
    const moved = moveFieldToTarget(fields, "f1", { sectionId: "sec_b", groupId: null });
    expect(moved.find((field) => field.id === "f1")?.groupId).toBeUndefined();
  });
});
