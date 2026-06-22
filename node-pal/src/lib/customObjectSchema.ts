import type { Schema } from "@/lib/storage";
import { getCustomObjectDefinition } from "@/lib/customObjects";

export function ensureCustomObjectSchema(
  schema: Schema,
  objectId: string,
  name?: string,
): Schema {
  const existing = schema.customObjectSchemas ?? [];
  if (existing.some((item) => item.id === objectId)) {
    return schema;
  }

  const definition = getCustomObjectDefinition(objectId);
  return {
    ...schema,
    customObjectSchemas: [
      ...existing,
      {
        id: objectId,
        name: name ?? definition?.label ?? "Artifact",
        blockProperties: [],
        properties: [],
      },
    ],
    timestamp: Date.now(),
  };
}
