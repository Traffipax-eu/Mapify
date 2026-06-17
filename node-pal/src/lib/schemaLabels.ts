export const SCHEMA_SCOPE_LABELS = {
  global: {
    title: "Node Group Attributes",
    short: "node group",
    description: "Apply to every node and field on this sheet.",
    columnTooltip: "Node group attribute",
  },
  group: {
    title: "Field Attributes",
    short: "field",
    description: "Apply only to fields in this node group (table columns).",
    columnTooltip: "Field attribute",
  },
} as const;
