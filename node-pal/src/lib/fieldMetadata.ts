import type { MetadataValues, PropertyDefinition, Schema } from "@/lib/storage";
import { getScopedProperties } from "@/lib/schemaProperties";

export type FieldTableColumn = {
  id: string;
  name: string;
  scope: "global" | "group";
};

export function getFieldTableColumns(
  schema: Schema,
  nodeGroupId: string | undefined,
  visibleColumns: string[] | undefined,
): FieldTableColumn[] {
  const allColumns = getScopedProperties(schema, nodeGroupId).map((property) => ({
    id: property.id,
    name: property.name,
    scope: property.scope,
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
  properties: PropertyDefinition[],
): string {
  const property = properties.find((item) => item.id === propertyId);
  if (!property) return "—";

  const value = metadata?.[propertyId];
  if (value === undefined || value === null || value === "") return "—";

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}
