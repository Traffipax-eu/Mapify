import type { MetadataValues, PropertyDefinition } from "@/lib/storage";
import type { ScopedProperty } from "@/lib/schemaProperties";
import { formatFieldCellValue } from "@/lib/fieldMetadata";

export type NodeMetadataDisplayItem = {
  id: string;
  name: string;
  value: string;
  scope: "global" | "group";
  isEmpty: boolean;
};

export function getNodeMetadataDisplayItems(
  metadata: MetadataValues | undefined,
  properties: ScopedProperty[],
): NodeMetadataDisplayItem[] {
  return properties
    .filter((property) => Boolean(property?.id))
    .map((property) => {
      const value = formatFieldCellValue(metadata, property.id, properties as PropertyDefinition[]);
      return {
        id: property.id,
        name: property.name?.trim() || "Attribute",
        value,
        scope: property.scope,
        isEmpty: value === "—",
      };
    });
}
