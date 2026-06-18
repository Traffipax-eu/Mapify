import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MetadataValues } from "@/lib/storage";
import type { ScopedProperty } from "@/lib/schemaProperties";
import { MetadataKeyValueGrid } from "@/components/MetadataKeyValueGrid";

export type MetadataSelectionContext = "node" | "field";

interface MetadataSidebarProps {
  isOpen: boolean;
  stackOffset?: boolean;
  onClose: () => void;
  nodeId: string | null;
  nodeLabel: string | null;
  fieldId?: string | null;
  fieldLabel?: string | null;
  metadata?: MetadataValues | null;
  properties?: ScopedProperty[] | null;
  selectionContext?: MetadataSelectionContext | null;
  lockFieldPropertyKeys?: boolean;
  allowAddFieldAttributes?: boolean;
  onUpdateMetadata: (nodeId: string, metadata: MetadataValues, propertyKeys?: string[]) => void;
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

export function MetadataSidebar({
  isOpen,
  stackOffset = false,
  onClose,
  nodeId,
  nodeLabel,
  fieldId = null,
  fieldLabel = null,
  metadata: metadataProp,
  properties: propertiesProp,
  selectionContext: selectionContextProp,
  lockFieldPropertyKeys = false,
  allowAddFieldAttributes = false,
  onUpdateMetadata,
  onRenameNode,
  onRenameField,
  onDeleteField,
  onDeleteNode,
}: MetadataSidebarProps) {
  const metadata = safeMetadata(metadataProp);
  const properties = Array.isArray(propertiesProp)
    ? propertiesProp.filter((property) => property?.id)
    : [];

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

  return (
    <MetadataSidebarContent
      key={`${nodeId}-${fieldId ?? "node"}`}
      stackOffset={stackOffset}
      nodeId={nodeId}
      fieldId={fieldId}
      isFieldContext={isFieldContext}
      displayName={displayName}
      metadata={metadata}
      properties={properties}
      lockFieldPropertyKeys={isFieldContext && lockFieldPropertyKeys}
      allowAddFieldAttributes={isFieldContext && allowAddFieldAttributes}
      onClose={onClose}
      onUpdateMetadata={onUpdateMetadata}
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
  displayName,
  metadata,
  properties,
  lockFieldPropertyKeys,
  allowAddFieldAttributes,
  stackOffset,
  onClose,
  onUpdateMetadata,
  onRenameNode,
  onRenameField,
  onDeleteField,
  onDeleteNode,
}: {
  nodeId: string;
  fieldId: string | null;
  isFieldContext: boolean;
  displayName: string;
  metadata: MetadataValues;
  properties: ScopedProperty[];
  lockFieldPropertyKeys: boolean;
  allowAddFieldAttributes: boolean;
  stackOffset: boolean;
  onClose: () => void;
  onUpdateMetadata: (nodeId: string, metadata: MetadataValues, propertyKeys?: string[]) => void;
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
    <div
      className={`fixed right-0 top-14 bottom-0 w-80 bg-card border-l border-border shadow-lg z-20 flex flex-col metadata-sidebar ${
        stackOffset ? "metadata-sidebar--stacked" : ""
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {isFieldContext ? "Field" : "Block"}
          </p>
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
            {isFieldContext ? "Field name" : "Block name"}
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

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {isFieldContext ? "Field attributes" : "Block attributes"}
          </p>
          <MetadataKeyValueGrid
            metadata={metadata}
            properties={properties}
            resetKey={`${nodeId}-${fieldId ?? "node"}`}
            lockPropertyKeys={isFieldContext && lockFieldPropertyKeys}
            allowAddBlockAttributes={isFieldContext && allowAddFieldAttributes}
            onChange={(next, propertyKeys) => onUpdateMetadata(nodeId, next, propertyKeys)}
          />
        </div>
      </div>
    </div>
  );
}
