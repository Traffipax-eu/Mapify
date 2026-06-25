import { memo, useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Position, useUpdateNodeInternals, type NodeProps } from "reactflow";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Layers,
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
import { EditableFieldTable } from "@/components/nodes/EditableFieldTable";
import { buildTablePastePlan, parseTabularClipboard, resolveAnchorFieldIndex, resolveTablePasteMode } from "@/lib/tableClipboard";
import {
  countFieldsInGroup,
  countFieldsInSection,
  createGroup,
  createSection,
  DEFAULT_SECTION_ID,
  deleteGroupFromNode,
  deleteSectionFromNode,
  ensureExplicitSections,
  getEffectiveGroups,
  getEffectiveSections,
  getFieldsForGroup,
  getFieldsForSection,
  getGroupsForSection,
  getRenderableSections,
  moveFieldToGroup,
  moveFieldToSection,
  reorderFieldsInList,
  toggleGroupCollapsed,
  toggleSectionCollapsed,
} from "@/lib/nodeSections";
import { getNodeIcon, NODE_ICON_OPTIONS, type NodeIconId } from "@/lib/nodeIcons";
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

type PasteTarget = {
  sectionId: string;
  groupId?: string;
  fieldIndex?: number;
};

function isInteractivePasteClick(target: EventTarget | null) {
  return !!(target as HTMLElement | null)?.closest?.(
    "button, input, .react-flow__handle, .field-handle",
  );
}

export type Field = {
  id: string;
  label: string;
  fieldTypeId?: string;
  sectionId?: string;
  groupId?: string;
  metadata?: MetadataValues;
};

export type FieldSection = {
  id: string;
  name: string;
  collapsed?: boolean;
};

export type FieldGroup = {
  id: string;
  name: string;
  sectionId: string;
  collapsed?: boolean;
};

