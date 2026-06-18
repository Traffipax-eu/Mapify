import { memo, useCallback, useState } from "react";
import { Position, useUpdateNodeInternals, type NodeProps } from "reactflow";
import { ChevronDown, ChevronRight, Minus, Plus, Settings, Trash2 } from "lucide-react";
import { resolveCustomObjectIcon } from "@/lib/customObjects";
import type { CustomObjectNodeData } from "@/lib/createCustomObjectNode";
import { formatFieldCellValue, getFieldTableColumns } from "@/lib/fieldMetadata";
import { getCustomObjectFieldProperties, getNodeGroupProperties } from "@/lib/schemaProperties";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";
import { SmartHoverAttributes } from "@/components/SmartHoverAttributes";
import { useNodeCanvas } from "@/contexts/NodeCanvasContext";
import { FieldRow } from "./SystemNode";
import { PlusHandle } from "./PlusHandle";

function CustomObjectNodeImpl({ id, data: rawData, selected }: NodeProps<CustomObjectNodeData>) {
  const data: CustomObjectNodeData = rawData ?? { objectId: "custom", label: "Object" };
  const { schema, onUpdateNodeData, onDeleteNode, onFieldSelect, onDeleteField, onFieldConnectDrop } =
    useNodeCanvas();
  const updateNodeInternals = useUpdateNodeInternals();
  const Icon = resolveCustomObjectIcon(data.iconId, data.objectId);
  const accent = data.accent ?? "#3b82f6";
  const fields = data.fields ?? [];
  const collapsed = !!data.collapsed;
  const tableExpanded = !!data.tableExpanded;

  const [editing, setEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(data.label);
  const [newField, setNewField] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const fieldProperties = getCustomObjectFieldProperties(schema, data.objectId);
  const nodeProperties = getNodeGroupProperties(schema);
  const tableColumns = getFieldTableColumns(schema, data.objectId, data.visibleColumns, "artifact");
  const tableGridStyle = {
    gridTemplateColumns: `minmax(100px, 1.2fr) ${tableColumns.map(() => "minmax(72px, 1fr)").join(" ")} 52px`,
  };

  const refreshNodeLayout = useCallback(() => {
    requestAnimationFrame(() => updateNodeInternals(id));
  }, [id, updateNodeInternals]);

  const stopPointer = (event: React.PointerEvent | React.MouseEvent) => {
    event.stopPropagation();
  };

  const update = (updater: (d: CustomObjectNodeData) => CustomObjectNodeData) => {
    onUpdateNodeData(id, (d) => updater(d as CustomObjectNodeData) as SystemNodeData);
  };

  const commitLabel = (nextLabel: string) => {
    const label = nextLabel.trim() || "Object";
    update((d) => ({ ...d, label }));
  };

  const addField = () => {
    const value = newField.trim();
    if (!value) return;
    update((d) => ({
      ...d,
      fields: [...(d.fields ?? []), { id: `f_${Date.now()}`, label: value }],
    }));
    setNewField("");
    refreshNodeLayout();
  };

  const toggleCollapse = (event: React.MouseEvent) => {
    event.stopPropagation();
    update((d) => ({ ...d, collapsed: !d.collapsed }));
    refreshNodeLayout();
  };

  const toggleTableExpanded = (event: React.MouseEvent) => {
    event.stopPropagation();
    update((d) => ({ ...d, tableExpanded: !d.tableExpanded }));
    refreshNodeLayout();
  };

  const renderFieldList = () => (
    <div className={tableExpanded ? "system-node__table" : "system-node__field-list"}>
      {tableExpanded && (
        <div className="system-node__table-header" style={tableGridStyle}>
          <div className="system-node__table-cell system-node__table-cell--name">Field</div>
          {tableColumns.map((column) => (
            <div
              key={column.id}
              className="system-node__table-cell system-node__table-cell--header"
              title={SCHEMA_SCOPE_LABELS.group.columnTooltip}
            >
              {column.name}
            </div>
          ))}
          <div className="system-node__table-cell system-node__table-cell--actions" />
        </div>
      )}

      {fields.map((field) => (
        <FieldRow
          key={field.id}
          nodeId={id}
          field={field}
          variant={tableExpanded ? "expanded" : "compact"}
          tableGridStyle={tableGridStyle}
          tableColumns={tableColumns}
          fieldProperties={fieldProperties}
          isActive={false}
          isFaded={false}
          onFieldSelect={onFieldSelect}
          onDeleteField={onDeleteField}
          onFieldConnectDrop={onFieldConnectDrop}
        />
      ))}
    </div>
  );

  return (
    <div
      className={`custom-object-node ${selected ? "custom-object-node--selected" : ""} ${
        collapsed ? "custom-object-node--collapsed" : ""
      } ${fields.length > 0 ? "custom-object-node--with-fields" : ""}`}
      style={{ "--object-accent": accent } as React.CSSProperties}
    >
      <PlusHandle type="target" position={Position.Left} variant="parent" id="parent-target" />
      <PlusHandle type="source" position={Position.Right} variant="parent" id="parent-source" />

      {showSettings && (
        <div className="custom-object-node__settings nodrag nopan nowheel" onPointerDown={stopPointer}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Asset settings
          </p>
          <label className="system-node__settings-field mt-2">
            <span>Asset type</span>
            <input value={data.objectId} readOnly className="system-node__settings-input" />
          </label>
        </div>
      )}

      <SmartHoverAttributes
        title={data.label}
        metadata={data.metadata}
        properties={nodeProperties}
        className="custom-object-node__header nodrag nopan"
      >
        <button
          type="button"
          onClick={toggleCollapse}
          className="custom-object-node__chevron nodrag nopan"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        <div className="custom-object-node__icon-wrap nodrag nopan" aria-hidden>
          <Icon className="custom-object-node__icon" />
        </div>

        <div className="custom-object-node__title-wrap min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value)}
              onBlur={() => {
                setEditing(false);
                commitLabel(labelDraft);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setLabelDraft(data.label);
                  setEditing(false);
                }
              }}
              className="custom-object-node__label-input nodrag nopan"
              onPointerDown={stopPointer}
            />
          ) : (
            <button
              type="button"
              className="custom-object-node__label nodrag nopan"
              onDoubleClick={() => {
                setLabelDraft(data.label);
                setEditing(true);
              }}
              onPointerDown={stopPointer}
              title="Double-click to rename"
            >
              {data.label}
            </button>
          )}
          {collapsed && fields.length > 0 && (
            <span className="custom-object-node__count">{fields.length}</span>
          )}
        </div>

        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={toggleTableExpanded}
          className="custom-object-node__tool-btn nodrag nopan"
          title={tableExpanded ? "Collapse field table" : "Expand field table"}
        >
          {tableExpanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={(event) => {
            event.stopPropagation();
            setShowSettings((value) => !value);
          }}
          className="custom-object-node__tool-btn nodrag nopan"
          title="Asset settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={(event) => {
            event.stopPropagation();
            onDeleteNode(id);
          }}
          className="custom-object-node__tool-btn custom-object-node__tool-btn--danger nodrag nopan"
          title="Delete object"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </SmartHoverAttributes>

      {!collapsed && (
        <div
          className={`custom-object-node__body nodrag nopan nowheel ${
            fields.length === 0 ? "custom-object-node__body--empty" : ""
          }`}
          onPointerDown={stopPointer}
        >
          {fields.length > 0 && renderFieldList()}

          <div className="system-node__add-row nodrag nopan nowheel" onPointerDown={stopPointer}>
            <input
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addField();
              }}
              placeholder="New field name"
              className="system-node__attr-input nodrag nopan nowheel"
              onPointerDown={stopPointer}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addField();
              }}
              className="system-node__add-btn nodrag nopan"
              title="Add field"
            >
              <Plus className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const CustomObjectNode = memo(CustomObjectNodeImpl);
