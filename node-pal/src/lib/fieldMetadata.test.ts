import { describe, expect, it } from "vitest";
import {
  formatFieldCellValue,
  getBlockAttributeDefinitions,
  getFieldAttributeDefinitions,
  normalizeMetadataForProperties,
  resolveFieldMetadataValue,
  buildFieldMetadataUpdate,
} from "./fieldMetadata";import type { PropertyDefinition } from "./storage";

const properties: PropertyDefinition[] = [
  { id: "prop_type", name: "Type", type: "text" },
  { id: "prop_len", name: "Length", type: "text" },
];

describe("getFieldAttributeDefinitions", () => {
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
      getFieldAttributeDefinitions(schema, { nodeGroupId: "group_1" }, [
        { metadata: { custom: "x" } },
      ]),
    ).toEqual([
      expect.objectContaining({ id: "prop_type", name: "Type" }),
    ]);
  });

  it("returns only field schema properties for the selected block type", () => {
    const schema = {
      nodeGroups: [
        {
          id: "group_1",
          name: "Table",
          blockProperties: [{ id: "prop_owner", name: "Owner", type: "text" as const }],
          properties: [{ id: "prop_type", name: "Type", type: "text" as const }],
        },
        {
          id: "group_2",
          name: "Other",
          blockProperties: [{ id: "prop_other", name: "Other", type: "text" as const }],
          properties: [],
        },
      ],
      customObjectSchemas: [],
      fieldTypes: [],
      globalProperties: [{ id: "prop_global", name: "Global", type: "text" as const }],
      timestamp: Date.now(),
    };

    expect(
      getFieldAttributeDefinitions(schema, { nodeGroupId: "group_1" }, []).map(
        (property) => property.id,
      ),
    ).toEqual(["prop_type"]);

    expect(
      getFieldAttributeDefinitions(schema, { nodeGroupId: "group_2" }, []).map(
        (property) => property.id,
      ),
    ).toEqual([]);

    expect(
      getBlockAttributeDefinitions(schema, { nodeGroupId: "group_1" }, "block").map(
        (property) => property.id,
      ),
    ).toEqual(["prop_owner"]);

    expect(
      getBlockAttributeDefinitions(schema, { nodeGroupId: "group_2" }, "block").map(
        (property) => property.id,
      ),
    ).toEqual(["prop_other"]);

    expect(
      getFieldAttributeDefinitions(schema, { nodeGroupId: "group_1" }, []).map(
        (property) => property.id,
      ),
    ).not.toContain("prop_global");
  });

  it("falls back to field keys and field metadata when schema has no field properties", () => {
    expect(
      getFieldAttributeDefinitions(
        { nodeGroups: [], customObjectSchemas: [], fieldTypes: [], globalProperties: [], timestamp: 0 },
        { nodeGroupId: "group_1", fieldAttributeKeys: ["Type"], blockMetadata: { Owner: "ops" } },
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
