import { useState, useEffect, useMemo } from "react";
import { X, Trash2, Globe, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MetadataValues, PropertyDefinition } from "@/lib/storage";
import type { ScopedProperty } from "@/lib/schemaProperties";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";

export type MetadataSelectionContext = "node" | "field";

interface MetadataSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  nodeLabel: string | null;
  fieldId?: string | null;
  fieldLabel?: string | null;
  /** Metadata for the active context only (node.data.metadata or field.metadata). */
  metadata: MetadataValues | null;
  /** Properties for the active context only — node group OR field attributes, never both. */
  properties: ScopedProperty[];
  selectionContext: MetadataSelectionContext;
  onUpdateMetadata: (nodeId: string, metadata: MetadataValues) => void;
  onRenameNode?: (nodeId: string, label: string) => void;
  onRenameField?: (nodeId: string, fieldId: string, label: string) => void;
  onDeleteField?: (nodeId: string, fieldId: string) => void;
  onDeleteNode?: () => void;
}

export function MetadataSidebar({
  isOpen,
  onClose,
  nodeId,
  nodeLabel,
  fieldId,
  fieldLabel,
  metadata,
  properties,
  selectionContext,
  onUpdateMetadata,
  onRenameNode,
  onRenameField,
  onDeleteField,
  onDeleteNode,
}: MetadataSidebarProps) {
  const [localMetadata, setLocalMetadata] = useState<MetadataValues>({});
  const [nameDraft, setNameDraft] = useState("");

  const isFieldContext = selectionContext === "field";
  const sectionTitle = isFieldContext
    ? SCHEMA_SCOPE_LABELS.group.title
    : SCHEMA_SCOPE_LABELS.global.title;
  const SectionIcon = isFieldContext ? Layers : Globe;

  const allowedPropertyIds = useMemo(
    () => new Set(properties.map((property) => property.id)),
    [properties],
  );

  useEffect(() => {
    const next: MetadataValues = {};
    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        if (allowedPropertyIds.has(key)) {
          next[key] = value;
        }
      }
    }
    setLocalMetadata(next);
  }, [metadata, allowedPropertyIds]);

  useEffect(() => {
    setNameDraft(isFieldContext ? fieldLabel || "" : nodeLabel || "");
  }, [isFieldContext, fieldLabel, nodeLabel]);

  const handleChange = (propertyId: string, value: unknown) => {
    if (!allowedPropertyIds.has(propertyId)) return;
    const updated = { ...localMetadata, [propertyId]: value };
    setLocalMetadata(updated);
    if (nodeId) {
      onUpdateMetadata(nodeId, updated);
    }
  };

  const commitName = () => {
    if (!nodeId) return;
    const next = nameDraft.trim();
    if (!next) {
      setNameDraft(isFieldContext ? fieldLabel || "" : nodeLabel || "");
      return;
    }
    if (isFieldContext && fieldId && onRenameField) {
      onRenameField(nodeId, fieldId, next);
    } else if (!isFieldContext && onRenameNode) {
      onRenameNode(nodeId, next);
    }
  };

  if (!isOpen || !nodeId) return null;

  return (
    <div className="fixed right-0 top-14 bottom-0 w-80 bg-card border-l border-border shadow-lg z-20 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold">
            {isFieldContext ? "Field Properties" : "System Properties"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isFieldContext
              ? "Field-level attributes for this column"
              : "Node group attributes for this system"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onDeleteNode && !isFieldContext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteNode}
              className="text-muted-foreground hover:text-destructive"
              title="Delete node"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium">{isFieldContext ? "Field name" : "Node name"}</label>
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
            }}
            className="text-sm"
          />
        </div>

        {isFieldContext && fieldId && onDeleteField && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => onDeleteField(nodeId, fieldId)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete field
          </Button>
        )}

        {properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No {isFieldContext ? SCHEMA_SCOPE_LABELS.group.short : SCHEMA_SCOPE_LABELS.global.short}{" "}
            attributes defined. Open the schema editor on this node group to add them.
          </p>
        ) : (
          <MetadataSection
            title={sectionTitle}
            icon={<SectionIcon className="h-3.5 w-3.5" />}
            properties={properties}
            localMetadata={localMetadata}
            onChange={handleChange}
          />
        )}
      </div>
    </div>
  );
}

function MetadataSection({
  title,
  icon,
  properties,
  localMetadata,
  onChange,
}: {
  title: string;
  icon: React.ReactNode;
  properties: ScopedProperty[];
  localMetadata: MetadataValues;
  onChange: (propertyId: string, value: unknown) => void;
}) {
  return (
    <div className="border-t border-border pt-4">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {icon}
        {title}
      </h3>
      {properties.map((property) => (
        <PropertyField
          key={property.id}
          property={property}
          value={localMetadata[property.id] ?? property.defaultValue ?? ""}
          onChange={(value) => onChange(property.id, value)}
        />
      ))}
    </div>
  );
}

function PropertyField({
  property,
  value,
  onChange,
}: {
  property: PropertyDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const propertyName = property.name?.trim() || "Attribute";

  switch (property.type ?? "text") {
    case "textarea":
      return (
        <div className="space-y-2 mb-4">
          <label className="text-xs font-medium">
            {propertyName}
            {property.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <Textarea
            placeholder={`Enter ${propertyName.toLowerCase()}...`}
            value={String(value || "")}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[80px] text-sm"
          />
        </div>
      );
    case "select":
      return (
        <div className="space-y-2 mb-4">
          <label className="text-xs font-medium">
            {propertyName}
            {property.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <Select value={String(value || "")} onValueChange={onChange}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={`Select ${propertyName.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {property.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case "date":
      return (
        <div className="space-y-2 mb-4">
          <label className="text-xs font-medium">
            {propertyName}
            {property.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <Input
            type="date"
            value={String(value || "")}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm"
          />
        </div>
      );
    case "number":
      return (
        <div className="space-y-2 mb-4">
          <label className="text-xs font-medium">
            {propertyName}
            {property.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <Input
            type="number"
            placeholder={`Enter ${propertyName.toLowerCase()}...`}
            value={String(value || "")}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm"
          />
        </div>
      );
    case "boolean":
      return (
        <div className="space-y-2 mb-4">
          <label className="text-xs font-medium">
            {propertyName}
            {property.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <Select value={value ? "true" : "false"} onValueChange={(val) => onChange(val === "true")}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={propertyName} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    default:
      return (
        <div className="space-y-2 mb-4">
          <label className="text-xs font-medium">
            {propertyName}
            {property.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <Input
            placeholder={`Enter ${propertyName.toLowerCase()}...`}
            value={String(value || "")}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm"
          />
        </div>
      );
  }
}