export type SystemNodeData = {
  label: string;
  nodeGroupId?: string;
  icon?: string;
  color?: string;
  sections?: FieldSection[];
  groups?: FieldGroup[];
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
  const { schema, onUpdateNodeData, onDeleteNode, onFieldSelect, onFieldEdit, onDeleteField, onFieldConnectDrop, onRenameField, onUpdateFieldTableCell, onApplyFieldTablePaste, selectedNodeId, selectedFieldId } =
    useNodeCanvas();
  const updateNodeInternals = useUpdateNodeInternals();
  const { hasLineage, lineageNodeIds, highlightedFieldsByNode, impactNodeIds, anchorNodeId } =
    useLineage();

  const fields = data.fields ?? [];
  const sections = useMemo(() => getEffectiveSections(data), [data.sections]);
  const groups = useMemo(() => getEffectiveGroups(data), [data.groups]);
  const renderableSections = useMemo(() => getRenderableSections(data, fields), [data, fields]);
  const collapsed = !!data.collapsed;
  const tableExpanded = !!data.tableExpanded;
  const inLineage = lineageNodeIds.has(id);
  const highlightedFieldIds = highlightedFieldsByNode.get(id) ?? new Set<string>();
  const fieldLineageActive = hasLineage && inLineage && fields.length > 0;
  const faded = hasLineage && !inLineage;
  const isAnchor = anchorNodeId === id;
  const hasImpact = impactNodeIds.has(id);
  const activeFieldIds = highlightedFieldIds;
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
  const [addFieldGroupId, setAddFieldGroupId] = useState<string | undefined>(undefined);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionNameDraft, setSectionNameDraft] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [sectionDropTargetId, setSectionDropTargetId] = useState<string | null>(null);
  const [groupDropTargetId, setGroupDropTargetId] = useState<string | null>(null);
  const [pasteTarget, setPasteTarget] = useState<PasteTarget | null>(null);

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

  const selectPasteTarget = useCallback((sectionId: string, groupId?: string, fieldIndex?: number) => {
    setAddFieldSectionId(sectionId);
    setAddFieldGroupId(groupId);
    setPasteTarget({ sectionId, groupId, fieldIndex });
  }, []);

  const isActivePasteTarget = useCallback(
    (sectionId: string, groupId?: string, fieldIndex?: number) => {
      if (!pasteTarget) return false;
      if (pasteTarget.sectionId !== sectionId) return false;
      if ((pasteTarget.groupId ?? undefined) !== groupId) return false;
      if (fieldIndex !== undefined) return pasteTarget.fieldIndex === fieldIndex;
      return pasteTarget.fieldIndex === undefined;
    },
    [pasteTarget],
  );

  const handlePasteAtTarget = useCallback(
    (event: React.ClipboardEvent) => {
      const text = event.clipboardData.getData("text/plain");
      const grid = parseTabularClipboard(text);
      if (grid.length === 0) return;

      event.preventDefault();
      event.stopPropagation();

      const targetSection = pasteTarget?.sectionId ?? addFieldSectionId ?? sections[0]?.id ?? DEFAULT_SECTION_ID;
      const targetGroup = pasteTarget?.groupId ?? addFieldGroupId;
      const sectionFields = getFieldsForGroup(fields, targetSection, targetGroup ?? null);
      const anchorFieldIndex = pasteTarget?.fieldIndex ?? 0;
      const mode = resolveTablePasteMode(event.shiftKey, sectionFields.length);
      const resolvedAnchor = resolveAnchorFieldIndex(mode, anchorFieldIndex, sectionFields.length);

      const plan = buildTablePastePlan(
        grid,
        sectionFields,
        tableColumns,
        { fieldIndex: resolvedAnchor, columnKey: "label" },
        mode,
      );
      if (plan.updates.length === 0 && plan.newFields.length === 0) return;
      onApplyFieldTablePaste(id, targetSection, targetGroup, plan);
    },
    [
      addFieldGroupId,
      addFieldSectionId,
      fields,
      id,
      onApplyFieldTablePaste,
      pasteTarget,
      sections,
      tableColumns,
    ],
  );

  const focusPasteZone = (event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.focus({ preventScroll: true });
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
            groupId: addFieldGroupId,
          },
        ],
      };
    });
    setNewField("");
    refreshNodeLayout();
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
      setAddFieldGroupId(undefined);
    }
    if (editingSectionId === sectionId) {
      setEditingSectionId(null);
    }
  };

  const addGroup = (sectionId: string) => {
    const group = createGroup(sectionId);
    update((d) => {
      const next = ensureExplicitSections(d);
      return {
        ...next,
        groups: [...getEffectiveGroups(next), group],
      };
    });
    setAddFieldSectionId(sectionId);
    setAddFieldGroupId(group.id);
    setGroupNameDraft(group.name);
    setEditingGroupId(group.id);
    update((d) => {
      const currentSection = (d.sections ?? getEffectiveSections(d)).find((item) => item.id === sectionId);
      if (currentSection?.collapsed) {
        return toggleSectionCollapsed(d, sectionId);
      }
      return d;
    });
  };

  const commitGroupName = (groupId: string) => {
    const nextName = groupNameDraft.trim();
    if (!nextName) {
      setEditingGroupId(null);
      return;
    }
    update((d) => ({
      ...d,
      groups: getEffectiveGroups(d).map((group) =>
        group.id === groupId ? { ...group, name: nextName } : group,
      ),
    }));
    setEditingGroupId(null);
  };

  const deleteGroup = (groupId: string) => {
    update((d) => deleteGroupFromNode(d, groupId));
    if (addFieldGroupId === groupId) {
      setAddFieldGroupId(undefined);
    }
    if (editingGroupId === groupId) {
      setEditingGroupId(null);
    }
  };

  const handleToggleSectionCollapsed = (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    update((d) => toggleSectionCollapsed(d, sectionId));
    refreshNodeLayout();
  };

  const handleToggleGroupCollapsed = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    update((d) => toggleGroupCollapsed(d, groupId));
    refreshNodeLayout();
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
    setAddFieldGroupId(undefined);
  };

  const handleGroupDragOver = (event: React.DragEvent, groupId: string) => {
    if (!event.dataTransfer.types.includes(FIELD_REORDER_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setGroupDropTargetId(groupId);
  };

  const handleGroupDrop = (event: React.DragEvent, sectionId: string, groupId: string) => {
    if (!event.dataTransfer.types.includes(FIELD_REORDER_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    setGroupDropTargetId(null);

    const source = parseFieldReorder(event.dataTransfer.getData(FIELD_REORDER_MIME));
    if (!source || source.nodeId !== id) return;
    update((d) => ({
      ...d,
      fields: moveFieldToGroup(d.fields ?? [], source.fieldId, sectionId, groupId),
    }));
    setAddFieldSectionId(sectionId);
    setAddFieldGroupId(groupId);
    refreshNodeLayout();
  };

  const updateNodeColor = (color: string) => {
    update((d) => ({ ...d, color }));
  };

  const updateNodeIcon = (icon: NodeIconId) => {
    update((d) => ({ ...d, icon }));
  };

  const renderFieldList = (sectionFields: Field[], sectionId: string, groupId?: string) => {
    if (tableExpanded) {
      return (
        <EditableFieldTable
          nodeId={id}
          sectionId={sectionId}
          groupId={groupId}
          fields={sectionFields}
          columns={tableColumns}
          fieldProperties={fieldAttributeDefinitions}
          fullTableGridStyle={fullTableGridStyle}
          activeFieldIds={activeFieldIds}
          fieldLineageActive={fieldLineageActive}
          selectedNodeId={selectedNodeId}
          selectedFieldId={selectedFieldId}
          onFieldSelect={onFieldSelect}
          onFieldEdit={onFieldEdit}
          onDeleteField={onDeleteField}
          onFieldReorder={reorderFields}
          onFieldConnectDrop={onFieldConnectDrop}
          onUpdateFieldLabel={onRenameField}
          onUpdateFieldCell={onUpdateFieldTableCell}
          onApplyTablePaste={onApplyFieldTablePaste}
        />
      );
    }

    return (
      <div className="system-node__field-list">
        {sectionFields.map((field, fieldIndex) => (
          <FieldRow
            key={field.id}
            nodeId={id}
            field={field}
            variant="compact"
            fullTableGridStyle={fullTableGridStyle}
            tableColumns={tableColumns}
            fieldProperties={fieldAttributeDefinitions}
            isActive={fieldLineageActive && activeFieldIds.has(field.id)}
            isFaded={fieldLineageActive && !activeFieldIds.has(field.id)}
            isSelected={selectedNodeId === id && selectedFieldId === field.id}
            isPasteTarget={isActivePasteTarget(sectionId, groupId, fieldIndex)}
            onFieldSelect={onFieldSelect}
            onFieldEdit={onFieldEdit}
            onDeleteField={onDeleteField}
            onFieldReorder={reorderFields}
            onFieldConnectDrop={onFieldConnectDrop}
            onSelectPasteTarget={() => selectPasteTarget(sectionId, groupId, fieldIndex)}
            onPaste={handlePasteAtTarget}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      className={`system-node ${selected ? "system-node--selected" : ""} ${
        collapsed ? "system-node--collapsed" : ""
      } ${tableExpanded ? "system-node--table-expanded" : ""} ${faded ? "system-node--faded" : ""} ${
        inLineage ? "system-node--lineage" : ""
      } ${inLineage ? "system-node--highlighted" : ""} ${
        isAnchor ? "system-node--anchor" : ""
      } ${hasImpact ? "system-node--impact" : ""}`}
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
              const sectionGroups = getGroupsForSection(groups, section.id);
              const ungroupedFields = getFieldsForGroup(fields, section.id, null);
              const isEditingSection = editingSectionId === section.id;
              const isDropTarget = sectionDropTargetId === section.id;
              const sectionMeta = sections.find((item) => item.id === section.id);
              const sectionCollapsed = !!sectionMeta?.collapsed;
              const sectionFieldCount = countFieldsInSection(fields, section.id);
              const showSectionChrome = section.showHeader || sectionGroups.length > 0 || sectionFieldCount > 0;

              return (
                <div
                  key={section.id}
                  className={`system-node__section ${isDropTarget ? "is-drop-target" : ""} ${
                    sectionCollapsed ? "system-node__section--collapsed" : ""
                  }`}
                  onDragOver={(event) => handleSectionDragOver(event, section.id)}
                  onDragLeave={() => setSectionDropTargetId(null)}
                  onDrop={(event) => handleSectionDrop(event, section.id)}
                >
                  {showSectionChrome && (
                    <div
                      className={`system-node__section-header ${
                        section.showHeader ? "" : "system-node__section-header--minimal"
                      } ${isActivePasteTarget(section.id) ? "is-paste-target" : ""}`}
                      tabIndex={-1}
                      onPaste={handlePasteAtTarget}
                      onClick={(event) => {
                        if (isInteractivePasteClick(event.target)) return;
                        selectPasteTarget(section.id);
                        focusPasteZone(event);
                      }}
                      title="Click, then Ctrl+V to paste from Excel"
                    >
                      <button
                        type="button"
                        onClick={(e) => handleToggleSectionCollapsed(section.id, e)}
                        className="system-node__section-chevron nodrag nopan"
                        title={sectionCollapsed ? "Expand section" : "Collapse section"}
                      >
                        {sectionCollapsed ? (
                          <ChevronRight className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                      {section.showHeader && (
                        <>
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
                              onPointerDown={stopPointer}
                              onClick={stopPointer}
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
                        </>
                      )}
                      {sectionCollapsed && sectionFieldCount > 0 && (
                        <span className="system-node__section-count">{sectionFieldCount}</span>
                      )}
                      {!sectionCollapsed && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addGroup(section.id);
                          }}
                          className="system-node__group-add-btn nodrag nopan"
                          title="Add group"
                        >
                          <Layers className="h-3 w-3" />
                        </button>
                      )}
                      {sections.length > 1 && section.showHeader && (
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

                  {!sectionCollapsed && (
                    <div
                      className="system-node__section-body"
                      tabIndex={-1}
                      onPaste={handlePasteAtTarget}
                      onClick={(event) => {
                        if (isInteractivePasteClick(event.target)) return;
                        selectPasteTarget(section.id);
                        focusPasteZone(event);
                      }}
                    >
                      {ungroupedFields.length === 0 && sectionGroups.length === 0 ? (
                        tableExpanded ? (
                          renderFieldList([], section.id)
                        ) : (
                        <div
                          className={`system-node__section-empty nodrag nopan ${
                            isActivePasteTarget(section.id) ? "is-paste-target" : ""
                          }`}
                          tabIndex={-1}
                          onPaste={handlePasteAtTarget}
                          onPointerDown={stopPointer}
                          onClick={(event) => {
                            event.stopPropagation();
                            selectPasteTarget(section.id);
                            focusPasteZone(event);
                          }}
                          title="Click, then Ctrl+V to paste from Excel"
                        >
                          No fields yet — click here and Ctrl+V to paste from Excel
                        </div>
                        )
                      ) : (
                        ungroupedFields.length > 0 && renderFieldList(ungroupedFields, section.id)
                      )}

                      {sectionGroups.map((group) => {
                        const groupFields = getFieldsForGroup(fields, section.id, group.id);
                        const isEditingGroup = editingGroupId === group.id;
                        const isGroupDropTarget = groupDropTargetId === group.id;
                        const groupCollapsed = !!group.collapsed;
                        const groupFieldCount = countFieldsInGroup(fields, section.id, group.id);

                        return (
                          <div
                            key={group.id}
                            className={`system-node__field-group ${
                              isGroupDropTarget ? "is-drop-target" : ""
                            } ${groupCollapsed ? "system-node__field-group--collapsed" : ""}`}
                            onDragOver={(event) => handleGroupDragOver(event, group.id)}
                            onDragLeave={() => setGroupDropTargetId(null)}
                            onDrop={(event) => handleGroupDrop(event, section.id, group.id)}
                          >
                            <div
                              className={`system-node__group-header ${
                                isActivePasteTarget(section.id, group.id) ? "is-paste-target" : ""
                              }`}
                              tabIndex={-1}
                              onPaste={handlePasteAtTarget}
                              onClick={(event) => {
                                if (isInteractivePasteClick(event.target)) return;
                                selectPasteTarget(section.id, group.id);
                                focusPasteZone(event);
                              }}
                              title="Click, then Ctrl+V to paste from Excel"
                            >
                              <button
                                type="button"
                                onClick={(e) => handleToggleGroupCollapsed(group.id, e)}
                                className="system-node__group-chevron nodrag nopan"
                                title={groupCollapsed ? "Expand group" : "Collapse group"}
                              >
                                {groupCollapsed ? (
                                  <ChevronRight className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </button>
                              {isEditingGroup ? (
                                <input
                                  autoFocus
                                  value={groupNameDraft}
                                  onChange={(e) => setGroupNameDraft(e.target.value)}
                                  onBlur={() => commitGroupName(group.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") commitGroupName(group.id);
                                    if (e.key === "Escape") setEditingGroupId(null);
                                  }}
                                  className="system-node__group-title-input nodrag nopan nowheel"
                                  onPointerDown={stopPointer}
                                  onClick={stopPointer}
                                />
                              ) : (
                                <span className="system-node__group-title">{group.name}</span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGroupNameDraft(group.name);
                                  setEditingGroupId(group.id);
                                }}
                                className="system-node__group-rename nodrag nopan"
                                title="Rename group"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              {groupCollapsed && groupFieldCount > 0 && (
                                <span className="system-node__group-count">{groupFieldCount}</span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteGroup(group.id);
                                }}
                                className="system-node__group-delete nodrag nopan"
                                title="Remove group (fields stay in section)"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                            {!groupCollapsed && (
                              <div
                                className="system-node__group-body"
                                tabIndex={-1}
                                onPaste={handlePasteAtTarget}
                                onClick={(event) => {
                                  if (isInteractivePasteClick(event.target)) return;
                                  selectPasteTarget(section.id, group.id);
                                  focusPasteZone(event);
                                }}
                              >
                                {groupFields.length === 0 ? (
                                  tableExpanded ? (
                                    renderFieldList([], section.id, group.id)
                                  ) : (
                                  <div
                                    className={`system-node__group-empty nodrag nopan ${
                                      isActivePasteTarget(section.id, group.id) ? "is-paste-target" : ""
                                    }`}
                                    tabIndex={-1}
                                    onPaste={handlePasteAtTarget}
                                    onPointerDown={stopPointer}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      selectPasteTarget(section.id, group.id);
                                      focusPasteZone(event);
                                    }}
                                    title="Click, then Ctrl+V to paste from Excel"
                                  >
                                    No fields yet — click here and Ctrl+V to paste from Excel
                                  </div>
                                  )
                                ) : (
                                  renderFieldList(groupFields, section.id, group.id)
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
  isSelected?: boolean;
  isPasteTarget?: boolean;
  onFieldSelect: (nodeId: string, fieldId: string) => void;
  onFieldEdit: (nodeId: string, fieldId: string) => void;
  onDeleteField: (nodeId: string, fieldId: string) => void;
  onFieldReorder: (sourceFieldId: string, targetFieldId: string) => void;
  onFieldConnectDrop: (
    source: { nodeId: string; fieldId: string },
    target: { nodeId: string; fieldId: string },
  ) => void;
  onSelectPasteTarget?: () => void;
  onPaste?: (event: React.ClipboardEvent) => void;
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
  isSelected = false,
  isPasteTarget = false,
  onFieldSelect,
  onFieldEdit,
  onDeleteField,
  onFieldReorder,
  onFieldConnectDrop,
  onSelectPasteTarget,
  onPaste,
}: FieldRowProps) {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [isConnectTarget, setIsConnectTarget] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartedRef = useRef(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragStartedRef.current) return;
    onSelectPasteTarget?.();
    (e.currentTarget as HTMLElement).focus({ preventScroll: true });
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onFieldEdit(nodeId, field.id);
  };

  const rowStateClass = `${isActive ? "is-active" : ""} ${isFaded ? "is-faded" : ""} ${
    isSelected ? "is-selected" : ""
  } ${isDragging ? "is-dragging" : ""} ${isDropTarget ? "is-drop-target" : ""} ${
    isConnectTarget ? "is-connect-target" : ""
  }`;
  if (variant === "compact") {
    return (
      <SmartHoverAttributes
        title={field.label}
        metadata={field.metadata}
        properties={fieldProperties}
        className={`system-node__field-list-item nodrag nopan ${rowStateClass} ${
          isPasteTarget ? "is-paste-target" : ""
        }`}
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
            tabIndex={-1}
            onPaste={onPaste}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            title="Click to select · Double-click to edit in sidebar"
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
        onDoubleClick={handleDoubleClick}
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
              onFieldEdit(nodeId, field.id);
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
