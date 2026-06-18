import { describe, expect, it } from "vitest";
import { fixedPropertyRowsToMetadata } from "./metadataAttributes";

describe("fixedPropertyRowsToMetadata", () => {
  it("persists non-empty values under property ids", () => {
    const properties = [{ id: "prop_type", name: "Type", type: "text" as const, scope: "group" as const }];
    const rows = [
      {
        rowId: "prop_type",
        storageKey: "prop_type",
        label: "Type",
        value: "VARCHAR",
      },
    ];

    expect(fixedPropertyRowsToMetadata(rows, properties)).toEqual({
      metadata: { prop_type: "VARCHAR" },
      propertyKeys: ["prop_type"],
    });
  });
});
