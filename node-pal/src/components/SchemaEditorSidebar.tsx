import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Schema, PropertyDefinition } from "@/lib/storage";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";
import { SchemaPropertyGrid } from "@/components/SchemaPropertyGrid";
import type { Dispatch, SetStateAction } from "react";
import { getCustomObjectDefinition } from "@/lib/customObjects";

interface SchemaEditorSidebarProps {
  isOpen: boolean;
  groupId: string | null;
  customObjectId: string | null;
  schema: Schema;
  onUpdateSchema: Dispatch<SetStateAction<Schema>>;
  onClose: () => void;
}

export function SchemaEditorSidebar({
  isOpen,
  groupId,
  customObjectId,
  schema,
  onUpdateSchema,
  onClose,
}: SchemaEditorSidebarProps) {
  if (!isOpen) return null;

  const isArtifact = Boolean(customObjectId);
  const group = !isArtifact && groupId ? schema.nodeGroups.find((item) => item.id === groupId) : null;
  const artifact =
    isArtifact && customObjectId
      ? schema.customObjectSchemas?.find((item) => item.id === customObjectId)
      : null;
  const artifactDefinition = customObjectId ? getCustomObjectDefinition(customObjectId) : undefined;

  if (!group && !artifact) return null;

  const title = group?.name ?? artifact?.name ?? artifactDefinition?.label ?? "Schema";
  const globalProperties = schema.globalProperties ?? [];

  const updateGlobalProperties = (properties: PropertyDefinition[]) => {
    onUpdateSchema((prev) => ({
      ...prev,
      globalProperties: properties,
      timestamp: Date.now(),
    }));
  };

  const updateFieldProperties = (properties: PropertyDefinition[]) => {
    if (isArtifact && customObjectId) {
      onUpdateSchema((prev) => ({
        ...prev,
        customObjectSchemas: (prev.customObjectSchemas ?? []).map((item) =>
          item.id === customObjectId ? { ...item, properties } : item,
        ),
        timestamp: Date.now(),
      }));
      return;
    }

    if (!groupId) return;
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
    if (!trimmed || !groupId || isArtifact) return;
    onUpdateSchema((prev) => ({
      ...prev,
      nodeGroups: prev.nodeGroups.map((item) =>
        item.id === groupId ? { ...item, name: trimmed } : item,
      ),
      timestamp: Date.now(),
    }));
  };

  const updateGroupColor = (color: string) => {
    if (!groupId || isArtifact) return;
    onUpdateSchema((prev) => ({
      ...prev,
      nodeGroups: prev.nodeGroups.map((item) =>
        item.id === groupId ? { ...item, color } : item,
      ),
      timestamp: Date.now(),
    }));
  };

  const updateArtifactName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || !customObjectId || !isArtifact) return;
    onUpdateSchema((prev) => ({
      ...prev,
      customObjectSchemas: (prev.customObjectSchemas ?? []).map((item) =>
        item.id === customObjectId ? { ...item, name: trimmed } : item,
      ),
      timestamp: Date.now(),
    }));
  };

  const fieldProperties = isArtifact ? (artifact?.properties ?? []) : (group?.properties ?? []);

  return (
    <div className="schema-editor-sidebar">
      <div className="schema-editor-sidebar__header">
        <div className="min-w-0">
          <p className="schema-editor-sidebar__eyebrow">
            {isArtifact ? "Data Asset Schema" : "Schema Editor"}
          </p>
          <h2 className="schema-editor-sidebar__title">{title}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close schema editor">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="schema-editor-sidebar__body">
        <div className="schema-editor-sidebar__group-meta">
          <label className="schema-editor-sidebar__label">
            {isArtifact ? "Asset type name" : "Block name"}
          </label>
          <Input
            key={isArtifact ? customObjectId : group?.id}
            defaultValue={title}
            onBlur={(e) =>
              isArtifact ? updateArtifactName(e.target.value) : updateGroupName(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                isArtifact
                  ? updateArtifactName(e.currentTarget.value)
                  : updateGroupName(e.currentTarget.value);
              }
            }}
            className="schema-editor-sidebar__input"
          />
          {!isArtifact && group && (
            <>
              <label className="schema-editor-sidebar__label">Accent color</label>
              <input
                type="color"
                value={group.color || "#5b8fd9"}
                onChange={(e) => updateGroupColor(e.target.value)}
                className="schema-editor-sidebar__color"
              />
            </>
          )}
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
            <p>
              {isArtifact
                ? "Apply only to fields in this data asset (columns and keys)."
                : SCHEMA_SCOPE_LABELS.group.description}
            </p>
          </div>
          <SchemaPropertyGrid properties={fieldProperties} onChange={updateFieldProperties} />
        </section>
      </div>
    </div>
  );
}
