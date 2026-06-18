import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MetadataValues } from "@/lib/storage";
import type { ScopedProperty } from "@/lib/schemaProperties";
import {
  attributeRowsToMetadata,
  createEmptyAttributeRow,
  fixedPropertyRowsToMetadata,
  metadataToAttributeRows,
  metadataToFixedPropertyRows,
  type AttributeRow,
} from "@/lib/metadataAttributes";

type Props = {
  metadata: MetadataValues;
  properties?: ScopedProperty[];
  resetKey: string;
  lockPropertyKeys?: boolean;
  allowAddBlockAttributes?: boolean;
  onChange: (metadata: MetadataValues, propertyKeys?: string[]) => void;
};

type EditingTarget = { rowId: string; field: "key" | "value" } | null;

export function MetadataKeyValueGrid({
  metadata,
  properties = [],
  resetKey,
  lockPropertyKeys = false,
  allowAddBlockAttributes = false,
  onChange,
}: Props) {
  const safeProperties = Array.isArray(properties) ? properties : [];
  const useFixedRows = lockPropertyKeys && safeProperties.length > 0;
  const propertySignature = useMemo(
    () => safeProperties.map((property) => property.id).join("|"),
    [safeProperties],
  );

  const [rows, setRows] = useState<AttributeRow[]>(() =>
    useFixedRows
      ? metadataToFixedPropertyRows(metadata, safeProperties)
      : metadataToAttributeRows(metadata, safeProperties),
  );
  const [editing, setEditing] = useState<EditingTarget>(null);
  const pendingFocusRef = useRef<"key" | "value" | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    setRows(
      useFixedRows
        ? metadataToFixedPropertyRows(metadata, safeProperties)
        : metadataToAttributeRows(metadata, safeProperties),
    );
    setEditing(null);
    pendingFocusRef.current = null;
    // Only reset local row state when the sidebar selection changes, not on every metadata object reference change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!useFixedRows) return;
    if (editing) return;
    if (rowsRef.current.some((row) => !row.storageKey)) return;
    setRows(metadataToFixedPropertyRows(metadata, safeProperties));
  }, [propertySignature, useFixedRows, safeProperties, editing]);

  const isDraftBlockPropertyRow = useCallback(
    (row: AttributeRow) => useFixedRows && allowAddBlockAttributes && !row.storageKey,
    [allowAddBlockAttributes, useFixedRows],
  );

  const persistRows = useCallback(
    (nextRows: AttributeRow[], nextProperties: ScopedProperty[] = safeProperties) => {
      rowsRef.current = nextRows;
      setRows(nextRows);
      if (lockPropertyKeys && nextProperties.length > 0) {
        const { metadata: nextMetadata, propertyKeys } = fixedPropertyRowsToMetadata(
          nextRows,
          nextProperties,
        );
        onChange(nextMetadata, propertyKeys);
        return;
      }
      onChange(attributeRowsToMetadata(nextRows, nextProperties));
    },
    [lockPropertyKeys, onChange, safeProperties],
  );

  const commitRow = useCallback(
    (rowId: string, patch: Partial<AttributeRow>) => {
      const currentRow = rowsRef.current.find((row) => row.rowId === rowId);
      if (currentRow && isDraftBlockPropertyRow(currentRow)) {
        const name = (patch.label ?? currentRow.label).trim();
        if (!name) {
          const next = rowsRef.current.filter((row) => row.rowId !== rowId);
          rowsRef.current = next;
          setRows(next);
          setEditing(null);
          return;
        }

        if (safeProperties.some((property) => property.id === name || property.name === name)) {
          setEditing({ rowId, field: "key" });
          return;
        }

        const nextProperties = [
          ...safeProperties,
          { id: name, name, type: "text" as const, scope: "group" as const },
        ];
        const nextRows = rowsRef.current.map((row) =>
          row.rowId === rowId
            ? {
                rowId: name,
                storageKey: name,
                label: name,
                value: patch.value ?? row.value ?? "",
              }
            : row,
        );
        persistRows(nextRows, nextProperties);
        setEditing(null);
        return;
      }

      const next = rowsRef.current.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row));
      persistRows(next);
      setEditing(null);
    },
    [isDraftBlockPropertyRow, persistRows, safeProperties],
  );

  const removeRow = useCallback(
    (rowId: string) => {
      const currentRow = rowsRef.current.find((row) => row.rowId === rowId);
      if (currentRow && isDraftBlockPropertyRow(currentRow)) {
        const next = rowsRef.current.filter((row) => row.rowId !== rowId);
        rowsRef.current = next;
        setRows(next);
        setEditing(null);
        return;
      }

      if (useFixedRows) {
        const nextProperties = safeProperties.filter((property) => property.id !== rowId);
        const nextRows = rowsRef.current.filter((row) => row.rowId !== rowId);
        persistRows(nextRows, nextProperties);
      } else {
        const next = rowsRef.current.filter((row) => row.rowId !== rowId);
        persistRows(next);
      }
      setEditing(null);
    },
    [isDraftBlockPropertyRow, persistRows, safeProperties, useFixedRows],
  );

  const addRow = useCallback(() => {
    if (useFixedRows && allowAddBlockAttributes) {
      const row = createEmptyAttributeRow();
      pendingFocusRef.current = "key";
      const next = [...rowsRef.current, row];
      rowsRef.current = next;
      setRows(next);
      setEditing({ rowId: row.rowId, field: "key" });
      return;
    }

    const row = createEmptyAttributeRow();
    pendingFocusRef.current = "key";
    const next = [...rowsRef.current, row];
    rowsRef.current = next;
    setRows(next);
    setEditing({ rowId: row.rowId, field: "key" });
  }, [allowAddBlockAttributes, onChange, safeProperties, useFixedRows]);

  const showAddButton = !useFixedRows || allowAddBlockAttributes;

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
          keysLocked={useFixedRows && Boolean(row.storageKey)}
          isDraftBlockProperty={isDraftBlockPropertyRow(row)}
          allowRemove={!useFixedRows || allowAddBlockAttributes}
          onStartEdit={(field) => setEditing({ rowId: row.rowId, field })}
          onCommit={(patch) => commitRow(row.rowId, patch)}
          onRemove={() => removeRow(row.rowId)}
          onCancel={() => setEditing(null)}
        />
      ))}

      {showAddButton && (
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
      )}
    </div>
  );
}

