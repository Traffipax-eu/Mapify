import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MetadataValues } from "@/lib/storage";
import type { ScopedProperty } from "@/lib/schemaProperties";
import { MetadataKeyValueGrid } from "@/components/MetadataKeyValueGrid";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";

export type MetadataSelectionContext = "node" | "field";

interface MetadataSidebarProps {
  isOpen: boolean;
  nodeType?: "system" | "customObject";
  onClose: () => void;
  nodeId: string | null;
  nodeLabel: string | null;
  fieldId?: string | null;
  fieldLabel?: string | null;
  metadata?: MetadataValues | null;
  blockProperties?: ScopedProperty[] | null;
  fieldProperties?: ScopedProperty[] | null;
  selectionContext?: MetadataSelectionContext | null;
  lockBlockPropertyKeys?: boolean;
  lockFieldPropertyKeys?: boolean;
  allowAddBlockAttributes?: boolean;
  allowAddFieldAttributes?: boolean;
  onUpdateBlockMetadata: (nodeId: string, metadata: MetadataValues, propertyKeys?: string[]) => void;
  onUpdateFieldAttributeKeys: (nodeId: string, propertyKeys: string[]) => void;
  onUpdateFieldMetadata: (nodeId: string, fieldId: string, metadata: MetadataValues, propertyKeys?: string[]) => void;
  onRenameNode?: (nodeId: string, label: string) => void;
  onRenameField?: (nodeId: string, fieldId: string, label: string) => void;
  onDeleteField?: (nodeId: string, fieldId: string) => void;
  onDeleteNode?: () => void;
}

function safeMetadata(value: unknown): MetadataValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as MetadataValues) };
}

function safeProperties(value: ScopedProperty[] | null | undefined): ScopedProperty[] {
  return Array.isArray(value) ? value.filter((property) => property?.id) : [];
}

export function MetadataSidebar({
  isOpen,
  nodeType = "system",
  onClose,
  nodeId,
  nodeLabel,
  fieldId = null,
  fieldLabel = null,
  metadata: metadataProp,
  blockProperties: blockPropertiesProp,
  fieldProperties: fieldPropertiesProp,
  selectionContext: selectionContextProp,
  lockBlockPropertyKeys = false,
  lockFieldPropertyKeys = false,
  allowAddBlockAttributes = false,
  allowAddFieldAttributes = false,
  onUpdateBlockMetadata,
  onUpdateFieldAttributeKeys,
  onUpdateFieldMetadata,
  onRenameNode,
  onRenameField,
  onDeleteField,
  onDeleteNode,
}: MetadataSidebarProps) {
  const metadata = safeMetadata(metadataProp);
  const blockProperties = safeProperties(blockPropertiesProp);
  const fieldProperties = safeProperties(fieldPropertiesProp);

  const selectionContext: MetadataSelectionContext =
    selectionContextProp === "field" && fieldId ? "field" : "node";
  const isFieldContext = selectionContext === "field";

  if (!isOpen || !nodeId) {
    return null;
  }

  if (isFieldContext && !fieldId) {
    return null;
  }

  const displayName = isFieldContext ? fieldLabel ?? "Field" : nodeLabel ?? "System";

  const isCustomObject = nodeType === "customObject";
  const contextLabel = isFieldContext ? "Field" : isCustomObject ? "Custom Object" : "Block";
  const nameLabel = isFieldContext ? "Field name" : isCustomObject ? "Object name" : "Block name";
  const attributesLabel = isCustomObject ? "Attributes" : SCHEMA_SCOPE_LABELS.global.title;

  return (
    <MetadataSidebarContent
      key={`${nodeId}-${fieldId ?? "node"}`}
      nodeId={nodeId}
      fieldId={fieldId}
      isFieldContext={isFieldContext}
      isCustomObject={isCustomObject}
      contextLabel={contextLabel}
      nameLabel={nameLabel}
      attributesLabel={attributesLabel}
      displayName={displayName}
      metadata={metadata}
      blockProperties={blockProperties}
      fieldProperties={fieldProperties}
      lockBlockPropertyKeys={lockBlockPropertyKeys}
      lockFieldPropertyKeys={lockFieldPropertyKeys}
      allowAddBlockAttributes={allowAddBlockAttributes}
      allowAddFieldAttributes={allowAddFieldAttributes}
      onClose={onClose}
      onUpdateBlockMetadata={onUpdateBlockMetadata}
      onUpdateFieldAttributeKeys={onUpdateFieldAttributeKeys}
      onUpdateFieldMetadata={onUpdateFieldMetadata}
      onRenameNode={onRenameNode}
      onRenameField={onRenameField}
      onDeleteField={onDeleteField}
      onDeleteNode={onDeleteNode}
    />
  );
}

