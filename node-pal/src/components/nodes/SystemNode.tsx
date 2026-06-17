import { memo, useMemo, useRef, useState, useCallback } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "reactflow";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Minus,
  Pencil,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import type { MetadataValues } from "@/lib/storage";
import { useLineage } from "@/contexts/LineageContext";
import { useNodeCanvas } from "@/contexts/NodeCanvasContext";
import { formatFieldCellValue, getFieldTableColumns } from "@/lib/fieldMetadata";
import { getNodeGroupProperties, getFieldProperties } from "@/lib/schemaProperties";
import {
  createSection,
  DEFAULT_SECTION_ID,
  getEffectiveSections,
  getFieldsForSection,
  getRenderableSections,
  hasExplicitSections,
  shouldShowSectionSelect,
} from "@/lib/nodeSections";
import { getNodeIcon, NODE_ICON_OPTIONS, type NodeIconId } from "@/lib/nodeIcons";
import { getContrastTextColor, softenAccentColor } from "@/lib/colorContrast";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";
import {
  FIELD_CONNECTION_MIME,
  parseFieldConnectionDrag,
  serializeFieldConnectionDrag,
} from "@/lib/fieldConnectionDnD";
import { SmartHoverAttributes } from "@/components/SmartHoverAttributes";
import { PlusHandle } from "./PlusHandle";

export type Field = {
  id: string;
  label: string;
  fieldTypeId?: string;
  sectionId?: string;
  metadata?: MetadataValues;
};

export type FieldSection = {
  id: string;
  name: string;
};

export type SystemNodeData = {
  label: string;
  nodeGroupId?: string;
  icon?: string;
  color?: string;
  sections?: FieldSection[];
  fields?: Field[];
  collapsed?: boolean;
  tableExpanded?: boolean;
  metadata?: MetadataValues;
  visibleColumns?: string[];
};

