export const SCHEMA_SCOPE_LABELS = {
  global: {
    title: "Block Attributes",
    short: "block",
    description: "Shared attribute keys for this block type (values set per block instance on the canvas).",
    columnTooltip: "Block attribute",
  },
  group: {
    title: "Field Attributes",
    short: "field",
    description: "Same shared keys as block attributes; field values are set per field on the canvas.",
    columnTooltip: "Field attribute",
  },
} as const;
