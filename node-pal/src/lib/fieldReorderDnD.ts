export const FIELD_REORDER_MIME = "application/x-mapify-field-reorder";

export type FieldReorderPayload = {
  kind: "field-reorder";
  nodeId: string;
  fieldId: string;
};

export function serializeFieldReorder(payload: FieldReorderPayload): string {
  return JSON.stringify(payload);
}

export function parseFieldReorder(raw: string): FieldReorderPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FieldReorderPayload;
    if (parsed?.kind === "field-reorder" && parsed.nodeId && parsed.fieldId) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}
