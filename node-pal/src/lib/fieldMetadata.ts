import type { MetadataValues, PropertyDefinition, Schema } from "@/lib/storage";
import {
  getCustomObjectFieldProperties,
  getFieldProperties,
  type ScopedProperty,
} from "@/lib/schemaProperties";

export type FieldTableColumn = {
  id: string;
  name: string;
  scope: "group";
};

export type BlockFieldAttributeSource = {
  nodeGroupId?: string;
  objectId?: string;
  fieldAttributeKeys?: string[];
};

function isEmptyMetadataValue(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/** Resolve a field metadata value for a schema column id or raw metadata key. */
export function resolveFieldMetadataValue(
  metadata: MetadataValues | undefined,
  columnId: string,
  properties: PropertyDefinition[] | null | undefined,
): unknown {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  const list = Array.isArray(properties) ? properties : [];
  const property = list.find((item) => item?.id === columnId);
  const direct = metadata[columnId];
  if (!isEmptyMetadataValue(direct)) {
    return direct;
  }

  if (property?.name) {
    const propertyName = property.name.trim();
    if (propertyName) {
      const byName = metadata[propertyName];
      if (!isEmptyMetadataValue(byName)) {
        return byName;
      }

      const propertyNameLower = propertyName.toLowerCase();
      for (const [key, value] of Object.entries(metadata)) {
        if (key.trim().toLowerCase() === propertyNameLower && !isEmptyMetadataValue(value)) {
          return value;
        }
      }
    }
  }

  if (!property) {
    for (const [key, value] of Object.entries(metadata)) {
      if (key === columnId && !isEmptyMetadataValue(value)) {
        return value;
      }
    }
  }

  return undefined;
}

/** Shared field attribute definitions for every field in a block or data asset. */
export function getBlockFieldAttributeDefinitions(
  schema: Schema | null | undefined,
  source: BlockFieldAttributeSource,
  fields: Array<{ metadata?: MetadataValues }>,
  scope: "block" | "artifact" = "block",
): ScopedProperty[] {
  const scopeId = scope === "artifact" ? source.objectId : source.nodeGroupId;
  const schemaProps =
    scope === "artifact"
      ? getCustomObjectFieldProperties(schema, scopeId)
      : getFieldProperties(schema, scopeId);
  if (schemaProps.length > 0) return schemaProps;

  const keys = new Set<string>(source.fieldAttributeKeys ?? []);
  for (const field of fields) {
    for (const key of Object.keys(field.metadata ?? {})) {
      const trimmed = key.trim();
      if (trimmed) keys.add(trimmed);
    }
  }

  return Array.from(keys)
    .sort((a, b) => a.localeCompare(b))
    .map((id) => ({
      id,
      name: id,
      type: "text" as const,
      scope: "group" as const,
    }));
}

export function attributeDefinitionsToTableColumns(
  properties: ScopedProperty[],
  visibleColumns?: string[],
): FieldTableColumn[] {
  const allColumns = properties.map((property) => ({
    id: property.id,
    name: property.name,
    scope: "group" as const,
  }));

  if (!visibleColumns?.length) {
    return allColumns;
  }

  const columnMap = new Map(allColumns.map((column) => [column.id, column]));
  return visibleColumns
    .map((columnId) => columnMap.get(columnId) ?? null)
    .filter((column): column is FieldTableColumn => column !== null);
}

export function getFieldTableColumns(
  schema: Schema,
  scopeId: string | undefined,
  visibleColumns: string[] | undefined,
  scope: "block" | "artifact" = "block",
): FieldTableColumn[] {
  const properties =
    scope === "artifact"
      ? getCustomObjectFieldProperties(schema, scopeId)
      : getFieldProperties(schema, scopeId);
  return attributeDefinitionsToTableColumns(properties, visibleColumns);
}

export function formatFieldCellValue(
  metadata: MetadataValues | undefined,
  propertyId: string,
  properties: PropertyDefinition[] | null | undefined,
): string {
  const value = resolveFieldMetadataValue(metadata, propertyId, properties);
  if (isEmptyMetadataValue(value)) return "—";

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

/** Normalize field metadata to schema property ids for reliable persistence. */
export function normalizeMetadataForProperties(
  metadata: MetadataValues | undefined,
  properties: PropertyDefinition[] | null | undefined,
): MetadataValues {
  const list = Array.isArray(properties) ? properties : [];
  const next: MetadataValues = {};

  for (const property of list) {
    if (!property?.id) continue;
    const value = resolveFieldMetadataValue(metadata, property.id, list);
    if (isEmptyMetadataValue(value)) continue;
    next[property.id] = value;
  }

  return next;
}
