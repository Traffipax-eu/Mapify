import { describe, expect, it } from "vitest";
import { formatFieldCellValue, resolveFieldMetadataValue } from "./fieldMetadata";
import type { PropertyDefinition } from "./storage";

const properties: PropertyDefinition[] = [
  { id: "prop_type", name: "Type", type: "text" },
  { id: "prop_len", name: "Length", type: "text" },
];

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
