import type { Field, FieldGroup, FieldSection, SystemNodeData } from "@/components/nodes/SystemNode";

export const DEFAULT_SECTION_ID = "sec_default";

export type RenderableSection = FieldSection & {
  showHeader: boolean;
};

export type FieldPlacementTarget = {
  sectionId: string;
  groupId?: string | null;
};

export function getEffectiveSections(data: SystemNodeData): FieldSection[] {
  if (data.sections?.length) {
    return data.sections;
  }
  return [{ id: DEFAULT_SECTION_ID, name: "General" }];
}

export function getEffectiveGroups(data: SystemNodeData): FieldGroup[] {
  return data.groups ?? [];
}

export function hasExplicitSections(data: SystemNodeData): boolean {
  return (data.sections?.length ?? 0) > 0;
}

export function getFieldSectionId(field: Field): string {
  return field.sectionId || DEFAULT_SECTION_ID;
}

export function getFieldGroupId(field: Field): string | undefined {
  return field.groupId;
}

export function fieldBelongsToGroup(field: Field, groupId: string | null): boolean {
  if (!groupId) return !field.groupId;
  return field.groupId === groupId;
}

export function getFieldsForSection(fields: Field[], sectionId: string): Field[] {
  return fields.filter((field) => getFieldSectionId(field) === sectionId);
}

export function getGroupsForSection(groups: FieldGroup[] | undefined, sectionId: string): FieldGroup[] {
  return (groups ?? []).filter((group) => group.sectionId === sectionId);
}

export function getFieldsForGroup(fields: Field[], sectionId: string, groupId: string | null): Field[] {
  return fields.filter(
    (field) => getFieldSectionId(field) === sectionId && fieldBelongsToGroup(field, groupId),
  );
}

export function countFieldsInSection(fields: Field[], sectionId: string): number {
  return getFieldsForSection(fields, sectionId).length;
}

export function countFieldsInGroup(fields: Field[], sectionId: string, groupId: string): number {
  return getFieldsForGroup(fields, sectionId, groupId).length;
}

/**
 * Sections to render in the node body. Hides the implicit empty "General" bucket
 * until the user adds fields or creates explicit sections.
 */
export function getRenderableSections(data: SystemNodeData, fields: Field[]): RenderableSection[] {
  const explicit = hasExplicitSections(data);
  const allSections = getEffectiveSections(data);
  const hasGroups = getEffectiveGroups(data).length > 0;

  if (!explicit && fields.length === 0 && !hasGroups) {
    return [];
  }

  if (!explicit && (fields.length > 0 || hasGroups)) {
    return [{ id: DEFAULT_SECTION_ID, name: "General", showHeader: false }];
  }

  const sectionCount = allSections.length;
  return allSections.map((section) => ({
    ...section,
    showHeader: shouldShowSectionHeader(sectionCount),
  }));
}

export function shouldShowSectionHeader(sectionCount: number): boolean {
  return sectionCount > 1;
}

export function createSection(name = "New Section"): FieldSection {
  return {
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    collapsed: false,
  };
}

export function createGroup(sectionId: string, name = "New Group"): FieldGroup {
  return {
    id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    sectionId,
    collapsed: false,
  };
}

/** Persist implicit General section when promoting to explicit sections. */
export function ensureExplicitSections(data: SystemNodeData): SystemNodeData {
  if (data.sections?.length) return data;
  return {
    ...data,
    sections: getEffectiveSections(data),
    fields: (data.fields ?? []).map((field) => ({
      ...field,
      sectionId: field.sectionId ?? DEFAULT_SECTION_ID,
    })),
  };
}

export function resolveDeleteSectionTarget(
  sections: FieldSection[],
  sectionId: string,
): string | null {
  if (sections.length <= 1) return null;
  const remaining = sections.filter((section) => section.id !== sectionId);
  return remaining.find((section) => section.id === DEFAULT_SECTION_ID)?.id ?? remaining[0]?.id ?? null;
}

