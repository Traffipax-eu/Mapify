import type { MetadataValues, PropertyDefinition, Schema } from "@/lib/storage";

export type ScopedProperty = PropertyDefinition & {
  scope: "global" | "group";
};

function isValidProperty(property: PropertyDefinition | null | undefined): property is PropertyDefinition {
  return Boolean(property?.id);
}

/** Node-wide attributes (schema.globalProperties) — system/node level only. */
export function getNodeGroupProperties(schema: Schema | null | undefined): ScopedProperty[] {
  return (schema?.globalProperties ?? [])
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
    schema?.nodeGroups.find((group) => group.id === nodeGroupId)?.properties ?? [];
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
  properties: PropertyDefinition[],
): MetadataValues {
  if (!metadata) return {};
  const allowed = new Set(properties.map((property) => property.id));
  const picked: MetadataValues = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (allowed.has(key)) {
      picked[key] = value;
    }
  }
  return picked;
}

export function normalizeSchema(schema: Partial<Schema>): Schema {
  return {
    nodeGroups: schema.nodeGroups ?? [],
    fieldTypes: schema.fieldTypes ?? [],
    globalProperties: schema.globalProperties ?? [],
    timestamp: schema.timestamp ?? Date.now(),
  };
}
