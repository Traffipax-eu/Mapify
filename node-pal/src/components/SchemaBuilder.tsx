import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Globe, Layers } from "lucide-react";
import type { Schema, NodeGroupSchema, PropertyDefinition, PropertyType } from "@/lib/storage";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";
import type { Dispatch, SetStateAction } from "react";

interface SchemaBuilderProps {
  schema: Schema;
  onUpdateSchema: Dispatch<SetStateAction<Schema>>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  focusGroupId?: string | null;
}

export function SchemaBuilder({
  schema,
  onUpdateSchema,
  isOpen = false,
  onOpenChange,
  focusGroupId,
}: SchemaBuilderProps) {
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const focusedGroup = focusGroupId
    ? schema.nodeGroups.find((group) => group.id === focusGroupId)
    : null;

  useEffect(() => {
    if (focusGroupId && isOpen) {
      const node = groupRefs.current[focusGroupId];
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isOpen, focusGroupId]);

  const addGlobalProperty = () => {
    const newProperty: PropertyDefinition = {
      id: `prop_${Date.now()}`,
      name: "New Attribute",
      type: "text",
    };
    onUpdateSchema((prev) => ({
      ...prev,
      globalProperties: [...(prev.globalProperties ?? []), newProperty],
    }));
  };

  const updateGlobalProperty = (propertyId: string, updates: Partial<PropertyDefinition>) => {
    onUpdateSchema((prev) => ({
      ...prev,
      globalProperties: (prev.globalProperties ?? []).map((property) =>
        property.id === propertyId ? { ...property, ...updates } : property,
      ),
    }));
  };

  const deleteGlobalProperty = (propertyId: string) => {
    onUpdateSchema((prev) => ({
      ...prev,
      globalProperties: (prev.globalProperties ?? []).filter((property) => property.id !== propertyId),
    }));
  };

  const addGroupProperty = (groupId: string) => {
    const newProperty: PropertyDefinition = {
      id: `prop_${Date.now()}`,
      name: "New Attribute",
      type: "text",
    };
    onUpdateSchema((prev) => ({
      ...prev,
      nodeGroups: prev.nodeGroups.map((group) =>
        group.id === groupId ? { ...group, properties: [...group.properties, newProperty] } : group,
      ),
    }));
  };

  const updateGroupProperty = (
    groupId: string,
    propertyId: string,
    updates: Partial<PropertyDefinition>,
  ) => {
    onUpdateSchema((prev) => ({
      ...prev,
      nodeGroups: prev.nodeGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              properties: group.properties.map((property) =>
                property.id === propertyId ? { ...property, ...updates } : property,
              ),
            }
          : group,
      ),
    }));
  };

  const deleteGroupProperty = (groupId: string, propertyId: string) => {
    onUpdateSchema((prev) => ({
      ...prev,
      nodeGroups: prev.nodeGroups.map((group) =>
        group.id === groupId
          ? { ...group, properties: group.properties.filter((property) => property.id !== propertyId) }
          : group,
      ),
    }));
  };

  const updateNodeGroup = (groupId: string, updates: Partial<NodeGroupSchema>) => {
    onUpdateSchema((prev) => ({
      ...prev,
      nodeGroups: prev.nodeGroups.map((group) => (group.id === groupId ? { ...group, ...updates } : group)),
    }));
  };

  const groupsToShow = focusedGroup ? [focusedGroup] : schema.nodeGroups;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {focusedGroup ? `Schema: ${focusedGroup.name}` : "Schema Editor"}
          </DialogTitle>
          <DialogDescription>
            Define {SCHEMA_SCOPE_LABELS.global.title.toLowerCase()} and{" "}
            {SCHEMA_SCOPE_LABELS.group.title.toLowerCase()}. No metadata is predefined — create everything
            you need.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          <section className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold">{SCHEMA_SCOPE_LABELS.global.title}</h3>
                  <p className="text-xs text-muted-foreground">{SCHEMA_SCOPE_LABELS.global.description}</p>
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                onClick={addGlobalProperty}
                aria-label={`Add ${SCHEMA_SCOPE_LABELS.global.short} attribute`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(schema.globalProperties ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">
                No {SCHEMA_SCOPE_LABELS.global.short} attributes yet.
              </p>
            ) : (
              <div className="space-y-2">
                {(schema.globalProperties ?? []).map((property) => (
                  <PropertyEditor
                    key={property.id}
                    property={property}
                    onUpdate={(updates) => updateGlobalProperty(property.id, updates)}
                    onDelete={() => deleteGlobalProperty(property.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">{SCHEMA_SCOPE_LABELS.group.title}</h3>
                <p className="text-xs text-muted-foreground">{SCHEMA_SCOPE_LABELS.group.description}</p>
              </div>
            </div>

            {groupsToShow.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Create a node group in the left sidebar to define {SCHEMA_SCOPE_LABELS.group.short} attributes.
              </p>
            ) : (
              groupsToShow.map((group) => (
                <div
                  key={group.id}
                  ref={(el) => {
                    groupRefs.current[group.id] = el;
                  }}
                  className={`rounded-xl border p-4 space-y-3 ${
                    focusGroupId === group.id ? "border-primary ring-2 ring-primary/20" : "border-border"
                  }`}
                >
                  <Input
                    value={group.name}
                    onChange={(e) => updateNodeGroup(group.id, { name: e.target.value })}
                    className="font-medium"
                    placeholder="Group name"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {SCHEMA_SCOPE_LABELS.group.title}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                      onClick={() => addGroupProperty(group.id)}
                      aria-label={`Add ${SCHEMA_SCOPE_LABELS.group.short} attribute`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {group.properties.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No {SCHEMA_SCOPE_LABELS.group.short} attributes yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {group.properties.map((property) => (
                        <PropertyEditor
                          key={property.id}
                          property={property}
                          onUpdate={(updates) => updateGroupProperty(group.id, property.id, updates)}
                          onDelete={() => deleteGroupProperty(group.id, property.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PropertyEditor({
  property,
  onUpdate,
  onDelete,
}: {
  property: PropertyDefinition;
  onUpdate: (updates: Partial<PropertyDefinition>) => void;
  onDelete: () => void;
}) {
  const optionsText = property.options?.join(", ") ?? "";

  const handleOptionsChange = (value: string) => {
    const options = value
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);
    onUpdate({ options });
  };

  return (
    <div className="flex items-start gap-2 p-2.5 bg-muted/60 rounded-lg border border-border/60">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={property.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Attribute name"
            className="flex-1 h-8 text-sm"
          />
          <Select
            value={property.type ?? "text"}
            onValueChange={(value: PropertyType) => onUpdate({ type: value })}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="textarea">Textarea</SelectItem>
              <SelectItem value="select">Select</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {property.type === "select" && (
          <Input
            defaultValue={optionsText}
            onBlur={(e) => handleOptionsChange(e.target.value)}
            placeholder="Options (comma-separated)"
            className="text-xs h-8"
          />
        )}
      </div>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
