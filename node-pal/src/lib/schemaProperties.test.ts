import { describe, expect, it } from "vitest";
import {
  getFieldProperties,
  getGroupBlockProperties,
  getSharedBlockAttributeDefinitions,
  mergePropertyDefinitions,
  normalizeSchema,
} from "./schemaProperties";
describe("mergePropertyDefinitions", () => {
  it("merges block and field property lists by id", () => {
    const merged = mergePropertyDefinitions(
      [{ id: "a", name: "Owner", type: "text" }],
      [{ id: "b", name: "Type", type: "text" }],
    );
    expect(merged.map((property) => property.id).sort()).toEqual(["a", "b"]);
  });
});

describe("normalizeSchema", () => {
  it("keeps block and field schema props in separate per-group lists", () => {
    const normalized = normalizeSchema({
      nodeGroups: [
        {
          id: "g1",
          name: "Table",
          blockProperties: [{ id: "owner", name: "Owner", type: "text" }],
          properties: [{ id: "type", name: "Type", type: "text" }],
        },
      ],
      customObjectSchemas: [],
      fieldTypes: [],
      globalProperties: [],
      timestamp: 0,
    });

    expect(normalized.nodeGroups[0]?.blockProperties?.map((property) => property.id)).toEqual([
      "owner",
    ]);
    expect(normalized.nodeGroups[0]?.properties.map((property) => property.id)).toEqual(["type"]);
  });
});

describe("getSharedBlockAttributeDefinitions", () => {
  it("returns only the selected block type schema", () => {
    const schema = normalizeSchema({
      nodeGroups: [
        {
          id: "g1",
          name: "A",
          properties: [{ id: "type", name: "Type", type: "text" }],
        },
        {
          id: "g2",
          name: "B",
          properties: [{ id: "other", name: "Other", type: "text" }],
        },
      ],
      customObjectSchemas: [],
      fieldTypes: [],
      globalProperties: [{ id: "global", name: "Global", type: "text" }],
      timestamp: 0,
    });

    expect(getFieldProperties(schema, "g1").map((property) => property.id)).toEqual(["type"]);
    expect(getGroupBlockProperties(schema, "g1").map((property) => property.id)).toEqual([]);
    expect(getSharedBlockAttributeDefinitions(schema, { nodeGroupId: "g2" }).map((p) => p.id)).toEqual([
      "other",
    ]);
  });
});
