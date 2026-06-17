export const FIELD_CONNECTION_MIME = "application/x-mapify-field-connection";

export type FieldConnectionDragPayload = {
  kind: "field-connection";
  sourceNodeId: string;
  sourceFieldId: string;
};

export function serializeFieldConnectionDrag(payload: FieldConnectionDragPayload): string {
  return JSON.stringify(payload);
}

export function parseFieldConnectionDrag(raw: string): FieldConnectionDragPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FieldConnectionDragPayload;
    if (
      parsed?.kind === "field-connection" &&
      typeof parsed.sourceNodeId === "string" &&
      typeof parsed.sourceFieldId === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}
