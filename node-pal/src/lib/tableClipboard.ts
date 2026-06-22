import type { Field } from "@/components/nodes/SystemNode";
import type { FieldTableColumn } from "@/lib/fieldMetadata";

export type TableColumnKey = "label" | string;

export type TableCellAddress = {
  fieldIndex: number;
  columnKey: TableColumnKey;
};

export type TablePasteFieldUpdate = {
  fieldId: string;
  label?: string;
  metadata: Record<string, string>;
};

export type TablePasteNewField = {
  label: string;
  metadata: Record<string, string>;
};

export type TablePastePlan = {
  updates: TablePasteFieldUpdate[];
  newFields: TablePasteNewField[];
};

export function parseTabularClipboard(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd();
  if (!normalized) return [];

  return normalized
    .split("\n")
    .map((row) => row.split("\t").map((cell) => cell.trim()));
}

export function getTableColumnKeys(columns: FieldTableColumn[]): TableColumnKey[] {
  return ["label", ...columns.map((column) => column.id)];
}

export function buildTablePastePlan(
  grid: string[][],
  fields: Field[],
  columns: FieldTableColumn[],
  anchor: TableCellAddress,
): TablePastePlan {
  const columnKeys = getTableColumnKeys(columns);
  const startColumnIndex = Math.max(0, columnKeys.indexOf(anchor.columnKey));
  const updates: TablePasteFieldUpdate[] = [];
  const newFields: TablePasteNewField[] = [];

  grid.forEach((row, rowOffset) => {
    const fieldIndex = anchor.fieldIndex + rowOffset;
    const existingField = fields[fieldIndex];
    const labelPatch: { label?: string } = {};
    const metadata: Record<string, string> = {};

    row.forEach((cellValue, colOffset) => {
      const columnKey = columnKeys[startColumnIndex + colOffset];
      if (!columnKey || !cellValue) return;
      if (columnKey === "label") {
        labelPatch.label = cellValue;
      } else {
        metadata[columnKey] = cellValue;
      }
    });

    if (!labelPatch.label && Object.keys(metadata).length === 0) return;

    if (existingField) {
      updates.push({
        fieldId: existingField.id,
        ...labelPatch,
        metadata,
      });
      return;
    }

    newFields.push({
      label: labelPatch.label || `Field ${fieldIndex + 1}`,
      metadata,
    });
  });

  return { updates, newFields };
}
