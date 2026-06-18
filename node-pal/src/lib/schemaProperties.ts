import type { MetadataValues, PropertyDefinition, Schema } from "@/lib/storage";

export type ScopedProperty = PropertyDefinition & {
  scope: "global" | "group";
};

function isValidProperty(property: PropertyDefinition | null | undefined): property is PropertyDefinition {
  return Boolean(property?.id);
}

/** Node-wide attributes (schema.globalProperties) — system/node level only. */
export function getNodeGroupProperties(schema: Schema | null | undefined): ScopedProperty[] {
  const globalProps = schema?.globalProperties;
  const list = Array.isArray(globalProps) ? globalProps : [];
  return list
    .filter(isValidProperty)
    .map((property) => ({
      ...property,
      name: property.name ?? "Attribute",
      type: property.type ?? "text",
      scope: "global" as const,
    }));
}

/** Field-level attributes for a node group — table columns and field metadata only. */
export function getFieldProperties(schema: Schema | null | undefined, nodeGroupId?: string): ScopedProperty[] {
  if (!nodeGroupId) return [];
  const groupProps =
    schema?.nodeGroups?.find((group) => group?.id === nodeGroupId)?.properties ?? [];
  if (!Array.isArray(groupProps)) return [];
  return groupProps.filter(isValidProperty).map((property) => ({
    ...property,
    name: property.name ?? "Attribute",
    type: property.type ?? "text",
    scope: "group" as const,
  }));
}

/** Merge global + group-level properties (group overrides same id). @deprecated Prefer getNodeGroupProperties / getFieldProperties. */
export function getScopedProperties(schema: Schema, nodeGroupId?: string): ScopedProperty[] {
  const map = new Map<string, ScopedProperty>();
  for (const property of getNodeGroupProperties(schema)) {
    map.set(property.id, property);
  }
  for (const property of getFieldProperties(schema, nodeGroupId)) {
    map.set(property.id, property);
  }
  return Array.from(map.values());
}

/** Keep only metadata keys that belong to the given property definitions. */
export function pickMetadataForProperties(
  metadata: MetadataValues | undefined,
  properties: PropertyDefinition[] | null | undefined,
): MetadataValues {
  if (!metadata || typeof metadata !== "object") return {};
  const list = Array.isArray(properties) ? properties : [];
  const allowed = new Set(list.filter((property) => property?.id).map((property) => property.id));
  const picked: MetadataValues = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (allowed.has(key)) {
      picked[key] = value;
    }
  }
  return picked;
}

export function normalizeSchema(schema: Partial<Schema> | null | undefined): Schema {
  const nodeGroups = Array.isArray(schema?.nodeGroups) ? schema.nodeGroups : [];
  return {
    nodeGroups: nodeGroups.map((group) => ({
      ...group,
      id: group?.id ?? `group_${Date.now()}`,
      name: group?.name ?? "Block",
      properties: Array.isArray(group?.properties) ? group.properties : [],
    })),
    fieldTypes: Array.isArray(schema?.fieldTypes) ? schema.fieldTypes : [],
    globalProperties: Array.isArray(schema?.globalProperties) ? schema.globalProperties : [],
    timestamp: schema?.timestamp ?? Date.now(),
  };
}
