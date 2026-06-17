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

  return allSections
    .filter((section) => {
      const sectionFields = getFieldsForSection(fields, section.id);
      if (sectionFields.length > 0) return true;
      // Never surface the implicit empty General bucket as a header-only section.
      if (section.id === DEFAULT_SECTION_ID) return false;
      return data.sections?.some((item) => item.id === section.id) ?? false;
    })
    .map((section) => ({ ...section, showHeader: true }));
}

export function shouldShowSectionSelect(data: SystemNodeData): boolean {
  return getEffectiveSections(data).length > 1;
}

export function createSection(name = "New Section"): FieldSection {
  return {
    id: `sec_${Date.now()}`,
    name,
  };
}
