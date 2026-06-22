import type { MetadataValues, PropertyDefinition, Schema } from "@/lib/storage";

export type ScopedProperty = PropertyDefinition & {
  scope: "global" | "group";
};

function isValidProperty(property: PropertyDefinition | null | undefined): property is PropertyDefinition {
  return Boolean(property?.id);
}

function toScopedProperties(
  properties: PropertyDefinition[] | null | undefined,
  scope: ScopedProperty["scope"],
): ScopedProperty[] {
  const list = Array.isArray(properties) ? properties : [];
  return list.filter(isValidProperty).map((property) => ({
    ...property,
    name: property.name ?? "Attribute",
    type: property.type ?? "text",
    scope,
  }));
}

/** Merge property lists; later entries override earlier ones for the same id. */
export function mergePropertyDefinitions(
  ...lists: Array<PropertyDefinition[] | null | undefined>
): PropertyDefinition[] {
  const map = new Map<string, PropertyDefinition>();
  for (const list of lists) {
    for (const property of list ?? []) {
      if (!isValidProperty(property)) continue;
      map.set(property.id, { ...map.get(property.id), ...property, id: property.id });
    }
  }
  return Array.from(map.values());
}

/** @deprecated Sheet-wide block attributes; prefer per-group blockProperties. */
export function getNodeGroupProperties(schema: Schema | null | undefined): ScopedProperty[] {
  return toScopedProperties(schema?.globalProperties, "global");
}

function getNodeGroupRecord(schema: Schema | null | undefined, nodeGroupId?: string) {
  if (!nodeGroupId) return null;
  return schema?.nodeGroups?.find((group) => group?.id === nodeGroupId) ?? null;
}

function getCustomObjectRecord(schema: Schema | null | undefined, objectId?: string) {
  if (!objectId) return null;
  return schema?.customObjectSchemas?.find((item) => item?.id === objectId) ?? null;
}

/** Block-instance attribute definitions for one block type. */
export function getGroupBlockProperties(
  schema: Schema | null | undefined,
  nodeGroupId?: string,
): ScopedProperty[] {
  const group = getNodeGroupRecord(schema, nodeGroupId);
  return toScopedProperties(group?.blockProperties, "group");
}

/** Field attribute definitions for one block type. */
export function getFieldProperties(schema: Schema | null | undefined, nodeGroupId?: string): ScopedProperty[] {
  const group = getNodeGroupRecord(schema, nodeGroupId);
  return toScopedProperties(group?.properties, "group");
}

/** Block-instance attributes for a custom object type. */
export function getCustomObjectBlockProperties(
  schema: Schema | null | undefined,
  objectId?: string,
): ScopedProperty[] {
  const artifact = getCustomObjectRecord(schema, objectId);
  return toScopedProperties(artifact?.blockProperties, "group");
}

/** Field attributes for a custom object type. */
export function getCustomObjectFieldProperties(
  schema: Schema | null | undefined,
  objectId?: string,
): ScopedProperty[] {
  const artifact = getCustomObjectRecord(schema, objectId);
  return toScopedProperties(artifact?.properties, "group");
}

/** Combined schema defs (e.g. seeding keys on drop). */
export function getSharedBlockAttributeDefinitions(
  schema: Schema | null | undefined,
  options: { nodeGroupId?: string; objectId?: string },
): ScopedProperty[] {
  if (options.objectId) {
    return mergePropertyDefinitions(
      getCustomObjectBlockProperties(schema, options.objectId),
      getCustomObjectFieldProperties(schema, options.objectId),
    ).map((property) => ({ ...property, scope: "group" as const }));
  }
  return mergePropertyDefinitions(
    getGroupBlockProperties(schema, options.nodeGroupId),
    getFieldProperties(schema, options.nodeGroupId),
  ).map((property) => ({ ...property, scope: "group" as const }));
}

/** @deprecated Prefer getSharedBlockAttributeDefinitions. */
export function getScopedProperties(schema: Schema, nodeGroupId?: string): ScopedProperty[] {
  return getSharedBlockAttributeDefinitions(schema, { nodeGroupId });
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
  const customObjectSchemas = Array.isArray(schema?.customObjectSchemas)
    ? schema.customObjectSchemas
    : [];
  return {
    nodeGroups: nodeGroups.map((group) => ({
      ...group,
      id: group?.id ?? `group_${Date.now()}`,
      name: group?.name ?? "Block",
      blockProperties: Array.isArray(group?.blockProperties) ? group.blockProperties : [],
      properties: Array.isArray(group?.properties) ? group.properties : [],
    })),
    customObjectSchemas: customObjectSchemas.map((item) => ({
      ...item,
      id: item?.id ?? `artifact_${Date.now()}`,
      name: item?.name ?? "Artifact",
      blockProperties: Array.isArray(item?.blockProperties) ? item.blockProperties : [],
      properties: Array.isArray(item?.properties) ? item.properties : [],
    })),
    fieldTypes: Array.isArray(schema?.fieldTypes) ? schema.fieldTypes : [],
    globalProperties: Array.isArray(schema?.globalProperties) ? schema.globalProperties : [],
    timestamp: schema?.timestamp ?? Date.now(),
  };
}
