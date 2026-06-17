import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Schema, PropertyDefinition } from "@/lib/storage";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";
import { SchemaPropertyGrid } from "@/components/SchemaPropertyGrid";
import type { Dispatch, SetStateAction } from "react";

interface SchemaEditorSidebarProps {
  isOpen: boolean;
  groupId: string | null;
  schema: Schema;
  onUpdateSchema: Dispatch<SetStateAction<Schema>>;
  onClose: () => void;
}

export function SchemaEditorSidebar({
  isOpen,
  groupId,
  schema,
  onUpdateSchema,
  onClose,
}: SchemaEditorSidebarProps) {
  if (!isOpen || !groupId) return null;

  const group = schema.nodeGroups.find((item) => item.id === groupId);
  if (!group) return null;

  const globalProperties = schema.globalProperties ?? [];

  const updateGlobalProperties = (properties: PropertyDefinition[]) => {
    onUpdateSchema((prev) => ({
      ...prev,
      globalProperties: properties,
      timestamp: Date.now(),
    }));
  };

  const updateGroupProperties = (properties: PropertyDefinition[]) => {
    onUpdateSchema((prev) => ({
      ...prev,
      nodeGroups: prev.nodeGroups.map((item) =>
        item.id === groupId ? { ...item, properties } : item,
      ),
      timestamp: Date.now(),
    }));
  };

  const updateGroupName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onUpdateSchema((prev) => ({
      ...prev,
      nodeGroups: prev.nodeGroups.map((item) =>
        item.id === groupId ? { ...item, name: trimmed } : item,
      ),
      timestamp: Date.now(),
    }));
  };

  const updateGroupColor = (color: string) => {
    onUpdateSchema((prev) => ({
      ...prev,
      nodeGroups: prev.nodeGroups.map((item) =>
        item.id === groupId ? { ...item, color } : item,
      ),
      timestamp: Date.now(),
    }));
  };

  return (
    <div className="schema-editor-sidebar">
      <div className="schema-editor-sidebar__header">
        <div className="min-w-0">
          <p className="schema-editor-sidebar__eyebrow">Schema Editor</p>
          <h2 className="schema-editor-sidebar__title">{group.name}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close schema editor">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="schema-editor-sidebar__body">
        <div className="schema-editor-sidebar__group-meta">
          <label className="schema-editor-sidebar__label">Group name</label>
          <Input
            key={group.id}
            defaultValue={group.name}
            onBlur={(e) => updateGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateGroupName(e.currentTarget.value);
            }}
            className="schema-editor-sidebar__input"
          />
          <label className="schema-editor-sidebar__label">Accent color</label>
          <input
            type="color"
            value={group.color || "#5b8fd9"}
            onChange={(e) => updateGroupColor(e.target.value)}
            className="schema-editor-sidebar__color"
          />
        </div>

        <section className="schema-editor-sidebar__section">
          <div className="schema-editor-sidebar__section-head">
            <h3>{SCHEMA_SCOPE_LABELS.global.title}</h3>
            <p>{SCHEMA_SCOPE_LABELS.global.description}</p>
          </div>
          <SchemaPropertyGrid properties={globalProperties} onChange={updateGlobalProperties} />
        </section>

        <section className="schema-editor-sidebar__section">
          <div className="schema-editor-sidebar__section-head">
            <h3>{SCHEMA_SCOPE_LABELS.group.title}</h3>
            <p>{SCHEMA_SCOPE_LABELS.group.description}</p>
          </div>
          <SchemaPropertyGrid properties={group.properties ?? []} onChange={updateGroupProperties} />
        </section>
      </div>
    </div>
  );
}
