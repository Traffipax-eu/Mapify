import { useState } from "react";
import { ArrowLeft, ArrowRight, ArrowLeftRight, Minus, Spline, CornerDownRight, MoveHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConnectionSettings } from "@/lib/connectionSettings";
import { DEFAULT_CONNECTION_SETTINGS } from "@/lib/connectionSettings";

import type { ConnectionSettings } from "@/lib/connectionSettings";

type Props = {
  position: { x: number; y: number };
  onConfirm: (settings: ConnectionSettings) => void;
  onCancel: () => void;
};

const DEFAULT_SETTINGS: ConnectionSettings = DEFAULT_CONNECTION_SETTINGS;

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
    <div className="connection-modal__group">
      <span className="connection-modal__label">{label}</span>
      <div className="connection-modal__options">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`connection-modal__option ${value === opt.id ? "is-active" : ""}`}
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

export function ConnectionSettingsModal({ position, onConfirm, onCancel }: Props) {
  const [settings, setSettings] = useState<ConnectionSettings>(DEFAULT_SETTINGS);

  const clampedX = Math.min(Math.max(position.x, 160), window.innerWidth - 160);
  const clampedY = Math.min(Math.max(position.y, 120), window.innerHeight - 80);

  return (
    <>
      <div className="connection-modal__backdrop" onClick={onCancel} aria-hidden />
      <div
        className="connection-modal"
        style={{ left: clampedX, top: clampedY }}
        role="dialog"
        aria-label="Connection settings"
      >
        <p className="connection-modal__title">Connection settings</p>

        <OptionGroup
          label="Direction"
          value={settings.direction}
          onChange={(direction) => setSettings((s) => ({ ...s, direction }))}
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
          onChange={(pathType) => setSettings((s) => ({ ...s, pathType }))}
          options={[
            { id: "straight", label: "Straight", icon: <MoveHorizontal className="h-3.5 w-3.5" /> },
            { id: "step", label: "Step", icon: <CornerDownRight className="h-3.5 w-3.5" /> },
            { id: "bezier", label: "Curved", icon: <Spline className="h-3.5 w-3.5" /> },
          ]}
        />

        <OptionGroup
          label="Line style"
          value={settings.lineStyle}
          onChange={(lineStyle) => setSettings((s) => ({ ...s, lineStyle }))}
          options={[
            { id: "solid", label: "Solid" },
            { id: "dashed", label: "Dashed" },
          ]}
        />

        <div className="connection-modal__actions">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onConfirm(settings)}>
            Confirm
          </Button>
        </div>
      </div>
    </>
  );
}
