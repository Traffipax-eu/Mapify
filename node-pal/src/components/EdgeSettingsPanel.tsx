import { useCallback, useEffect, useRef, useState } from "react";
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
  ArrowDownToLine,
  ArrowUpFromLine,
  Radio,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Edge } from "reactflow";
import type { ConnectionSettings, ConnectionDirection } from "@/lib/connectionSettings";
import type { EdgeLineStyle, EdgePathType } from "@/lib/storage";
import { buildMarker } from "@/lib/edgeMarkers";
import {
  EDGE_SYNC_TYPE_OPTIONS,
  getSyncVisuals,
  isSemanticSyncType,
  resolveEdgeSyncType,
  type EdgeSyncType,
} from "@/lib/edgeSyncType";

type Props = {
  edge: Edge | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (edgeId: string, settings: ConnectionSettings, label: string, description: string) => void;
  onDelete: (edgeId: string) => void;
};

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
    pathType: data.controlPoints?.length ? "custom" : (data.pathType ?? "step"),
    lineStyle: data.lineStyle ?? "solid",
    syncType: resolveEdgeSyncType(data),
  };
}

export function EdgeSettingsPanel({ edge, isOpen, onClose, onUpdate, onDelete }: Props) {
  const [settings, setSettings] = useState<ConnectionSettings>({
    direction: "source-to-target",
    pathType: "step",
    lineStyle: "solid",
    syncType: "push",
  });
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const stateRef = useRef({ settings, label, description });

  stateRef.current = { settings, label, description };

  const flush = useCallback(
    (next: { settings: ConnectionSettings; label: string; description: string }) => {
      if (!edge) return;
      onUpdate(edge.id, next.settings, next.label, next.description);
    },
    [edge, onUpdate],
  );

  useEffect(() => {
    if (!edge) return;
    const nextSettings = edgeToSettings(edge);
    const nextLabel = edge.data?.label ?? "";
    const nextDescription = edge.data?.description ?? "";
    setSettings(nextSettings);
    setLabel(nextLabel);
    setDescription(nextDescription);
    stateRef.current = {
      settings: nextSettings,
      label: nextLabel,
      description: nextDescription,
    };
  }, [edge?.id]);

  const updateSettings = useCallback(
    (patch: Partial<ConnectionSettings>) => {
      setSettings((current) => {
        let nextSettings = { ...current, ...patch };

        if (patch.syncType) {
          const isSemantic = isSemanticSyncType(patch.syncType);
          const visuals = getSyncVisuals(patch.syncType);
          nextSettings = {
            ...nextSettings,
            // Semantic types lock the line style; "none" keeps the user's manual choice.
            lineStyle: isSemantic ? visuals.lineStyle : current.lineStyle,
            direction:
              patch.syncType === "api"
                ? "bidirectional"
                : nextSettings.direction === "bidirectional" && patch.syncType !== "api"
                  ? "source-to-target"
                  : nextSettings.direction,
          };
        }

        const next = { ...stateRef.current, settings: nextSettings };
        stateRef.current = next;
        flush(next);
        return nextSettings;
      });
    },
    [flush],
  );

  const updateLabel = useCallback(
    (value: string) => {
      setLabel(value);
      const next = { ...stateRef.current, label: value };
      stateRef.current = next;
      flush(next);
    },
    [flush],
  );

  const updateDescription = useCallback(
    (value: string) => {
      setDescription(value);
      const next = { ...stateRef.current, description: value };
      stateRef.current = next;
      flush(next);
    },
    [flush],
  );

  if (!isOpen || !edge) return null;

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

      <div className="edge-settings-panel__body edge-settings-panel__body--scroll">
        <OptionGroup
          label="Sync method"
          value={settings.syncType}
          onChange={(syncType) => updateSettings({ syncType })}
          options={[
            { id: "push" as EdgeSyncType, label: "Push", icon: <ArrowDownToLine className="h-3.5 w-3.5" /> },
            { id: "pull" as EdgeSyncType, label: "Pull", icon: <ArrowUpFromLine className="h-3.5 w-3.5" /> },
            { id: "stream" as EdgeSyncType, label: "Stream", icon: <Radio className="h-3.5 w-3.5" /> },
            { id: "api" as EdgeSyncType, label: "API", icon: <Webhook className="h-3.5 w-3.5" /> },
            { id: "none" as EdgeSyncType, label: "None / Custom", icon: <Minus className="h-3.5 w-3.5" /> },
          ]}
        />
        <p className="edge-settings__hint">
          {EDGE_SYNC_TYPE_OPTIONS.find((opt) => opt.id === settings.syncType)?.hint}
        </p>
        <OptionGroup
          label="Direction"
          value={settings.direction}
          onChange={(direction) => updateSettings({ direction })}
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
          onChange={(pathType) => updateSettings({ pathType })}
          options={[
            { id: "step", label: "Smooth step", icon: <CornerDownRight className="h-3.5 w-3.5" /> },
            { id: "custom", label: "Custom bend", icon: <Spline className="h-3.5 w-3.5" /> },
            { id: "bezier", label: "Curved", icon: <Spline className="h-3.5 w-3.5" /> },
            { id: "straight", label: "Straight", icon: <MoveHorizontal className="h-3.5 w-3.5" /> },
          ]}
        />
        {!isSemanticSyncType(settings.syncType) && (
          <OptionGroup
            label="Line style"
            value={settings.lineStyle}
            onChange={(lineStyle) => updateSettings({ lineStyle })}
            options={[
              { id: "solid", label: "Solid" },
              { id: "dashed", label: "Dashed" },
            ]}
          />
        )}

        <div className="edge-settings-panel__fields">
          <label className="edge-settings__label">
            Label
            <Input
              value={label}
              onChange={(event) => updateLabel(event.target.value)}
              placeholder="e.g. Nightly ETL or REST API"
            />
          </label>
          <label className="edge-settings__label">
            Description
            <Textarea
              value={description}
              onChange={(event) => updateDescription(event.target.value)}
              placeholder="Describe the data relationship..."
              rows={5}
            />
          </label>
        </div>
      </div>

      <div className="edge-settings-panel__footer">
        <Button
          type="button"
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => onDelete(edge.id)}
        >
          <Trash2 className="h-4 w-4" />
          Delete connection
        </Button>
      </div>
    </aside>
  );
}

