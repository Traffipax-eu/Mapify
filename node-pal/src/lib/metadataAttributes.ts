import type { MetadataValues } from "@/lib/storage";
import type { ScopedProperty } from "@/lib/schemaProperties";

export type AttributeRow = {
  rowId: string;
  storageKey: string;
  label: string;
  value: string;
};

export type AttributeDisplayItem = {
  key: string;
  value: string;
};

export function formatMetadataValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function metadataToAttributeRows(
  metadata: MetadataValues | null | undefined,
  properties: ScopedProperty[] = [],
): AttributeRow[] {
  const safe = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
  const propertyById = new Map(
    (properties ?? []).filter((p) => p?.id).map((property) => [property.id, property]),
  );

  return Object.entries(safe).map(([storageKey, rawValue]) => {
    const property = propertyById.get(storageKey);
    return {
      rowId: storageKey,
      storageKey,
      label: property?.name?.trim() || storageKey,
      value: formatMetadataValue(rawValue),
    };
  });
}

export function attributeRowsToMetadata(
  rows: AttributeRow[],
  properties: ScopedProperty[] = [],
): MetadataValues {
  const propertyById = new Map(
    (properties ?? []).filter((p) => p?.id).map((property) => [property.id, property]),
  );
  const propertyByName = new Map(
    (properties ?? [])
      .filter((p) => p?.id && p?.name)
      .map((property) => [property.name.trim().toLowerCase(), property.id]),
  );

  const next: MetadataValues = {};
  for (const row of rows) {
    const label = row.label.trim();
    if (!label) continue;
    if (row.value === "") continue;

    let key = row.storageKey;
    if (propertyById.has(row.storageKey) && propertyById.get(row.storageKey)?.name?.trim() === label) {
      key = row.storageKey;
    } else {
      key = propertyByName.get(label.toLowerCase()) ?? label;
    }

    next[key] = row.value;
  }
  return next;
}

export function sanitizeFreeformMetadata(metadata: MetadataValues | null | undefined): MetadataValues {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const next: MetadataValues = {};
  for (const [key, value] of Object.entries(metadata)) {
    const trimmed = key.trim();
    if (!trimmed) continue;
    if (value === undefined || value === null || value === "") continue;
    next[trimmed] = value;
  }
  return next;
}

export function getAttributeDisplayItems(
  metadata: MetadataValues | null | undefined,
  properties: ScopedProperty[] = [],
): AttributeDisplayItem[] {
  return metadataToAttributeRows(metadata, properties)
    .filter((row) => row.label.trim() || row.value.trim())
    .map((row) => ({
      key: row.label.trim() || row.storageKey,
      value: row.value.trim() || "—",
    }));
}

export function createEmptyAttributeRow(): AttributeRow {
  const rowId = `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return { rowId, storageKey: "", label: "", value: "" };
}