function AttributeRowEditor({
  row,
  editing,
  pendingFocusRef,
  keysLocked,
  isDraftBlockProperty,
  allowRemove,
  onStartEdit,
  onCommit,
  onRemove,
  onCancel,
}: {
  row: AttributeRow;
  editing: EditingTarget;
  pendingFocusRef: React.MutableRefObject<"key" | "value" | null>;
  keysLocked: boolean;
  isDraftBlockProperty: boolean;
  allowRemove: boolean;
  onStartEdit: (field: "key" | "value") => void;
  onCommit: (patch: Partial<AttributeRow>) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const isEditingKey = !keysLocked && editing?.rowId === row.rowId && editing.field === "key";
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
    if (isDraftBlockProperty) return;
  };

  const commitValue = () => {
    onCommit({
      label: keysLocked ? row.label : keyDraft.trim() || row.label,
      storageKey: row.storageKey,
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
                if (!isDraftBlockProperty) {
                  onStartEdit("value");
                  pendingFocusRef.current = "value";
                }
              }
              if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                commitKey();
                if (!isDraftBlockProperty) {
                  onStartEdit("value");
                  pendingFocusRef.current = "value";
                }
              }
              if (e.key === "Escape") onCancel();
            }}
            className="metadata-kv-grid__input"
            placeholder="Property name"
          />
        ) : keysLocked ? (
          <span className="metadata-kv-grid__display metadata-kv-grid__display--locked">
            {row.label.trim() || <span className="metadata-kv-grid__placeholder">Attribute</span>}
          </span>
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

      {allowRemove && (
        <button
          type="button"
          className="metadata-kv-grid__remove"
          onClick={onRemove}
          title="Remove property"
          aria-label="Remove property"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
