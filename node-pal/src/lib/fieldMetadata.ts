import type { MetadataValues, PropertyDefinition, Schema } from "@/lib/storage";
import { getCustomObjectFieldProperties, getFieldProperties } from "@/lib/schemaProperties";

export type FieldTableColumn = {
  id: string;
  name: string;
  scope: "group";
};

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
  const list = Array.isArray(properties) ? properties : [];
  const property = list.find((item) => item?.id === propertyId);
  if (!property) return "—";

  const value = metadata?.[propertyId];
  if (value === undefined || value === null || value === "") return "—";

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}
