import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MetadataValues } from "@/lib/storage";
import type { ScopedProperty } from "@/lib/schemaProperties";
import {
  attributeRowsToMetadata,
  createEmptyAttributeRow,
  metadataToAttributeRows,
  type AttributeRow,
} from "@/lib/metadataAttributes";

type Props = {
  metadata: MetadataValues;
  properties?: ScopedProperty[];
  resetKey: string;
  onChange: (metadata: MetadataValues) => void;
};

type EditingTarget = { rowId: string; field: "key" | "value" } | null;

export function MetadataKeyValueGrid({ metadata, properties = [], resetKey, onChange }: Props) {
  const safeProperties = Array.isArray(properties) ? properties : [];
  const [rows, setRows] = useState<AttributeRow[]>(() =>
    metadataToAttributeRows(metadata, safeProperties),
  );
  const [editing, setEditing] = useState<EditingTarget>(null);
  const pendingFocusRef = useRef<"key" | "value" | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    setRows(metadataToAttributeRows(metadata, safeProperties));
    setEditing(null);
    pendingFocusRef.current = null;
    // Only reset local row state when the sidebar selection changes, not on every metadata object reference change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const persistRows = useCallback(
    (nextRows: AttributeRow[]) => {
      rowsRef.current = nextRows;
      setRows(nextRows);
      onChange(attributeRowsToMetadata(nextRows, safeProperties));
    },
    [onChange, safeProperties],
  );

  const commitRow = useCallback(
    (rowId: string, patch: Partial<AttributeRow>) => {
      const next = rowsRef.current.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row));
      persistRows(next);
      setEditing(null);
    },
    [persistRows],
  );

  const removeRow = useCallback(
    (rowId: string) => {
      const next = rowsRef.current.filter((row) => row.rowId !== rowId);
      persistRows(next);
      setEditing(null);
    },
    [persistRows],
  );

  const addRow = useCallback(() => {
    const row = createEmptyAttributeRow();
    pendingFocusRef.current = "key";
    const next = [...rowsRef.current, row];
    rowsRef.current = next;
    setRows(next);
    setEditing({ rowId: row.rowId, field: "key" });
  }, []);

  return (
    <div className="metadata-kv-grid">
      {rows.length > 0 && (
        <div className="metadata-kv-grid__header">
          <span>Property</span>
          <span>Value</span>
          <span className="sr-only">Actions</span>
        </div>
      )}

      {rows.map((row) => (
        <AttributeRowEditor
          key={row.rowId}
          row={row}
          editing={editing}
          pendingFocusRef={pendingFocusRef}
          onStartEdit={(field) => setEditing({ rowId: row.rowId, field })}
          onCommit={(patch) => commitRow(row.rowId, patch)}
          onRemove={() => removeRow(row.rowId)}
          onCancel={() => setEditing(null)}
        />
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="metadata-kv-grid__add"
        onClick={addRow}
      >
        <Plus className="h-3.5 w-3.5" />
        Add property
      </Button>
    </div>
  );
}

function AttributeRowEditor({
  row,
  editing,
  pendingFocusRef,
  onStartEdit,
  onCommit,
  onRemove,
  onCancel,
}: {
  row: AttributeRow;
  editing: EditingTarget;
  pendingFocusRef: React.MutableRefObject<"key" | "value" | null>;
  onStartEdit: (field: "key" | "value") => void;
  onCommit: (patch: Partial<AttributeRow>) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const isEditingKey = editing?.rowId === row.rowId && editing.field === "key";
  const isEditingValue = editing?.rowId === row.rowId && editing.field === "value";
  const [keyDraft, setKeyDraft] = useState(row.label);
  const [valueDraft, setValueDraft] = useState(row.value);

  useEffect(() => {
    setKeyDraft(row.label);
    setValueDraft(row.value);
  }, [row.label, row.value, row.rowId]);

  useEffect(() => {
    if (!isEditingKey && !isEditingValue) return;
    const focusField = pendingFocusRef.current ?? (isEditingKey ? "key" : "value");
    pendingFocusRef.current = null;
    const target = focusField === "key" ? keyInputRef.current : valueInputRef.current;
    requestAnimationFrame(() => {
      target?.focus();
      target?.select();
    });
  }, [isEditingKey, isEditingValue, pendingFocusRef]);

  const commitKey = () => {
    const nextKey = keyDraft.trim();
    if (!nextKey && !valueDraft.trim()) {
      onRemove();
      return;
    }
    onCommit({
      label: nextKey,
      storageKey: nextKey || row.storageKey,
    });
  };

  const commitValue = () => {
    onCommit({
      label: keyDraft.trim() || row.label,
      storageKey: keyDraft.trim() || row.storageKey,
      value: valueDraft,
    });
  };

  return (
    <div className="metadata-kv-grid__row group">
      <div className="metadata-kv-grid__cell metadata-kv-grid__cell--key">
        {isEditingKey ? (
          <input
            ref={keyInputRef}
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            onBlur={commitKey}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitKey();
                onStartEdit("value");
                pendingFocusRef.current = "value";
              }
              if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                commitKey();
                onStartEdit("value");
                pendingFocusRef.current = "value";
              }
              if (e.key === "Escape") onCancel();
            }}
            className="metadata-kv-grid__input"
            placeholder="Property name"
          />
        ) : (
          <button type="button" className="metadata-kv-grid__display" onClick={() => onStartEdit("key")}>
            {row.label.trim() || <span className="metadata-kv-grid__placeholder">Property name</span>}
          </button>
        )}
      </div>

      <div className="metadata-kv-grid__cell metadata-kv-grid__cell--value">
        {isEditingValue ? (
          <input
            ref={valueInputRef}
            value={valueDraft}
            onChange={(e) => setValueDraft(e.target.value)}
            onBlur={commitValue}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitValue();
              }
              if (e.key === "Escape") onCancel();
            }}
            className="metadata-kv-grid__input"
            placeholder="Value"
          />
        ) : (
          <button type="button" className="metadata-kv-grid__display" onClick={() => onStartEdit("value")}>
            {row.value.trim() || <span className="metadata-kv-grid__placeholder">Empty</span>}
          </button>
        )}
      </div>

      <button
        type="button"
        className="metadata-kv-grid__remove"
        onClick={onRemove}
        title="Remove property"
        aria-label="Remove property"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
