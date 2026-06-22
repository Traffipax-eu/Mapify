import { useCallback, useRef, useState, type ReactNode } from "react";
import { Position } from "reactflow";
import { Pencil, Trash2 } from "lucide-react";
import type { Field } from "@/components/nodes/SystemNode";
import { SmartHoverAttributes } from "@/components/SmartHoverAttributes";
import { PlusHandle } from "@/components/nodes/PlusHandle";
import {
  formatFieldCellValue,
  getFieldCellEditValue,
  type FieldTableColumn,
} from "@/lib/fieldMetadata";
import type { ScopedProperty } from "@/lib/schemaProperties";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";
import {
  beginFieldConnectionDrag,
  commitFieldConnectionDrag,
  FIELD_CONNECTION_MIME,
  finishFieldConnectionDrag,
  getActiveFieldConnectionSource,
  isFieldConnectionDragActive,
  parseFieldConnectionDrag,
  serializeFieldConnectionDrag,
  trackFieldConnectionHoverTarget,
  tryCommitFieldConnectionDragEnd,
} from "@/lib/fieldConnectionDnD";
import {
  FIELD_REORDER_MIME,
  parseFieldReorder,
  serializeFieldReorder,
} from "@/lib/fieldReorderDnD";
import {
  buildTablePastePlan,
  parseTabularClipboard,
  type TableCellAddress,
  type TableColumnKey,
  type TablePasteMode,
} from "@/lib/tableClipboard";
import { TableExcelImportBar } from "@/components/nodes/TableExcelImportBar";
import { toast } from "sonner";

type EditingCell = TableCellAddress;

type Props = {
  nodeId: string;
  sectionId: string;
  groupId?: string;
  fields: Field[];
  columns: FieldTableColumn[];
  fieldProperties: ScopedProperty[];
  fullTableGridStyle: React.CSSProperties;
  activeFieldIds: Set<string>;
  fieldLineageActive: boolean;
  onFieldSelect: (nodeId: string, fieldId: string) => void;
  onDeleteField: (nodeId: string, fieldId: string) => void;
  onFieldReorder: (sourceFieldId: string, targetFieldId: string) => void;
  onFieldConnectDrop: (
    source: { nodeId: string; fieldId: string },
    target: { nodeId: string; fieldId: string },
  ) => void;
  onUpdateFieldLabel: (nodeId: string, fieldId: string, label: string) => void;
  onUpdateFieldCell: (nodeId: string, fieldId: string, columnId: string, value: string) => void;
  onApplyTablePaste: (
    nodeId: string,
    sectionId: string,
    groupId: string | undefined,
    plan: ReturnType<typeof buildTablePastePlan>,
  ) => void;
};

