import { useState, useEffect } from "react";
import { X, Trash2, Globe, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MetadataValues, PropertyDefinition } from "@/lib/storage";
import type { ScopedProperty } from "@/lib/schemaProperties";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";

interface MetadataSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  nodeLabel: string | null;
  fieldId?: string | null;
  fieldLabel?: string | null;
  metadata: MetadataValues | null;
  properties: ScopedProperty[];
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
  onUpdateMetadata,
  onRenameNode,
  onRenameField,
  onDeleteField,
  onDeleteNode,
}: MetadataSidebarProps) {
  const [localMetadata, setLocalMetadata] = useState<MetadataValues>({});
  const [nameDraft, setNameDraft] = useState("");

  const globalProperties = properties.filter((property) => property.scope === "global");
  const groupProperties = properties.filter((property) => property.scope === "group");

  useEffect(() => {
    setLocalMetadata(metadata || {});
  }, [metadata]);

  useEffect(() => {
    setNameDraft(fieldId ? fieldLabel || "" : nodeLabel || "");
  }, [fieldId, fieldLabel, nodeLabel]);

  const handleChange = (propertyId: string, value: unknown) => {
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
      setNameDraft(fieldId ? fieldLabel || "" : nodeLabel || "");
      return;
    }
    if (fieldId && onRenameField) {
      onRenameField(nodeId, fieldId, next);
    } else if (!fieldId && onRenameNode) {
      onRenameNode(nodeId, next);
    }
  };

  if (!isOpen || !nodeId) return null;

  return (
    <div className="fixed right-0 top-14 bottom-0 w-80 bg-card border-l border-border shadow-lg z-20 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold">{fieldId ? "Field Properties" : "System Properties"}</h2>
          <p className="text-xs text-muted-foreground">
            {fieldId ? "Field metadata — edit in sidebar" : "Node-level metadata for this system"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onDeleteNode && (
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
          <label className="text-xs font-medium">{fieldId ? "Field name" : "Node name"}</label>
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

        {fieldId && onDeleteField && (
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
            No metadata attributes defined. Use the gear icon on a node group to create{" "}
            {SCHEMA_SCOPE_LABELS.global.short} and {SCHEMA_SCOPE_LABELS.group.short} attributes.
          </p>
        ) : (
          <>
            {globalProperties.length > 0 && (
              <MetadataSection
                title={SCHEMA_SCOPE_LABELS.global.title}
                icon={<Globe className="h-3.5 w-3.5" />}
                properties={globalProperties}
                localMetadata={localMetadata}
                onChange={handleChange}
              />
            )}
            {groupProperties.length > 0 && (
              <MetadataSection
                title={SCHEMA_SCOPE_LABELS.group.title}
                icon={<Layers className="h-3.5 w-3.5" />}
                properties={groupProperties}
                localMetadata={localMetadata}
                onChange={handleChange}
              />
            )}
          </>
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
  switch (property.type) {
    case "textarea":
      return (
        <div className="space-y-2 mb-4">
          <label className="text-xs font-medium">
            {property.name}
            {property.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <Textarea
            placeholder={`Enter ${property.name.toLowerCase()}...`}
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
            {property.name}
            {property.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <Select value={String(value || "")} onValueChange={onChange}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={`Select ${property.name.toLowerCase()}`} />
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
            {property.name}
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
            {property.name}
            {property.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <Input
            type="number"
            placeholder={`Enter ${property.name.toLowerCase()}...`}
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
            {property.name}
            {property.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <Select value={value ? "true" : "false"} onValueChange={(val) => onChange(val === "true")}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={property.name} />
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
            {property.name}
            {property.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <Input
            placeholder={`Enter ${property.name.toLowerCase()}...`}
            value={String(value || "")}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm"
          />
        </div>
      );
  }
}
