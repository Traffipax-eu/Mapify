import { memo, useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Position, useUpdateNodeInternals, type NodeProps } from "reactflow";
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
import {
  attributeDefinitionsToTableColumns,
  formatFieldCellValue,
  getBlockAttributeDefinitions,
  getFieldAttributeDefinitions,
} from "@/lib/fieldMetadata";
import { BlockInternalFieldLinks } from "@/components/nodes/BlockInternalFieldLinks";
import {
  createSection,
  DEFAULT_SECTION_ID,
  deleteSectionFromNode,
  ensureExplicitSections,
  getEffectiveSections,
  getFieldSectionId,
  getFieldsForSection,
  getRenderableSections,
  moveFieldToSection,
  reorderFieldsInList,
} from "@/lib/nodeSections";
import { getNodeIcon, NODE_ICON_OPTIONS, type NodeIconId } from "@/lib/nodeIcons";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";
import { BRAND } from "@/lib/brand";
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
  /** Shared field attribute keys for this block when no schema properties exist. */
  fieldAttributeKeys?: string[];
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
  const collapsed = !!data.collapsed;
  const tableExpanded = !!data.tableExpanded;
  const faded = hasLineage && !lineageNodeIds.has(id);
  const inLineage = lineageNodeIds.has(id);
  const isHighlighted = highlightedNodeIds.has(id);
  const isAnchor = anchorNodeId === id;
  const hasImpact = impactNodeIds.has(id);
  const fieldLineageActive = hasLineage;
  const activeFieldIds = activeFieldIdsByNode.get(id) ?? new Set<string>();
  const blockAttributeDefinitions = useMemo(
    () =>
      getBlockAttributeDefinitions(
        schema,
        {
          nodeGroupId: data.nodeGroupId,
          fieldAttributeKeys: data.fieldAttributeKeys,
          blockMetadata: data.metadata,
        },
      ),
    [schema, data.nodeGroupId, data.fieldAttributeKeys, data.metadata],
  );
  const fieldAttributeDefinitions = useMemo(
    () =>
      getFieldAttributeDefinitions(
        schema,
        {
          nodeGroupId: data.nodeGroupId,
          fieldAttributeKeys: data.fieldAttributeKeys,
          blockMetadata: data.metadata,
        },
        fields,
      ),
    [schema, data.nodeGroupId, data.fieldAttributeKeys, data.metadata, fields],
  );
  const tableColumns = useMemo(
    () => attributeDefinitionsToTableColumns(fieldAttributeDefinitions, data.visibleColumns),
    [fieldAttributeDefinitions, data.visibleColumns],
  );

  const fullTableGridStyle = useMemo(
    () => ({
      gridTemplateColumns: `14px minmax(100px, 1.2fr) ${tableColumns.map(() => "minmax(80px, 1fr)").join(" ")} 52px 14px`,
    }),
    [tableColumns],
  );

  const nodeGroupProperties = blockAttributeDefinitions;

  const [showSettings, setShowSettings] = useState(false);
  const [newField, setNewField] = useState("");
  const [addFieldSectionId, setAddFieldSectionId] = useState(sections[0]?.id ?? DEFAULT_SECTION_ID);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionNameDraft, setSectionNameDraft] = useState("");
  const [sectionDropTargetId, setSectionDropTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!sections.some((section) => section.id === addFieldSectionId)) {
      setAddFieldSectionId(sections[0]?.id ?? DEFAULT_SECTION_ID);
    }
  }, [sections, addFieldSectionId]);

  const refreshNodeLayout = useCallback(() => {
    requestAnimationFrame(() => updateNodeInternals(id));
  }, [id, updateNodeInternals]);

  const accentColor = data.color || schema?.nodeGroups?.find((group) => group?.id === data.nodeGroupId)?.color || BRAND.blue;
  const HeaderIcon = getNodeIcon(data.icon);
  const fieldSignature = useMemo(() => fields.map((field) => field.id).join(","), [fields]);

  useEffect(() => {
    refreshNodeLayout();
  }, [fieldSignature, tableExpanded, collapsed, refreshNodeLayout]);

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

  const addField = () => {
    const value = newField.trim();
    if (!value) return;
    const targetSection = addFieldSectionId || sections[0]?.id || DEFAULT_SECTION_ID;

    update((d) => {
      const next = ensureExplicitSections(d);
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
      const next = ensureExplicitSections(d);
      return {
        ...next,
        sections: [...(next.sections ?? getEffectiveSections(next)), section],
      };
    });
    setAddFieldSectionId(section.id);
    setSectionNameDraft(section.name);
    setEditingSectionId(section.id);
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
    update((d) => deleteSectionFromNode(d, sectionId));

    if (addFieldSectionId === sectionId) {
      setAddFieldSectionId(sections.find((section) => section.id !== sectionId)?.id ?? DEFAULT_SECTION_ID);
    }
    if (editingSectionId === sectionId) {
      setEditingSectionId(null);
    }
  };

  const handleMoveFieldToSection = (fieldId: string, sectionId: string) => {
    update((d) => ({
      ...d,
      fields: moveFieldToSection(d.fields ?? [], fieldId, sectionId),
    }));
    refreshNodeLayout();
  };

  const reorderFields = (sourceFieldId: string, targetFieldId: string) => {
    update((d) => ({
      ...d,
      fields: reorderFieldsInList(d.fields ?? [], sourceFieldId, targetFieldId),
    }));
    refreshNodeLayout();
  };

  const handleSectionDragOver = (event: React.DragEvent, sectionId: string) => {
    if (!event.dataTransfer.types.includes(FIELD_REORDER_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setSectionDropTargetId(sectionId);
  };

  const handleSectionDrop = (event: React.DragEvent, sectionId: string) => {
    if (!event.dataTransfer.types.includes(FIELD_REORDER_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    setSectionDropTargetId(null);

    const source = parseFieldReorder(event.dataTransfer.getData(FIELD_REORDER_MIME));
    if (!source || source.nodeId !== id) return;
    handleMoveFieldToSection(source.fieldId, sectionId);
    setAddFieldSectionId(sectionId);
  };

  const updateNodeColor = (color: string) => {
    update((d) => ({ ...d, color }));
  };

  const updateNodeIcon = (icon: NodeIconId) => {
    update((d) => ({ ...d, icon }));
  };

  const renderFieldList = (sectionFields: Field[]) => (
    <div className={tableExpanded ? "system-node__table" : "system-node__field-list"}>
      {tableExpanded && (
        <div
          className="system-node__field-row-outer system-node__field-row-outer--table system-node__table-header-row"
          style={fullTableGridStyle}
        >
          <div className="system-node__field-handle-col system-node__field-handle-col--spacer" aria-hidden />
          <div className="system-node__table-cell system-node__table-cell--name system-node__table-cell--header">
            Field
          </div>
          {tableColumns.map((column) => (
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
      )}

      {tableExpanded && tableColumns.length === 0 && sectionFields.length > 0 && (
        <p className="system-node__table-empty-hint nodrag nopan">
          Add field attributes in the schema editor to show columns here.
        </p>
      )}

      {sectionFields.map((field) => (
        <FieldRow
          key={field.id}
          nodeId={id}
          field={field}
          variant={tableExpanded ? "expanded" : "compact"}
          fullTableGridStyle={fullTableGridStyle}
          tableColumns={tableColumns}
          fieldProperties={fieldAttributeDefinitions}
          isActive={activeFieldIds.has(field.id)}
          isFaded={fieldLineageActive && !activeFieldIds.has(field.id)}
          onFieldSelect={onFieldSelect}
          onDeleteField={onDeleteField}
          onFieldReorder={reorderFields}
          onFieldConnectDrop={onFieldConnectDrop}
        />
      ))}
    </div>
  );

  return (
    <div
      className={`system-node ${selected ? "system-node--selected" : ""} ${
        collapsed ? "system-node--collapsed" : ""
      } ${tableExpanded ? "system-node--table-expanded" : ""} ${faded ? "system-node--faded" : ""} ${inLineage ? "system-node--lineage" : ""} ${
        isHighlighted ? "system-node--highlighted" : ""
      } ${isAnchor ? "system-node--anchor" : ""} ${hasImpact ? "system-node--impact" : ""}`}
    >
      {showSettings && (
        <div className="system-node__settings-panel nodrag nopan nowheel" onPointerDown={stopPointer}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Block settings</span>
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
              <span>Block</span>
              <input value={data.nodeGroupId || ""} readOnly className="system-node__settings-input" />
            </label>
          </div>
        </div>
      )}

      <PlusHandle
        type="target"
        position={Position.Left}
        id={`parent-target-${id}`}
        variant="parent"
        className="system-node__parent-handle system-node__parent-handle--target"
      />
      <PlusHandle
        type="source"
        position={Position.Right}
        id={`parent-source-${id}`}
        variant="parent"
        className="system-node__parent-handle system-node__parent-handle--source"
      />

      <BlockInternalFieldLinks nodeId={id}>
      <div className="system-node__surface flex flex-col overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
        <SmartHoverAttributes
          title={data.label ?? "System"}
          metadata={data.metadata}
          properties={nodeGroupProperties}
          className={`system-node__header system-node__header--colored flex w-full items-center justify-between gap-2 px-4 py-3 text-white ${
            collapsed ? "system-node__header--collapsed" : ""
          }`}
          style={{ backgroundColor: accentColor }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
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
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
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
              title="Block settings"
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
              title="Delete block"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </SmartHoverAttributes>

        {!collapsed && (
          <div
            className={`system-node__body nodrag nopan flex flex-col gap-1 overflow-visible pb-2 ${fields.length === 0 ? "system-node__body--empty" : ""}`}
          >
          <div className="system-node__sections">
            {renderableSections.map((section) => {
              const sectionFields = getFieldsForSection(fields, section.id);
              const isEditingSection = editingSectionId === section.id;
              const isDropTarget = sectionDropTargetId === section.id;

              return (
                <div
                  key={section.id}
                  className={`system-node__section ${isDropTarget ? "is-drop-target" : ""}`}
                  onDragOver={(event) => handleSectionDragOver(event, section.id)}
                  onDragLeave={() => setSectionDropTargetId(null)}
                  onDrop={(event) => handleSectionDrop(event, section.id)}
                >
                  {section.showHeader && (
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
                        title={
                          sectionFields.length > 0
                            ? "Remove section (fields move to General)"
                            : "Remove section"
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  )}

                  {sectionFields.length === 0 ? (
                    <div className="system-node__section-empty nodrag nopan">
                      No fields yet — add below or Alt+drag fields here
                    </div>
                  ) : (
                    renderFieldList(sectionFields)
                  )}
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
      </BlockInternalFieldLinks>
    </div>
  );
}

type FieldRowProps = {
  nodeId: string;
  field: Field;
  variant: "compact" | "expanded";
  fullTableGridStyle: React.CSSProperties;
  tableColumns: ReturnType<typeof attributeDefinitionsToTableColumns>;
  fieldProperties: ReturnType<typeof getFieldAttributeDefinitions>;
  isActive: boolean;
  isFaded: boolean;
  onFieldSelect: (nodeId: string, fieldId: string) => void;
  onDeleteField: (nodeId: string, fieldId: string) => void;
  onFieldReorder: (sourceFieldId: string, targetFieldId: string) => void;
  onFieldConnectDrop: (
    source: { nodeId: string; fieldId: string },
    target: { nodeId: string; fieldId: string },
  ) => void;
};

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

export function FieldRow({
  nodeId,
  field,
  variant,
  fullTableGridStyle,
  tableColumns,
  fieldProperties,
  isActive,
  isFaded,
  onFieldSelect,
  onDeleteField,
  onFieldReorder,
  onFieldConnectDrop,
}: FieldRowProps) {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [isConnectTarget, setIsConnectTarget] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartedRef = useRef(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragStartedRef.current) return;
    onFieldSelect(nodeId, field.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".react-flow__handle")) {
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

  const handleDragLeave = () => {
    setIsDropTarget(false);
    setIsConnectTarget(false);
  };

  const handleDrop = (e: React.DragEvent) => {
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
  };

  const rowStateClass = `${isActive ? "is-active" : ""} ${isFaded ? "is-faded" : ""} ${
    isDragging ? "is-dragging" : ""
  } ${isDropTarget ? "is-drop-target" : ""} ${isConnectTarget ? "is-connect-target" : ""}`;

  if (variant === "compact") {
    return (
      <SmartHoverAttributes
        title={field.label}
        metadata={field.metadata}
        properties={fieldProperties}
        className={`system-node__field-list-item nodrag nopan ${rowStateClass}`}
      >
        <div
          className="system-node__field-row-outer nodrag nopan"
          data-field-row-id={field.id}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="system-node__field-handle-col system-node__field-handle-col--left nodrag nopan pointer-events-auto">
            <FieldConnectionHandle nodeId={nodeId} fieldId={field.id} side="left" type="target" />
          </div>
          <div
            className="system-node__field-list-item-inner nodrag nopan"
            draggable
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
          >
            <span className="system-node__field-name">{field.label}</span>
          </div>
          <div className="system-node__field-handle-col system-node__field-handle-col--right nodrag nopan pointer-events-auto">
            <FieldConnectionHandle nodeId={nodeId} fieldId={field.id} side="right" type="source" />
          </div>
        </div>
      </SmartHoverAttributes>
    );
  }

  return (
    <SmartHoverAttributes
      title={field.label}
      metadata={field.metadata}
      properties={fieldProperties}
      className={`system-node__table-row nodrag nopan ${rowStateClass}`}
    >
      <div
        className="system-node__field-row-outer system-node__field-row-outer--table nodrag nopan"
        data-field-row-id={field.id}
        style={fullTableGridStyle}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
        <div className="system-node__table-cell system-node__table-cell--name">
          <span className="system-node__field-name">{field.label}</span>
        </div>
        {tableColumns.map((column) => (
          <div key={`${field.id}-${column.id}`} className="system-node__table-cell">
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
        <div className="system-node__field-handle-col system-node__field-handle-col--right nodrag nopan pointer-events-auto">
          <FieldConnectionHandle nodeId={nodeId} fieldId={field.id} side="right" type="source" />
        </div>
      </div>
    </SmartHoverAttributes>
  );
}

export const SystemNode = memo(SystemNodeImpl);