function stopBubble(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function FieldConnectionHandle({
  nodeId,
  fieldId,
  side,
  type,
}: {
  nodeId: string;
  fieldId: string;
  side: "left" | "right";
  type: "source" | "target";
}) {
  const handleId =
    type === "source" ? `field-src-${nodeId}-${fieldId}` : `field-tgt-${nodeId}-${fieldId}`;

  return (
    <PlusHandle
      type={type}
      position={side === "left" ? Position.Left : Position.Right}
      id={handleId}
      variant="field"
      className={`field-handle field-handle--${side} opacity-0`}
    />
  );
}

function EditableTableRow({
  nodeId,
  field,
  fullTableGridStyle,
  rowStateClass,
  children,
  onFieldSelect,
  onFieldReorder,
  onFieldConnectDrop,
}: {
  nodeId: string;
  field: Field;
  fullTableGridStyle: React.CSSProperties;
  rowStateClass: string;
  children: ReactNode;
  onFieldSelect: (nodeId: string, fieldId: string) => void;
  onFieldReorder: (sourceFieldId: string, targetFieldId: string) => void;
  onFieldConnectDrop: (
    source: { nodeId: string; fieldId: string },
    target: { nodeId: string; fieldId: string },
  ) => void;
}) {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [isConnectTarget, setIsConnectTarget] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartedRef = useRef(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragStartedRef.current) return;
    if ((e.target as HTMLElement).closest(".system-node__table-cell-button, .system-node__table-cell-input")) {
      return;
    }
    onFieldSelect(nodeId, field.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".react-flow__handle") ||
      target.closest(".system-node__table-cell-button") ||
      target.closest(".system-node__table-cell-input")
    ) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    dragStartedRef.current = true;
    setIsDragging(true);

    if (e.altKey) {
      e.dataTransfer.setData(
        FIELD_REORDER_MIME,
        serializeFieldReorder({ kind: "field-reorder", nodeId, fieldId: field.id }),
      );
      e.dataTransfer.effectAllowed = "move";
    } else {
      beginFieldConnectionDrag({
        kind: "field-connection",
        sourceNodeId: nodeId,
        sourceFieldId: field.id,
      });
      e.dataTransfer.setData(
        FIELD_CONNECTION_MIME,
        serializeFieldConnectionDrag({
          kind: "field-connection",
          sourceNodeId: nodeId,
          sourceFieldId: field.id,
        }),
      );
      e.dataTransfer.effectAllowed = "copy";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    setIsDropTarget(false);
    setIsConnectTarget(false);
    if (isFieldConnectionDragActive()) {
      tryCommitFieldConnectionDragEnd(e.clientX, e.clientY, onFieldConnectDrop);
      finishFieldConnectionDrag();
    }
    window.setTimeout(() => {
      dragStartedRef.current = false;
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(FIELD_CONNECTION_MIME)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      trackFieldConnectionHoverTarget({ nodeId, fieldId: field.id });
      setIsConnectTarget(true);
      setIsDropTarget(false);
      return;
    }
    if (e.dataTransfer.types.includes(FIELD_REORDER_MIME)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setIsDropTarget(true);
      setIsConnectTarget(false);
    }
  };

  const rowClass = `${rowStateClass} ${isDragging ? "is-dragging" : ""} ${
    isDropTarget ? "is-drop-target" : ""
  } ${isConnectTarget ? "is-connect-target" : ""}`;

  return (
    <div
      className={`system-node__table-row nodrag nopan ${rowClass}`}
      data-field-row-id={field.id}
    >
      <div
        className="system-node__field-row-outer system-node__field-row-outer--table nodrag nopan"
        style={fullTableGridStyle}
        onDragOver={handleDragOver}
        onDragLeave={() => {
          setIsDropTarget(false);
          setIsConnectTarget(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDropTarget(false);
          setIsConnectTarget(false);
          setIsDragging(false);

          if (e.dataTransfer.types.includes(FIELD_CONNECTION_MIME)) {
            let source = parseFieldConnectionDrag(e.dataTransfer.getData(FIELD_CONNECTION_MIME));
            if (!source) source = getActiveFieldConnectionSource();
            if (!source) return;
            if (source.sourceNodeId === nodeId && source.sourceFieldId === field.id) return;
            commitFieldConnectionDrag();
            onFieldConnectDrop(
              { nodeId: source.sourceNodeId, fieldId: source.sourceFieldId },
              { nodeId, fieldId: field.id },
            );
            return;
          }

          if (e.dataTransfer.types.includes(FIELD_REORDER_MIME)) {
            const source = parseFieldReorder(e.dataTransfer.getData(FIELD_REORDER_MIME));
            if (!source || source.nodeId !== nodeId || source.fieldId === field.id) return;
            onFieldReorder(source.fieldId, field.id);
          }
        }}
        draggable
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
      >
        <div className="system-node__field-handle-col system-node__field-handle-col--left nodrag nopan pointer-events-auto">
          <FieldConnectionHandle nodeId={nodeId} fieldId={field.id} side="left" type="target" />
        </div>
        {children}
        <div className="system-node__field-handle-col system-node__field-handle-col--right nodrag nopan pointer-events-auto">
          <FieldConnectionHandle nodeId={nodeId} fieldId={field.id} side="right" type="source" />
        </div>
      </div>
    </div>
  );
}

export function EditableFieldTable({
  nodeId,
  sectionId,
  groupId,
  fields,
  columns,
  fieldProperties,
  fullTableGridStyle,
  activeFieldIds,
  fieldLineageActive,
  onFieldSelect,
  onDeleteField,
  onFieldReorder,
  onFieldConnectDrop,
  onUpdateFieldLabel,
  onUpdateFieldCell,
  onApplyTablePaste,
}: Props) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [draft, setDraft] = useState("");
  const [anchorCell, setAnchorCell] = useState<EditingCell>({ fieldIndex: 0, columnKey: "label" });

  const startEditing = useCallback((fieldIndex: number, columnKey: TableColumnKey, initialValue: string) => {
    setAnchorCell({ fieldIndex, columnKey });
    setEditingCell({ fieldIndex, columnKey });
    setDraft(initialValue);
  }, []);

  const commitEditing = useCallback(() => {
    if (!editingCell) return;
    const field = fields[editingCell.fieldIndex];
    if (!field) {
      setEditingCell(null);
      return;
    }

    const nextValue = draft.trim();
    if (editingCell.columnKey === "label") {
      if (nextValue && nextValue !== field.label) {
        onUpdateFieldLabel(nodeId, field.id, nextValue);
      }
    } else if (nextValue !== getFieldCellEditValue(field.metadata, editingCell.columnKey, fieldProperties)) {
      onUpdateFieldCell(nodeId, field.id, editingCell.columnKey, nextValue);
    }
    setEditingCell(null);
  }, [draft, editingCell, fieldProperties, fields, nodeId, onUpdateFieldCell, onUpdateFieldLabel]);

  const cancelEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const applyClipboardGrid = useCallback(
    (grid: string[][], mode: TablePasteMode) => {
      if (grid.length === 0) return;
      const plan = buildTablePastePlan(grid, fields, columns, anchorCell, mode);
      if (plan.updates.length === 0 && plan.newFields.length === 0) return;
      onApplyTablePaste(nodeId, sectionId, groupId, plan);
      setEditingCell(null);
    },
    [anchorCell, columns, fields, groupId, nodeId, onApplyTablePaste, sectionId],
  );

  const pasteFromClipboard = useCallback(
    async (merge = false) => {
      try {
        const text = await navigator.clipboard.readText();
        const grid = parseTabularClipboard(text);
        if (grid.length === 0) {
          toast.error("Clipboard is empty. Copy rows from Excel first.");
          return;
        }
        applyClipboardGrid(grid, merge ? "merge" : "append");
      } catch {
        toast.error("Could not read clipboard. Copy from Excel, then try again.");
      }
    },
    [applyClipboardGrid],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const text = event.clipboardData.getData("text/plain");
      const grid = parseTabularClipboard(text);
      if (grid.length === 0) return;

      event.preventDefault();
      event.stopPropagation();

      const mode = event.shiftKey ? "merge" : "append";
      applyClipboardGrid(grid, mode);
    },
    [applyClipboardGrid],
  );

  const renderCell = (field: Field, fieldIndex: number, columnKey: TableColumnKey) => {
    const isEditing =
      editingCell?.fieldIndex === fieldIndex && editingCell.columnKey === columnKey;
    const displayValue =
      columnKey === "label"
        ? field.label
        : formatFieldCellValue(field.metadata, columnKey, fieldProperties);
    const editValue =
      columnKey === "label"
        ? field.label
        : getFieldCellEditValue(field.metadata, columnKey, fieldProperties);

    if (isEditing) {
      return (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEditing}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEditing();
            if (e.key === "Escape") cancelEditing();
          }}
          className="system-node__table-cell-input nodrag nopan nowheel"
          onPointerDown={stopBubble}
          onMouseDown={stopBubble}
          onClick={stopBubble}
        />
      );
    }

    return (
      <button
        type="button"
        className="system-node__table-cell-button nodrag nopan"
        onPointerDown={stopBubble}
        onMouseDown={stopBubble}
        onClick={(e) => {
          stopBubble(e);
          setAnchorCell({ fieldIndex, columnKey });
          startEditing(fieldIndex, columnKey, editValue);
        }}
        title="Click to edit. Ctrl+V pastes rows as new fields. Shift+Ctrl+V merges into existing rows."
      >
        {displayValue || "—"}
      </button>
    );
  };

  if (fields.length === 0) {
    return (
      <div
        className="system-node__table system-node__table--editable nodrag nopan"
        tabIndex={0}
        onPaste={handlePaste}
        onFocus={() => setAnchorCell({ fieldIndex: 0, columnKey: "label" })}
      >
        <TableExcelImportBar onPasteFromExcel={() => pasteFromClipboard(false)} />
      </div>
    );
  }

  return (
    <div
      className="system-node__table system-node__table--editable nodrag nopan"
      tabIndex={0}
      onPaste={handlePaste}
      onPointerDown={stopBubble}
    >
      <TableExcelImportBar
        onPasteFromExcel={() => pasteFromClipboard(false)}
        onPasteMerge={() => pasteFromClipboard(true)}
      />
      <div
        className="system-node__field-row-outer system-node__field-row-outer--table system-node__table-header-row"
        style={fullTableGridStyle}
      >
        <div className="system-node__field-handle-col system-node__field-handle-col--spacer" aria-hidden />
        <div className="system-node__table-cell system-node__table-cell--name system-node__table-cell--header">
          Field
        </div>
        {columns.map((column) => (
          <div
            key={column.id}
            className="system-node__table-cell system-node__table-cell--header"
            title={SCHEMA_SCOPE_LABELS.group.columnTooltip}
          >
            {column.name}
          </div>
        ))}
        <div className="system-node__table-cell system-node__table-cell--actions system-node__table-cell--header" />
        <div className="system-node__field-handle-col system-node__field-handle-col--spacer" aria-hidden />
      </div>

      {columns.length === 0 && (
        <p className="system-node__table-empty-hint nodrag nopan">
          Add field attributes in the schema editor to show columns here.
        </p>
      )}

      {fields.map((field, fieldIndex) => {
        const isActive = activeFieldIds.has(field.id);
        const isFaded = fieldLineageActive && !isActive;
        const rowStateClass = `${isActive ? "is-active" : ""} ${isFaded ? "is-faded" : ""}`;

        return (
          <SmartHoverAttributes
            key={field.id}
            title={field.label}
            metadata={field.metadata}
            properties={fieldProperties}
            className="contents"
          >
            <EditableTableRow
              nodeId={nodeId}
              field={field}
              fullTableGridStyle={fullTableGridStyle}
              rowStateClass={rowStateClass}
              onFieldSelect={onFieldSelect}
              onFieldReorder={onFieldReorder}
              onFieldConnectDrop={onFieldConnectDrop}
            >
              <div className="system-node__table-cell system-node__table-cell--name">
                {renderCell(field, fieldIndex, "label")}
              </div>
              {columns.map((column) => (
                <div key={`${field.id}-${column.id}`} className="system-node__table-cell">
                  {renderCell(field, fieldIndex, column.id)}
                </div>
              ))}
              <div className="system-node__table-cell system-node__table-cell--actions nodrag nopan">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFieldSelect(nodeId, field.id);
                  }}
                  className="system-node__icon-btn system-node__icon-btn--static"
                  title="Edit in sidebar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteField(nodeId, field.id);
                  }}
                  className="system-node__icon-btn system-node__icon-btn--static"
                  title="Delete field"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </EditableTableRow>
          </SmartHoverAttributes>
        );
      })}
    </div>
  );
}
