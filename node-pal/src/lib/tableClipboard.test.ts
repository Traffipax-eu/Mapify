import { describe, expect, it } from "vitest";
import { buildTablePastePlan, parseTabularClipboard } from "./tableClipboard";

describe("parseTabularClipboard", () => {
  it("parses tab-separated excel rows", () => {
    expect(parseTabularClipboard("A\t1\nB\t2")).toEqual([
      ["A", "1"],
      ["B", "2"],
    ]);
  });
});

describe("buildTablePastePlan", () => {
  const fields = [
    { id: "f1", label: "Name" },
    { id: "f2", label: "Age" },
  ];
  const columns = [{ id: "type", name: "Type", scope: "group" as const }];

  it("appends every pasted row as a new field in append mode", () => {
    const plan = buildTablePastePlan(
      [["City", "TEXT"], ["Country", "CHAR"]],
      fields,
      columns,
      { fieldIndex: 0, columnKey: "label" },
      "append",
    );

    expect(plan.updates).toEqual([]);
    expect(plan.newFields).toEqual([
      { label: "City", metadata: { type: "TEXT" } },
      { label: "Country", metadata: { type: "CHAR" } },
    ]);
  });

  it("updates existing fields from a grid in merge mode", () => {
    const plan = buildTablePastePlan(
      [["Name2", "VARCHAR"], ["Age2", "INT"]],
      fields,
      columns,
      { fieldIndex: 0, columnKey: "label" },
      "merge",
    );

    expect(plan.newFields).toEqual([]);
    expect(plan.updates).toEqual([
      { fieldId: "f1", label: "Name2", metadata: { type: "VARCHAR" } },
      { fieldId: "f2", label: "Age2", metadata: { type: "INT" } },
    ]);
  });

  it("creates new fields when pasted below existing rows in merge mode", () => {
    const plan = buildTablePastePlan(
      [["City", "TEXT"]],
      fields,
      columns,
      { fieldIndex: 2, columnKey: "label" },
      "merge",
    );

    expect(plan.updates).toEqual([]);
    expect(plan.newFields).toEqual([{ label: "City", metadata: { type: "TEXT" } }]);
  });

  it("fills attribute columns when anchored on a column in merge mode", () => {
    const plan = buildTablePastePlan(
      [["VARCHAR"], ["INT"]],
      fields,
      columns,
      { fieldIndex: 0, columnKey: "type" },
      "merge",
    );

    expect(plan.updates).toEqual([
      { fieldId: "f1", metadata: { type: "VARCHAR" } },
      { fieldId: "f2", metadata: { type: "INT" } },
    ]);
  });
});