export function applyConnectionSettingsToEdge(
  edge: Edge,
  settings: ConnectionSettings,
  label: string,
  description: string,
): Edge {
  const syncType = settings.syncType;
  // "none" honors the manual line style; semantic types lock it.
  const syncVisuals = getSyncVisuals(syncType, {
    manualLineStyle: settings.lineStyle,
  });
  const strokeColor = syncVisuals.strokeColor;

  let markerStartStyle = syncVisuals.markerStart;
  let markerEndStyle = syncVisuals.markerEnd;
  const lineStyle = syncVisuals.lineStyle;

  // push/pull/none let the user pick the arrow direction; stream/api are locked.
  if (syncType === "push" || syncType === "pull" || syncType === "none") {
    if (settings.direction === "source-to-target") {
      markerEndStyle = "arrowclosed";
      markerStartStyle = "none";
    } else if (settings.direction === "target-to-source") {
      markerStartStyle = "arrowclosed";
      markerEndStyle = "none";
    } else if (settings.direction === "bidirectional") {
      markerStartStyle = "arrowclosed";
      markerEndStyle = "arrowclosed";
    } else {
      markerStartStyle = "none";
      markerEndStyle = "none";
    }
  }

  const resetBends = settings.pathType !== "custom";

  return {
    ...edge,
    animated: syncVisuals.animated,
    markerStart: buildMarker(markerStartStyle, strokeColor),
    markerEnd: buildMarker(markerEndStyle, strokeColor),
    data: {
      ...edge.data,
      label,
      description,
      syncType,
      pathType: settings.pathType as EdgePathType,
      lineStyle: lineStyle as EdgeLineStyle,
      markerStart: markerStartStyle,
      markerEnd: markerEndStyle,
      controlPoints: resetBends ? undefined : edge.data?.controlPoints,
    },
  };
}
