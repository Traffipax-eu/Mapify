export const SCHEMA_SCOPE_LABELS = {
  global: {
    title: "Block Attributes",
    short: "block",
    description: "Apply to every node and field on this sheet.",
    columnTooltip: "Block attribute",
  },
  group: {
    title: "Field Attributes",
    short: "field",
    description: "Apply only to fields in this block (table columns).",
    columnTooltip: "Field attribute",
  },
} as const;
