import type { MetadataValues, PropertyDefinition, Schema } from "@/lib/storage";
import { getCustomObjectFieldProperties, getFieldProperties } from "@/lib/schemaProperties";

export type FieldTableColumn = {
  id: string;
  name: string;
  scope: "group";
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
