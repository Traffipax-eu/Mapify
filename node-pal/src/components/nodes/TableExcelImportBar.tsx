import { ClipboardPaste, Table2 } from "lucide-react";

type Props = {
  onPasteFromExcel: () => void;
  onPasteMerge?: () => void;
  compact?: boolean;
};

export function TableExcelImportBar({ onPasteFromExcel, onPasteMerge, compact = false }: Props) {
  return (
    <div
      className={`system-node__excel-import nodrag nopan ${compact ? "system-node__excel-import--compact" : ""}`}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="system-node__excel-import-btn nodrag nopan"
        onClick={(e) => {
          e.stopPropagation();
          onPasteFromExcel();
        }}
        title="Copy rows from Excel, then click to import (one row = one new field)"
      >
        <Table2 className="h-3.5 w-3.5 shrink-0" />
        <ClipboardPaste className="h-3.5 w-3.5 shrink-0" />
        <span>Paste from Excel</span>
      </button>
      {!compact && (
        <p className="system-node__excel-import-hint">
          Copy tab-separated rows in Excel, then paste here. Each row becomes a new field.
          {onPasteMerge ? " Hold Shift while clicking to update existing rows instead." : ""}
        </p>
      )}
      {compact && onPasteMerge && (
        <button
          type="button"
          className="system-node__excel-import-merge nodrag nopan"
          onClick={(e) => {
            e.stopPropagation();
            onPasteMerge();
          }}
          title="Shift+click: merge into existing rows from selected cell"
        >
          Merge rows
        </button>
      )}
    </div>
  );
}
