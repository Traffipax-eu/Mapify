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

  it("updates existing fields from a grid", () => {
    const plan = buildTablePastePlan(
      [["Name2", "VARCHAR"], ["Age2", "INT"]],
      fields,
      columns,
      { fieldIndex: 0, columnKey: "label" },
    );

    expect(plan.newFields).toEqual([]);
    expect(plan.updates).toEqual([
      { fieldId: "f1", label: "Name2", metadata: { type: "VARCHAR" } },
      { fieldId: "f2", label: "Age2", metadata: { type: "INT" } },
    ]);
  });

  it("creates new fields when pasted below existing rows", () => {
    const plan = buildTablePastePlan(
      [["City", "TEXT"]],
      fields,
      columns,
      { fieldIndex: 2, columnKey: "label" },
    );

    expect(plan.updates).toEqual([]);
    expect(plan.newFields).toEqual([{ label: "City", metadata: { type: "TEXT" } }]);
  });

  it("fills attribute columns when anchored on a column", () => {
    const plan = buildTablePastePlan(
      [["VARCHAR"], ["INT"]],
      fields,
      columns,
      { fieldIndex: 0, columnKey: "type" },
    );

    expect(plan.updates).toEqual([
      { fieldId: "f1", metadata: { type: "VARCHAR" } },
      { fieldId: "f2", metadata: { type: "INT" } },
    ]);
  });
});