function MetadataSidebarContent({
  nodeId,
  fieldId,
  isFieldContext,
  isCustomObject,
  contextLabel,
  nameLabel,
  attributesLabel,
  displayName,
  metadata,
  blockProperties,
  fieldProperties,
  lockBlockPropertyKeys,
  lockFieldPropertyKeys,
  allowAddBlockAttributes,
  allowAddFieldAttributes,
  onClose,
  onUpdateBlockMetadata,
  onUpdateFieldAttributeKeys,
  onUpdateFieldMetadata,
  onRenameNode,
  onRenameField,
  onDeleteField,
  onDeleteNode,
}: {
  nodeId: string;
  fieldId: string | null;
  isFieldContext: boolean;
  isCustomObject: boolean;
  contextLabel: string;
  nameLabel: string;
  attributesLabel: string;
  displayName: string;
  metadata: MetadataValues;
  blockProperties: ScopedProperty[];
  fieldProperties: ScopedProperty[];
  lockBlockPropertyKeys: boolean;
  lockFieldPropertyKeys: boolean;
  allowAddBlockAttributes: boolean;
  allowAddFieldAttributes: boolean;
  onClose: () => void;
  onUpdateBlockMetadata: (nodeId: string, metadata: MetadataValues, propertyKeys?: string[]) => void;
  onUpdateFieldAttributeKeys: (nodeId: string, propertyKeys: string[]) => void;
  onUpdateFieldMetadata: (nodeId: string, fieldId: string, metadata: MetadataValues, propertyKeys?: string[]) => void;
  onRenameNode?: (nodeId: string, label: string) => void;
  onRenameField?: (nodeId: string, fieldId: string, label: string) => void;
  onDeleteField?: (nodeId: string, fieldId: string) => void;
  onDeleteNode?: () => void;
}) {
  const [nameDraft, setNameDraft] = useState(displayName);

  useEffect(() => {
    setNameDraft(displayName);
  }, [displayName, nodeId, fieldId]);

  const commitName = () => {
    const next = nameDraft.trim();
    if (!next) {
      setNameDraft(displayName);
      return;
    }
    if (isFieldContext && fieldId && onRenameField) {
      onRenameField(nodeId, fieldId, next);
      return;
    }
    if (!isFieldContext && onRenameNode) {
      onRenameNode(nodeId, next);
    }
  };

  return (
    <div className="fixed right-0 top-14 bottom-0 w-80 bg-card border-l border-border shadow-lg z-20 flex flex-col metadata-sidebar">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{contextLabel}</p>
          <h2 className="text-sm font-semibold truncate">{displayName}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onDeleteNode && !isFieldContext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteNode}
              className="text-muted-foreground hover:text-destructive"
              title="Delete block"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {nameLabel}
          </label>
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
            }}
            className="text-sm border-none bg-muted/40 px-2 shadow-none focus-visible:ring-1"
          />
        </div>

        {isFieldContext && fieldId && onDeleteField && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDeleteField(nodeId, fieldId)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete field
          </Button>
        )}

        {!isFieldContext && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {attributesLabel}
            </p>
            {isCustomObject && (
              <p className="text-[11px] text-muted-foreground">
                Add any key-value pairs (Owner, Contact, URL, etc.).
              </p>
            )}
            <MetadataKeyValueGrid
              metadata={metadata}
              properties={blockProperties}
              resetKey={`${nodeId}-block`}
              lockPropertyKeys={lockBlockPropertyKeys && blockProperties.length > 0}
              allowAddBlockAttributes={allowAddBlockAttributes}
              onChange={(next, propertyKeys) => onUpdateBlockMetadata(nodeId, next, propertyKeys)}
            />
          </div>
        )}

        {!isCustomObject && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {SCHEMA_SCOPE_LABELS.group.title}
          </p>
          {!isFieldContext && (
            <p className="text-[11px] text-muted-foreground">
              Property keys for fields in this block. Set values on each field.
            </p>
          )}
          <MetadataKeyValueGrid
            metadata={isFieldContext ? metadata : {}}
            properties={fieldProperties}
            resetKey={`${nodeId}-${fieldId ?? "node"}-field`}
            lockPropertyKeys={lockFieldPropertyKeys && fieldProperties.length > 0}
            allowAddBlockAttributes={isFieldContext ? allowAddFieldAttributes : allowAddFieldAttributes}
            valuesReadOnly={!isFieldContext}
            onChange={(next, propertyKeys) => {
              if (isFieldContext && fieldId) {
                onUpdateFieldMetadata(nodeId, fieldId, next, propertyKeys);
                return;
              }
              if (propertyKeys?.length) {
                onUpdateFieldAttributeKeys(nodeId, propertyKeys);
              }
            }}
          />
        </div>
        )}
      </div>
    </div>
  );
}
