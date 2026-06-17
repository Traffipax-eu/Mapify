import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Minus,
  Spline,
  CornerDownRight,
  MoveHorizontal,
  X,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Edge } from "reactflow";
import type { ConnectionSettings, ConnectionDirection } from "@/lib/connectionSettings";
import type { EdgeLineStyle, EdgePathType } from "@/lib/storage";
import { buildMarker } from "@/lib/edgeMarkers";

type Props = {
  edge: Edge | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (edgeId: string, settings: ConnectionSettings, label: string, description: string) => void;
  onDelete: (edgeId: string) => void;
};

const STEPS = ["Connection", "Details", "Review"] as const;

function OptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="edge-settings__group">
      <span className="edge-settings__label">{label}</span>
      <div className="edge-settings__options">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`edge-settings__option ${value === opt.id ? "is-active" : ""}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function edgeToSettings(edge: Edge): ConnectionSettings {
  const data = edge.data ?? {};
  let direction: ConnectionDirection = "source-to-target";
  if (data.markerStart === "arrowclosed" && data.markerEnd === "arrowclosed") {
    direction = "bidirectional";
  } else if (data.markerStart === "arrowclosed") {
    direction = "target-to-source";
  } else if (data.markerEnd === "arrowclosed") {
    direction = "source-to-target";
  } else if (data.markerStart === "none" && data.markerEnd === "none") {
    direction = "none";
  }

  return {
    direction,
    pathType: data.pathType ?? "step",
    lineStyle: data.lineStyle ?? "solid",
  };
}

export function EdgeSettingsPanel({ edge, isOpen, onClose, onUpdate, onDelete }: Props) {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<ConnectionSettings>({
    direction: "source-to-target",
    pathType: "step",
    lineStyle: "solid",
  });
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!edge) return;
    setSettings(edgeToSettings(edge));
    setLabel(edge.data?.label ?? "");
    setDescription(edge.data?.description ?? "");
    setStep(0);
  }, [edge?.id, edge]);

  if (!isOpen || !edge) return null;

  const applyChanges = () => {
    onUpdate(edge.id, settings, label, description);
    onClose();
  };

  return (
    <aside className={`edge-settings-panel ${isOpen ? "is-open" : ""}`} aria-label="Connection settings">
      <div className="edge-settings-panel__header">
        <div>
          <p className="edge-settings-panel__eyebrow">Relationship</p>
          <h2 className="edge-settings-panel__title">Edit connection</h2>
        </div>
        <button type="button" className="edge-settings-panel__close" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="edge-settings-panel__steps">
        {STEPS.map((name, index) => (
          <button
            key={name}
            type="button"
            className={`edge-settings-panel__step ${step === index ? "is-active" : ""} ${step > index ? "is-done" : ""}`}
            onClick={() => setStep(index)}
          >
            <span>{index + 1}</span>
            {name}
          </button>
        ))}
      </div>

      <div className="edge-settings-panel__body">
        {step === 0 && (
          <>
            <OptionGroup
              label="Direction"
              value={settings.direction}
              onChange={(direction) => setSettings((current) => ({ ...current, direction }))}
              options={[
                { id: "source-to-target", label: "Source → Target", icon: <ArrowRight className="h-3.5 w-3.5" /> },
                { id: "target-to-source", label: "Target → Source", icon: <ArrowLeft className="h-3.5 w-3.5" /> },
                { id: "bidirectional", label: "Bidirectional", icon: <ArrowLeftRight className="h-3.5 w-3.5" /> },
                { id: "none", label: "None", icon: <Minus className="h-3.5 w-3.5" /> },
              ]}
            />
            <OptionGroup
              label="Path"
              value={settings.pathType}
              onChange={(pathType) => setSettings((current) => ({ ...current, pathType }))}
              options={[
                { id: "step", label: "Smooth step", icon: <CornerDownRight className="h-3.5 w-3.5" /> },
                { id: "custom", label: "Custom bend", icon: <Spline className="h-3.5 w-3.5" /> },
                { id: "bezier", label: "Curved", icon: <Spline className="h-3.5 w-3.5" /> },
                { id: "straight", label: "Straight", icon: <MoveHorizontal className="h-3.5 w-3.5" /> },
              ]}
            />
            <OptionGroup
              label="Line style"
              value={settings.lineStyle}
              onChange={(lineStyle) => setSettings((current) => ({ ...current, lineStyle }))}
              options={[
                { id: "solid", label: "Solid" },
                { id: "dashed", label: "Dashed" },
              ]}
            />
          </>
        )}

        {step === 1 && (
          <div className="edge-settings-panel__fields">
            <label className="edge-settings__label">
              Label
              <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Short label" />
            </label>
            <label className="edge-settings__label">
              Description
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the data relationship..."
                rows={5}
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="edge-settings-panel__review">
            <p>
              <strong>Direction:</strong> {settings.direction}
            </p>
            <p>
              <strong>Path:</strong> {settings.pathType}
            </p>
            <p>
              <strong>Style:</strong> {settings.lineStyle}
            </p>
            {label && (
              <p>
                <strong>Label:</strong> {label}
              </p>
            )}
            {description && (
              <p>
                <strong>Description:</strong> {description}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="edge-settings-panel__footer">
        {step < STEPS.length - 1 ? (
          <Button type="button" className="w-full" onClick={() => setStep((current) => current + 1)}>
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" className="w-full" onClick={applyChanges}>
            Apply changes
          </Button>
        )}
        <div className="edge-settings-panel__footer-row">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)}>
              Back
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(edge.id)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function applyConnectionSettingsToEdge(edge: Edge, settings: ConnectionSettings, label: string, description: string): Edge {
  const strokeColor = "#3b82f6";
  let markerStartStyle: "none" | "arrowclosed" = "none";
  let markerEndStyle: "none" | "arrowclosed" = "none";

  if (settings.direction === "source-to-target") {
    markerEndStyle = "arrowclosed";
  } else if (settings.direction === "target-to-source") {
    markerStartStyle = "arrowclosed";
  } else if (settings.direction === "bidirectional") {
    markerStartStyle = "arrowclosed";
    markerEndStyle = "arrowclosed";
  }

  return {
    ...edge,
    markerStart: buildMarker(markerStartStyle, strokeColor),
    markerEnd: buildMarker(markerEndStyle, strokeColor),
    data: {
      ...edge.data,
      label,
      description,
      pathType: settings.pathType as EdgePathType,
      lineStyle: settings.lineStyle as EdgeLineStyle,
      markerStart: markerStartStyle,
      markerEnd: markerEndStyle,
      controlPoints:
        settings.pathType === "custom" || settings.pathType === "bezier"
          ? edge.data?.controlPoints
          : undefined,
    },
  };
}
