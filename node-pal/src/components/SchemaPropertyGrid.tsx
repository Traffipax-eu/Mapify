import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PropertyDefinition, PropertyType } from "@/lib/storage";

const TYPE_LABELS: Record<PropertyType, string> = {
  text: "Text",
  textarea: "Long text",
  select: "Select",
  date: "Date",
  number: "Number",
  boolean: "Yes / No",
};

type Props = {
  properties: PropertyDefinition[];
  onChange: (properties: PropertyDefinition[]) => void;
};

type EditingTarget = { propertyId: string; field: "name" | "type" | "options" } | null;

export function SchemaPropertyGrid({ properties, onChange }: Props) {
  const safeProperties = Array.isArray(properties) ? properties : [];
  const propertiesRef = useRef(safeProperties);
  propertiesRef.current = safeProperties;

  const [editing, setEditing] = useState<EditingTarget>(null);
  const pendingFocusRef = useRef<"name" | "type" | "options" | null>(null);

  const updateProperty = useCallback(
    (propertyId: string, patch: Partial<PropertyDefinition>) => {
      onChange(
        propertiesRef.current.map((property) =>
          property.id === propertyId ? { ...property, ...patch } : property,
        ),
      );
    },
    [onChange],
  );

  const removeProperty = useCallback(
    (propertyId: string) => {
      onChange(propertiesRef.current.filter((property) => property.id !== propertyId));
      setEditing(null);
    },
    [onChange],
  );

  const addProperty = useCallback(() => {
    const property: PropertyDefinition = {
      id: `prop_${Date.now()}`,
      name: "",
      type: "text",
    };
    onChange([...propertiesRef.current, property]);
    pendingFocusRef.current = "name";
    setEditing({ propertyId: property.id, field: "name" });
  }, [onChange]);

  return (
    <div className="metadata-kv-grid schema-property-grid">
      {safeProperties.length > 0 && (
        <div className="metadata-kv-grid__header">
          <span>Property</span>
          <span>Type</span>
          <span className="sr-only">Actions</span>
        </div>
      )}

      {safeProperties.map((property) => (
        <SchemaPropertyRow
          key={property.id}
          property={property}
          editing={editing}
          pendingFocusRef={pendingFocusRef}
          onStartEdit={(field) => setEditing({ propertyId: property.id, field })}
          onUpdate={(patch) => updateProperty(property.id, patch)}
          onRemove={() => removeProperty(property.id)}
          onCancel={() => setEditing(null)}
        />
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="metadata-kv-grid__add"
        onClick={addProperty}
      >
        <Plus className="h-3.5 w-3.5" />
        Add property
      </Button>
    </div>
  );
}

function SchemaPropertyRow({
  property,
  editing,
  pendingFocusRef,
  onStartEdit,
  onUpdate,
  onRemove,
  onCancel,
}: {
  property: PropertyDefinition;
  editing: EditingTarget;
  pendingFocusRef: React.MutableRefObject<"name" | "type" | "options" | null>;
  onStartEdit: (field: "name" | "type" | "options") => void;
  onUpdate: (patch: Partial<PropertyDefinition>) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const optionsInputRef = useRef<HTMLInputElement>(null);
  const isEditingName = editing?.propertyId === property.id && editing.field === "name";
  const isEditingType = editing?.propertyId === property.id && editing.field === "type";
  const isEditingOptions = editing?.propertyId === property.id && editing.field === "options";
  const [nameDraft, setNameDraft] = useState(property.name);
  const [optionsDraft, setOptionsDraft] = useState(property.options?.join(", ") ?? "");

  useEffect(() => {
    setNameDraft(property.name);
    setOptionsDraft(property.options?.join(", ") ?? "");
  }, [property.name, property.options, property.id]);

  useEffect(() => {
    if (!isEditingName && !isEditingOptions) return;
    const focusField = pendingFocusRef.current ?? (isEditingName ? "name" : "options");
    pendingFocusRef.current = null;
    const target = focusField === "name" ? nameInputRef.current : optionsInputRef.current;
    requestAnimationFrame(() => {
      target?.focus();
      target?.select();
    });
  }, [isEditingName, isEditingOptions, pendingFocusRef]);

  const commitName = () => {
    const nextName = nameDraft.trim();
    onUpdate({ name: nextName });
    onCancel();
  };

  const commitOptions = () => {
    const options = optionsDraft
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);
    onUpdate({ options });
    onCancel();
  };

  return (
    <div className="schema-property-grid__block">
      <div className="metadata-kv-grid__row group">
        <div className="metadata-kv-grid__cell metadata-kv-grid__cell--key">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitName();
                }
                if (e.key === "Escape") onCancel();
              }}
              className="metadata-kv-grid__input"
              placeholder="Property name"
            />
          ) : (
            <button
              type="button"
              className="metadata-kv-grid__display"
              onClick={() => onStartEdit("name")}
            >
              {property.name.trim() || (
                <span className="metadata-kv-grid__placeholder">Property name</span>
              )}
            </button>
          )}
        </div>

        <div className="metadata-kv-grid__cell metadata-kv-grid__cell--value">
          {isEditingType ? (
            <select
              autoFocus
              value={property.type ?? "text"}
              onChange={(e) => {
                onUpdate({ type: e.target.value as PropertyType });
                onCancel();
              }}
              onBlur={onCancel}
              className="metadata-kv-grid__input metadata-kv-grid__select"
            >
              {(Object.keys(TYPE_LABELS) as PropertyType[]).map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              className="metadata-kv-grid__display"
              onClick={() => onStartEdit("type")}
            >
              {TYPE_LABELS[property.type ?? "text"]}
            </button>
          )}
        </div>

        <button
          type="button"
          className="metadata-kv-grid__remove"
          onClick={onRemove}
          title="Remove property"
          aria-label="Remove property"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {property.type === "select" && (
        <div className="schema-property-grid__options">
          {isEditingOptions ? (
            <input
              ref={optionsInputRef}
              value={optionsDraft}
              onChange={(e) => setOptionsDraft(e.target.value)}
              onBlur={commitOptions}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitOptions();
                }
                if (e.key === "Escape") onCancel();
              }}
              className="metadata-kv-grid__input"
              placeholder="Options (comma-separated)"
            />
          ) : (
            <button
              type="button"
              className="schema-property-grid__options-btn"
              onClick={() => onStartEdit("options")}
            >
              {property.options?.length
                ? property.options.join(", ")
                : "Add select options…"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
