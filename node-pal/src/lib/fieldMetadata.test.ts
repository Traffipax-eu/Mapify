import { describe, expect, it } from "vitest";
import { formatFieldCellValue, getBlockFieldAttributeDefinitions, normalizeMetadataForProperties, resolveFieldMetadataValue, buildFieldMetadataUpdate } from "./fieldMetadata";
import type { PropertyDefinition } from "./storage";

const properties: PropertyDefinition[] = [
  { id: "prop_type", name: "Type", type: "text" },
  { id: "prop_len", name: "Length", type: "text" },
];

describe("getBlockFieldAttributeDefinitions", () => {
  it("uses schema field properties when available", () => {
    const schema = {
      nodeGroups: [
        {
          id: "group_1",
          name: "Table",
          properties: [{ id: "prop_type", name: "Type", type: "text" as const }],
        },
      ],
      customObjectSchemas: [],
      fieldTypes: [],
      globalProperties: [],
      timestamp: Date.now(),
    };

    expect(
      getBlockFieldAttributeDefinitions(schema, { nodeGroupId: "group_1" }, [
        { metadata: { custom: "x" } },
      ]),
    ).toEqual([
      expect.objectContaining({ id: "prop_type", name: "Type" }),
    ]);
  });

  it("falls back to shared block keys when schema has no field properties", () => {
    expect(
      getBlockFieldAttributeDefinitions(
        { nodeGroups: [], customObjectSchemas: [], fieldTypes: [], globalProperties: [], timestamp: 0 },
        { nodeGroupId: "group_1", fieldAttributeKeys: ["Type"] },
        [{ metadata: { Length: "10" } }],
      ).map((property) => property.id),
    ).toEqual(["Length", "Type"]);
  });
});

describe("resolveFieldMetadataValue", () => {
  it("reads values stored by property id", () => {
    expect(
      resolveFieldMetadataValue({ prop_type: "VARCHAR" }, "prop_type", properties),
    ).toBe("VARCHAR");
  });

  it("reads values stored by property name", () => {
    expect(resolveFieldMetadataValue({ Type: "INT" }, "prop_type", properties)).toBe("INT");
  });

  it("matches property names case-insensitively", () => {
    expect(resolveFieldMetadataValue({ type: "BOOL" }, "prop_type", properties)).toBe("BOOL");
  });

  it("reads raw metadata keys when no schema property exists", () => {
    expect(resolveFieldMetadataValue({ Notes: "hello" }, "Notes", [])).toBe("hello");
  });
});

describe("normalizeMetadataForProperties", () => {
  it("stores values under property id even when metadata uses the property name", () => {
    expect(normalizeMetadataForProperties({ Type: "VARCHAR" }, properties)).toEqual({
      prop_type: "VARCHAR",
    });
  });
});

describe("buildFieldMetadataUpdate", () => {
  it("keeps freeform metadata when no attribute definitions exist", () => {
    expect(buildFieldMetadataUpdate({ Notes: "hello" }, [])).toEqual({ Notes: "hello" });
  });
});

describe("formatFieldCellValue", () => {
  it("formats resolved values for table cells", () => {
    expect(formatFieldCellValue({ Type: "VARCHAR" }, "prop_type", properties)).toBe("VARCHAR");
  });

  it("returns an em dash for missing values", () => {
    expect(formatFieldCellValue({}, "prop_type", properties)).toBe("—");
  });

  it("formats booleans", () => {
    expect(formatFieldCellValue({ prop_type: true }, "prop_type", properties)).toBe("Yes");
  });
});
