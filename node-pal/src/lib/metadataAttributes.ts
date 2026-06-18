import type { MetadataValues } from "@/lib/storage";
import type { ScopedProperty } from "@/lib/schemaProperties";
import { resolveFieldMetadataValue } from "@/lib/fieldMetadata";

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

/** One row per block field attribute; values come from the selected field only. */
export function metadataToFixedPropertyRows(
  metadata: MetadataValues | null | undefined,
  properties: ScopedProperty[] = [],
): AttributeRow[] {
  return (properties ?? [])
    .filter((property) => property?.id)
    .map((property) => ({
      rowId: property.id,
      storageKey: property.id,
      label: property.name?.trim() || "Attribute",
      value: formatMetadataValue(resolveFieldMetadataValue(metadata, property.id, properties)),
    }));
}

export function attributeRowsToMetadata(
  rows: AttributeRow[] | null | undefined,
  properties: ScopedProperty[] = [],
): MetadataValues {
  const safeRows = Array.isArray(rows) ? rows : [];
  const propertyById = new Map(
    (properties ?? []).filter((p) => p?.id).map((property) => [property.id, property]),
  );
  const propertyByName = new Map(
    (properties ?? [])
      .filter((p) => p?.id && p?.name?.trim())
      .map((property) => [property.name!.trim().toLowerCase(), property.id]),
  );

  const next: MetadataValues = {};
  for (const row of safeRows) {
    const label = row.label.trim();
    if (!label) continue;

    let key = row.storageKey;
    if (propertyById.has(row.storageKey) && propertyById.get(row.storageKey)?.name?.trim() === label) {
      key = row.storageKey;
    } else {
      key =
        propertyByName.get(label.toLowerCase()) ??
        propertyByName.get(row.storageKey.trim().toLowerCase()) ??
        label;
    }

    next[key] = row.value;
  }
  return next;
}

export function fixedPropertyRowsToMetadata(
  rows: AttributeRow[] | null | undefined,
  properties: ScopedProperty[] = [],
): { metadata: MetadataValues; propertyKeys: string[] } {
  const propertyList = (properties ?? []).filter((property) => property?.id);
  const rowByKey = new Map(
    (rows ?? []).map((row) => [row.storageKey || row.rowId, row] as const),
  );
  const metadata: MetadataValues = {};
  const propertyKeys: string[] = [];

  for (const property of propertyList) {
    propertyKeys.push(property.id);
    const row = rowByKey.get(property.id);
    if (!row) continue;
    metadata[property.id] = row.value;
  }

  return { metadata, propertyKeys };
}

export function pickMetadataForKeys(
  metadata: MetadataValues | null | undefined,
  propertyKeys: string[],
): MetadataValues {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const allowed = new Set(propertyKeys);
  const next: MetadataValues = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!allowed.has(key)) continue;
    if (value === undefined || value === null) continue;
    next[key] = value;
  }
  return next;
}

export function sanitizeFreeformMetadata(metadata: MetadataValues | null | undefined): MetadataValues {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const next: MetadataValues = {};
  for (const [key, value] of Object.entries(metadata)) {
    const trimmed = key.trim();
    if (!trimmed) continue;
    if (value === undefined || value === null) continue;
    next[trimmed] = value;
  }
  return next;
}

export function getAttributeDisplayItems(
  metadata: MetadataValues | null | undefined,
  properties: ScopedProperty[] = [],
): AttributeDisplayItem[] {
  const rows =
    properties.length > 0
      ? metadataToFixedPropertyRows(metadata, properties)
      : metadataToAttributeRows(metadata, properties);

  return rows
    .filter((row) => row.value.trim())
    .map((row) => ({
      key: row.label.trim() || row.storageKey,
      value: row.value.trim(),
    }));
}

export function createEmptyAttributeRow(): AttributeRow {
  const rowId = `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return { rowId, storageKey: "", label: "", value: "" };
}