export function moveFieldToTarget(
  fields: Field[],
  fieldId: string,
  target: FieldPlacementTarget,
  beforeFieldId?: string,
): Field[] {
  const list = [...fields];
  const fromIndex = list.findIndex((field) => field.id === fieldId);
  if (fromIndex < 0) return fields;

  const [moved] = list.splice(fromIndex, 1);
  const nextGroupId = target.groupId === null || target.groupId === undefined ? undefined : target.groupId;
  const updated = {
    ...moved,
    sectionId: target.sectionId,
    groupId: nextGroupId,
  };

  if (beforeFieldId) {
    const toIndex = list.findIndex((field) => field.id === beforeFieldId);
    if (toIndex >= 0) {
      list.splice(toIndex, 0, updated);
      return list;
    }
  }

  const lastInTargetIndex = list.reduce((lastIndex, field, index) => {
    if (getFieldSectionId(field) !== target.sectionId) return lastIndex;
    if (!fieldBelongsToGroup(field, nextGroupId ?? null)) return lastIndex;
    return index;
  }, -1);

  if (lastInTargetIndex >= 0) {
    list.splice(lastInTargetIndex + 1, 0, updated);
  } else {
    list.push(updated);
  }

  return list;
}

export function moveFieldToSection(
  fields: Field[],
  fieldId: string,
  sectionId: string,
  beforeFieldId?: string,
): Field[] {
  return moveFieldToTarget(fields, fieldId, { sectionId, groupId: null }, beforeFieldId);
}

export function moveFieldToGroup(
  fields: Field[],
  fieldId: string,
  sectionId: string,
  groupId: string,
  beforeFieldId?: string,
): Field[] {
  return moveFieldToTarget(fields, fieldId, { sectionId, groupId }, beforeFieldId);
}

export function reorderFieldsInList(
  fields: Field[],
  sourceFieldId: string,
  targetFieldId: string,
): Field[] {
  if (sourceFieldId === targetFieldId) return fields;

  const list = [...fields];
  const fromIndex = list.findIndex((field) => field.id === sourceFieldId);
  const toIndex = list.findIndex((field) => field.id === targetFieldId);
  if (fromIndex < 0 || toIndex < 0) return fields;

  const targetSectionId = getFieldSectionId(list[toIndex]);
  const targetGroupId = getFieldGroupId(list[toIndex]);
  const [moved] = list.splice(fromIndex, 1);
  const insertIndex = list.findIndex((field) => field.id === targetFieldId);
  list.splice(insertIndex + 1, 0, {
    ...moved,
    sectionId: targetSectionId,
    groupId: targetGroupId,
  });
  return list;
}

export function toggleSectionCollapsed(data: SystemNodeData, sectionId: string): SystemNodeData {
  const next = ensureExplicitSections(data);
  return {
    ...next,
    sections: (next.sections ?? []).map((section) =>
      section.id === sectionId ? { ...section, collapsed: !section.collapsed } : section,
    ),
  };
}

export function toggleGroupCollapsed(data: SystemNodeData, groupId: string): SystemNodeData {
  const groups = getEffectiveGroups(data);
  return {
    ...data,
    groups: groups.map((group) =>
      group.id === groupId ? { ...group, collapsed: !group.collapsed } : group,
    ),
  };
}

export function deleteGroupFromNode(data: SystemNodeData, groupId: string): SystemNodeData {
  const groups = getEffectiveGroups(data).filter((group) => group.id !== groupId);
  const nextFields = (data.fields ?? []).map((field) =>
    field.groupId === groupId ? { ...field, groupId: undefined } : field,
  );

  return {
    ...data,
    groups,
    fields: nextFields,
  };
}

export function deleteSectionFromNode(
  data: SystemNodeData,
  sectionId: string,
): SystemNodeData {
  const currentSections = data.sections ?? getEffectiveSections(data);
  const fallbackSectionId = resolveDeleteSectionTarget(currentSections, sectionId);
  if (!fallbackSectionId) return data;

  const nextSections = currentSections.filter((section) => section.id !== sectionId);
  const nextGroups = getEffectiveGroups(data).filter((group) => group.sectionId !== sectionId);
  const nextFields = (data.fields ?? []).map((field) => {
    if (getFieldSectionId(field) !== sectionId) return field;
    return {
      ...field,
      sectionId: fallbackSectionId,
      groupId: undefined,
    };
  });

  return {
    ...data,
    sections: nextSections,
    groups: nextGroups,
    fields: nextFields,
  };
}