function SystemNodeImpl({ id, data: rawData, selected }: NodeProps<SystemNodeData>) {
  const data: SystemNodeData = rawData ?? { label: "System" };
  const { schema, onUpdateNodeData, onDeleteNode, onFieldSelect, onDeleteField, onFieldConnectDrop } =
    useNodeCanvas();
  const updateNodeInternals = useUpdateNodeInternals();
  const { hasLineage, lineageNodeIds, activeFieldIdsByNode, impactNodeIds, anchorNodeId, highlightedNodeIds } =
    useLineage();

  const fields = data.fields ?? [];
  const sections = useMemo(() => getEffectiveSections(data), [data.sections]);
  const renderableSections = useMemo(() => getRenderableSections(data, fields), [data, fields]);
  const showSectionSelect = useMemo(() => shouldShowSectionSelect(data), [data]);
  const collapsed = !!data.collapsed;
  const tableExpanded = !!data.tableExpanded;
  const faded = hasLineage && !lineageNodeIds.has(id);
  const inLineage = lineageNodeIds.has(id);
  const isHighlighted = highlightedNodeIds.has(id);
  const isAnchor = anchorNodeId === id;
  const hasImpact = impactNodeIds.has(id);
  const fieldLineageActive = hasLineage;
  const activeFieldIds = activeFieldIdsByNode.get(id) ?? new Set<string>();
  const tableColumns = getFieldTableColumns(schema, data.nodeGroupId, data.visibleColumns);
  const nodeGroupProperties = getNodeGroupProperties(schema);
  const fieldProperties = getFieldProperties(schema, data.nodeGroupId);

  const [showSettings, setShowSettings] = useState(false);
  const [newField, setNewField] = useState("");
  const [addFieldSectionId, setAddFieldSectionId] = useState(sections[0]?.id ?? DEFAULT_SECTION_ID);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionNameDraft, setSectionNameDraft] = useState("");

  const refreshNodeLayout = useCallback(() => {
    requestAnimationFrame(() => updateNodeInternals(id));
  }, [id, updateNodeInternals]);

  const accentColor = softenAccentColor(
    data.color ||
      schema?.nodeGroups?.find((group) => group?.id === data.nodeGroupId)?.color ||
      "#5b8fd9",
  );
  const headerTextColor = getContrastTextColor(accentColor);
  const HeaderIcon = getNodeIcon(data.icon);

  const update = (updater: (d: SystemNodeData) => SystemNodeData) => {
    onUpdateNodeData(id, updater);
  };

  const stopPointer = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    update((d) => ({ ...d, collapsed: !d.collapsed }));
    refreshNodeLayout();
  };

  const toggleTableExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    update((d) => ({ ...d, tableExpanded: !d.tableExpanded }));
    refreshNodeLayout();
  };

  const ensureSectionsPersisted = (d: SystemNodeData): SystemNodeData => {
    if (d.sections?.length) return d;
    return { ...d, sections: getEffectiveSections(d) };
  };

  const addField = () => {
    const value = newField.trim();
    if (!value) return;
    const targetSection = addFieldSectionId || sections[0]?.id || DEFAULT_SECTION_ID;

    update((d) => {
      const next = ensureSectionsPersisted(d);
      return {
        ...next,
        fields: [
          ...(next.fields ?? []),
          {
            id: `f_${Date.now()}`,
            label: value,
            sectionId: targetSection,
          },
        ],
      };
    });
    setNewField("");
  };

  const addSection = () => {
    const section = createSection("New Section");
    update((d) => {
      const next = ensureSectionsPersisted(d);
      return {
        ...next,
        sections: [...(next.sections ?? getEffectiveSections(next)), section],
      };
    });
    setAddFieldSectionId(section.id);
  };

  const commitSectionName = (sectionId: string) => {
    const nextName = sectionNameDraft.trim();
    if (!nextName) {
      setEditingSectionId(null);
      return;
    }
    update((d) => ({
      ...d,
      sections: (d.sections ?? getEffectiveSections(d)).map((section) =>
        section.id === sectionId ? { ...section, name: nextName } : section,
      ),
    }));
    setEditingSectionId(null);
  };

  const deleteSection = (sectionId: string) => {
    const sectionFields = getFieldsForSection(fields, sectionId);
    if (sectionFields.length > 0) return;

    update((d) => {
      const currentSections = d.sections ?? getEffectiveSections(d);
      if (currentSections.length <= 1) return d;
      const nextSections = currentSections.filter((section) => section.id !== sectionId);
      return { ...d, sections: nextSections };
    });

    if (addFieldSectionId === sectionId) {
      setAddFieldSectionId(sections.find((s) => s.id !== sectionId)?.id ?? DEFAULT_SECTION_ID);
    }
  };

  const updateNodeColor = (color: string) => {
    update((d) => ({ ...d, color }));
  };

  const updateNodeIcon = (icon: NodeIconId) => {
    update((d) => ({ ...d, icon }));
  };

  const tableGridStyle = {
    gridTemplateColumns: `minmax(100px, 1.2fr) ${tableColumns.map(() => "minmax(72px, 1fr)").join(" ")} 52px`,
  };

  const explicitSections = hasExplicitSections(data);
  const headerSections = renderableSections.filter((section) => section.showHeader);

  const renderFieldList = (sectionFields: Field[]) => (
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

      {sectionFields.map((field) => (
        <FieldRow
          key={field.id}
          nodeId={id}
          field={field}
          variant={tableExpanded ? "expanded" : "compact"}
          tableGridStyle={tableGridStyle}
          tableColumns={tableColumns}
          fieldProperties={fieldProperties}
          isActive={activeFieldIds.has(field.id)}
          isFaded={fieldLineageActive && !activeFieldIds.has(field.id)}
          onFieldSelect={onFieldSelect}
          onDeleteField={onDeleteField}
          onFieldConnectDrop={onFieldConnectDrop}
        />
      ))}
    </div>
  );

  return (
    <div
      className={`system-node ${selected ? "system-node--selected" : ""} ${
        collapsed ? "system-node--collapsed" : ""
      } ${faded ? "system-node--faded" : ""} ${inLineage ? "system-node--lineage" : ""} ${
        isHighlighted ? "system-node--highlighted" : ""
      } ${isAnchor ? "system-node--anchor" : ""} ${hasImpact ? "system-node--impact" : ""}`}
    >
      {showSettings && (
        <div className="system-node__settings-panel nodrag nopan nowheel" onPointerDown={stopPointer}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Node settings</span>
            <button type="button" onClick={() => setShowSettings(false)} className="system-node__icon-btn system-node__icon-btn--static nodrag nopan">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 space-y-3">
            <label className="system-node__settings-field">
              <span>Icon</span>
              <div className="system-node__icon-grid">
                {NODE_ICON_OPTIONS.map(({ id: iconId, label, Icon }) => (
                  <button
                    key={iconId}
                    type="button"
                    title={label}
                    onClick={() => updateNodeIcon(iconId)}
                    className={`system-node__icon-pick nodrag nopan ${
                      (data.icon || "database") === iconId ? "is-selected" : ""
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </label>
            <label className="system-node__settings-field">
              <span>Accent</span>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => updateNodeColor(e.target.value)}
                className="h-8 w-full rounded border nodrag nopan"
              />
            </label>
            <label className="system-node__settings-field">
              <span>Group</span>
              <input value={data.nodeGroupId || ""} readOnly className="system-node__settings-input" />
            </label>
          </div>
        </div>
      )}

      <SmartHoverAttributes
        title={data.label ?? "System"}
        metadata={data.metadata}
        properties={nodeGroupProperties}
        className={`system-node__header system-node__header--accent ${collapsed ? "system-node__header--collapsed" : ""}`}
        style={
          {
            ["--header-bg" as string]: accentColor,
            color: headerTextColor,
            "--header-fg": headerTextColor,
            "--header-fg-muted": headerTextColor === "#ffffff" ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.65)",
            "--header-hover": headerTextColor === "#ffffff" ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.08)",
          } as React.CSSProperties
        }
      >
        <PlusHandle
          type="target"
          position={Position.Left}
          id="parent-target"
          variant="parent"
          className="system-node__parent-handle system-node__parent-handle--target"
        />
        <PlusHandle
          type="source"
          position={Position.Right}
          id="parent-source"
          variant="parent"
          className="system-node__parent-handle system-node__parent-handle--source"
        />

        <button
          type="button"
          onClick={toggleCollapse}
          className="system-node__chevron nodrag nopan"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <span className="system-node__header-icon nodrag nopan">
          <HeaderIcon className="h-4 w-4" />
        </span>
        <div className="system-node__header-content">
          <span className="system-node__title">{data.label ?? "System"}</span>
          {collapsed && fields.length > 0 && <span className="system-node__count">{fields.length}</span>}
        </div>
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={toggleTableExpanded}
          className="system-node__table-toggle nodrag nopan"
          title={tableExpanded ? "Collapse field table" : "Expand field table"}
        >
          {tableExpanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings((value) => !value);
          }}
          className="system-node__settings-btn nodrag nopan"
          title="Node settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteNode(id);
          }}
          className="system-node__delete-btn nodrag nopan"
          title="Delete node"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </SmartHoverAttributes>

      {!collapsed && (
        <div
          className={`system-node__body nodrag nopan nowheel ${fields.length === 0 ? "system-node__body--empty" : ""}`}
          onPointerDown={stopPointer}
        >
          <div className="system-node__sections">
            {!explicitSections && fields.length > 0 && renderFieldList(fields)}

            {headerSections.map((section) => {
              const sectionFields = getFieldsForSection(fields, section.id);
              if (sectionFields.length === 0) return null;
              const isEditingSection = editingSectionId === section.id;

              return (
                <div key={section.id} className="system-node__section">
                  <div className="system-node__section-header">
                    {isEditingSection ? (
                      <input
                        autoFocus
                        value={sectionNameDraft}
                        onChange={(e) => setSectionNameDraft(e.target.value)}
                        onBlur={() => commitSectionName(section.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitSectionName(section.id);
                          if (e.key === "Escape") setEditingSectionId(null);
                        }}
                        className="system-node__section-title-input nodrag nopan nowheel"
                      />
                    ) : (
                      <button
                        type="button"
                        className="system-node__section-title nodrag nopan"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setSectionNameDraft(section.name);
                          setEditingSectionId(section.id);
                        }}
                        title="Double-click to rename section"
                      >
                        {section.name}
                      </button>
                    )}
                    {sections.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSection(section.id);
                        }}
                        className="system-node__section-delete nodrag nopan"
                        title="Remove section"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {renderFieldList(sectionFields)}
                </div>
              );
            })}
          </div>

          <div
            className="system-node__add-row nodrag nopan nowheel"
            onPointerDown={stopPointer}
            onMouseDown={stopPointer}
            onClick={stopPointer}
          >
            {showSectionSelect && (
            <select
              value={addFieldSectionId}
              onChange={(e) => setAddFieldSectionId(e.target.value)}
              className="system-node__section-select nodrag nopan"
              title="Target section"
              onPointerDown={stopPointer}
              onMouseDown={stopPointer}
              onClick={stopPointer}
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
            )}
            <input
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addField();
              }}
              placeholder="New field name"
              className="system-node__attr-input nodrag nopan nowheel"
              onPointerDown={stopPointer}
              onMouseDown={stopPointer}
              onClick={stopPointer}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addField();
              }}
              className="system-node__add-btn nodrag nopan"
              title="Add field to section"
            >
              <Plus className="h-4 w-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addSection();
              }}
              className="system-node__section-add-btn nodrag nopan"
              title="Add section"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type FieldRowProps = {
  nodeId: string;
  field: Field;
  variant: "compact" | "expanded";
  tableGridStyle: React.CSSProperties;
  tableColumns: ReturnType<typeof getFieldTableColumns>;
  fieldProperties: ReturnType<typeof getFieldProperties>;
  isActive: boolean;
  isFaded: boolean;
  onFieldSelect: (nodeId: string, fieldId: string) => void;
  onDeleteField: (nodeId: string, fieldId: string) => void;
  onFieldConnectDrop: (
    source: { nodeId: string; fieldId: string },
    target: { nodeId: string; fieldId: string },
  ) => void;
};

function FieldConnectionAnchors({ fieldId }: { fieldId: string }) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        id={`target-${fieldId}`}
        isConnectable={false}
        className="field-connection-anchor field-connection-anchor--left"
      />
      <Handle
        type="source"
        position={Position.Right}
        id={`source-${fieldId}`}
        isConnectable={false}
        className="field-connection-anchor field-connection-anchor--right"
      />
    </>
  );
}

function FieldRow({
  nodeId,
  field,
  variant,
  tableGridStyle,
  tableColumns,
  fieldProperties,
  isActive,
  isFaded,
  onFieldSelect,
  onDeleteField,
  onFieldConnectDrop,
}: FieldRowProps) {
  const dragStartedRef = useRef(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    dragStartedRef.current = true;
    e.dataTransfer.setData(
      FIELD_CONNECTION_MIME,
      serializeFieldConnectionDrag({
        kind: "field-connection",
        sourceNodeId: nodeId,
        sourceFieldId: field.id,
      }),
    );
    e.dataTransfer.effectAllowed = "link";

    const ghost = document.createElement("div");
    ghost.className = "field-drag-ghost";
    ghost.textContent = field.label;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 12, 16);
    window.setTimeout(() => ghost.remove(), 0);
  };

  const handleDragEnd = () => {
    window.setTimeout(() => {
      dragStartedRef.current = false;
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "link";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const source = parseFieldConnectionDrag(e.dataTransfer.getData(FIELD_CONNECTION_MIME));
    if (!source) return;
    onFieldConnectDrop(
      { nodeId: source.sourceNodeId, fieldId: source.sourceFieldId },
      { nodeId, fieldId: field.id },
    );
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragStartedRef.current) return;
    onFieldSelect(nodeId, field.id);
  };

  if (variant === "compact") {
    return (
      <SmartHoverAttributes
        title={field.label}
        metadata={field.metadata}
        properties={fieldProperties}
        className={`system-node__field-list-item relative ${isActive ? "is-active" : ""} ${
          isFaded ? "is-faded" : ""
        }`}
      >
      <div
        className="system-node__field-list-item-inner"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <FieldConnectionAnchors fieldId={field.id} />
        <span className="system-node__field-name">{field.label}</span>
      </div>
      </SmartHoverAttributes>
    );
  }

  return (
    <SmartHoverAttributes
      title={field.label}
      metadata={field.metadata}
      properties={fieldProperties}
      className={`system-node__table-row relative ${isActive ? "is-active" : ""} ${isFaded ? "is-faded" : ""}`}
    >
    <div
      className="system-node__table-row-inner"
      style={tableGridStyle}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <FieldConnectionAnchors fieldId={field.id} />
      <div className="system-node__table-cell system-node__table-cell--name">
        <span className="system-node__field-name">{field.label}</span>
      </div>
      {tableColumns.map((column) => (
        <div
          key={`${field.id}-${column.id}`}
          className="system-node__table-cell"
        >
          {formatFieldCellValue(field.metadata, column.id, fieldProperties)}
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
    </div>
    </SmartHoverAttributes>
  );
}

export const SystemNode = memo(SystemNodeImpl);
