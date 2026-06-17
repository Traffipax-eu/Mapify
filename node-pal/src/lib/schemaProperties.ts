import type { PropertyDefinition, Schema } from "@/lib/storage";

export type ScopedProperty = PropertyDefinition & {
  scope: "global" | "group";
};

/** Merge global + group-level properties (group overrides same id). */
export function getScopedProperties(schema: Schema, nodeGroupId?: string): ScopedProperty[] {
  const global = schema.globalProperties ?? [];
  const groupProps =
    nodeGroupId != null
      ? schema.nodeGroups.find((group) => group.id === nodeGroupId)?.properties ?? []
      : [];

  const map = new Map<string, ScopedProperty>();
  for (const property of global) {
    map.set(property.id, { ...property, scope: "global" });
  }
  for (const property of groupProps) {
    map.set(property.id, { ...property, scope: "group" });
  }
  return Array.from(map.values());
}

export function normalizeSchema(schema: Partial<Schema>): Schema {
  return {
    nodeGroups: schema.nodeGroups ?? [],
    fieldTypes: schema.fieldTypes ?? [],
    globalProperties: schema.globalProperties ?? [],
    timestamp: schema.timestamp ?? Date.now(),
  };
}
