import type { Field, FieldSection, SystemNodeData } from "@/components/nodes/SystemNode";

export const DEFAULT_SECTION_ID = "sec_default";

export function getEffectiveSections(data: SystemNodeData): FieldSection[] {
  if (data.sections?.length) {
    return data.sections;
  }
  return [{ id: DEFAULT_SECTION_ID, name: "General" }];
}

export function getFieldSectionId(field: Field): string {
  return field.sectionId || DEFAULT_SECTION_ID;
}

export function getFieldsForSection(fields: Field[], sectionId: string): Field[] {
  return fields.filter((field) => getFieldSectionId(field) === sectionId);
}

export function createSection(name = "New Section"): FieldSection {
  return {
    id: `sec_${Date.now()}`,
    name,
  };
}
