import type { Field, FieldSection, SystemNodeData } from "@/components/nodes/SystemNode";

export const DEFAULT_SECTION_ID = "sec_default";

export type RenderableSection = FieldSection & {
  showHeader: boolean;
};

export function getEffectiveSections(data: SystemNodeData): FieldSection[] {
  if (data.sections?.length) {
    return data.sections;
  }
  return [{ id: DEFAULT_SECTION_ID, name: "General" }];
}

export function hasExplicitSections(data: SystemNodeData): boolean {
  return (data.sections?.length ?? 0) > 0;
}

export function getFieldSectionId(field: Field): string {
  return field.sectionId || DEFAULT_SECTION_ID;
}

export function getFieldsForSection(fields: Field[], sectionId: string): Field[] {
  return fields.filter((field) => getFieldSectionId(field) === sectionId);
}

/**
 * Sections to render in the node body. Hides the implicit empty "General" bucket
 * until the user adds fields or creates explicit sections.
 */
export function getRenderableSections(data: SystemNodeData, fields: Field[]): RenderableSection[] {
  const explicit = hasExplicitSections(data);
  const allSections = getEffectiveSections(data);

  if (!explicit && fields.length === 0) {
    return [];
  }

  if (!explicit && fields.length > 0) {
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

export function moveFieldToSection(
  fields: Field[],
  fieldId: string,
  sectionId: string,
  beforeFieldId?: string,
): Field[] {
  const list = [...fields];
  const fromIndex = list.findIndex((field) => field.id === fieldId);
  if (fromIndex < 0) return fields;

  const [moved] = list.splice(fromIndex, 1);
  const updated = { ...moved, sectionId };

  if (beforeFieldId) {
    const toIndex = list.findIndex((field) => field.id === beforeFieldId);
    if (toIndex >= 0) {
      list.splice(toIndex, 0, updated);
      return list;
    }
  }

  const lastInSectionIndex = list.reduce(
    (lastIndex, field, index) => (getFieldSectionId(field) === sectionId ? index : lastIndex),
    -1,
  );

  if (lastInSectionIndex >= 0) {
    list.splice(lastInSectionIndex + 1, 0, updated);
  } else {
    list.push(updated);
  }

  return list;
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
  const [moved] = list.splice(fromIndex, 1);
  const insertIndex = list.findIndex((field) => field.id === targetFieldId);
  list.splice(insertIndex + 1, 0, { ...moved, sectionId: targetSectionId });
  return list;
}

export function deleteSectionFromNode(
  data: SystemNodeData,
  sectionId: string,
): SystemNodeData {
  const currentSections = data.sections ?? getEffectiveSections(data);
  const fallbackSectionId = resolveDeleteSectionTarget(currentSections, sectionId);
  if (!fallbackSectionId) return data;

  const nextSections = currentSections.filter((section) => section.id !== sectionId);
  const nextFields = (data.fields ?? []).map((field) =>
    getFieldSectionId(field) === sectionId ? { ...field, sectionId: fallbackSectionId } : field,
  );

  return {
    ...data,
    sections: nextSections,
    fields: nextFields,
  };
}
