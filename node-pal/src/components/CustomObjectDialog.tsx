import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NODE_ICON_OPTIONS, type NodeIconId } from "@/lib/nodeIcons";
import { CUSTOM_OBJECT_COLOR_PALETTE } from "@/lib/customObjects";

export type CustomObjectConfig = {
  label: string;
  iconId: NodeIconId;
  accent: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: CustomObjectConfig) => void;
  initial?: Partial<CustomObjectConfig>;
};

const DEFAULT_CONFIG: CustomObjectConfig = {
  label: "Custom Object",
  iconId: "box",
  accent: CUSTOM_OBJECT_COLOR_PALETTE[0],
};

export function CustomObjectDialog({ open, onOpenChange, onConfirm, initial }: Props) {
  const [label, setLabel] = useState(initial?.label ?? DEFAULT_CONFIG.label);
  const [iconId, setIconId] = useState<NodeIconId>(initial?.iconId ?? DEFAULT_CONFIG.iconId);
  const [accent, setAccent] = useState(initial?.accent ?? DEFAULT_CONFIG.accent);

  useEffect(() => {
    if (!open) return;
    setLabel(initial?.label ?? DEFAULT_CONFIG.label);
    setIconId(initial?.iconId ?? DEFAULT_CONFIG.iconId);
    setAccent(initial?.accent ?? DEFAULT_CONFIG.accent);
  }, [open, initial?.label, initial?.iconId, initial?.accent]);

  const SelectedIcon = NODE_ICON_OPTIONS.find((option) => option.id === iconId)?.Icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create custom object</DialogTitle>
          <DialogDescription>Pick an icon and color, then name your object.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-center">
            <div
              className="custom-object-node custom-object-node--preview"
              style={{ "--object-accent": accent } as React.CSSProperties}
            >
              <div className="custom-object-node__card">
                <div className="custom-object-node__icon-wrap" aria-hidden>
                  {SelectedIcon ? <SelectedIcon className="custom-object-node__icon" /> : null}
                </div>
                <span className="custom-object-node__label">{label.trim() || "Custom Object"}</span>
              </div>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Label</span>
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Object name" />
          </label>

          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Icon</span>
            <div className="grid grid-cols-6 gap-2">
              {NODE_ICON_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`custom-object-dialog__icon-pick ${iconId === option.id ? "is-active" : ""}`}
                  onClick={() => setIconId(option.id)}
                  title={option.label}
                >
                  <option.Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Color</span>
            <div className="flex flex-wrap gap-2">
              {CUSTOM_OBJECT_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`custom-object-dialog__color-swatch ${accent === color ? "is-active" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setAccent(color)}
                  title={color}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
            <Input
              type="color"
              value={accent}
              onChange={(event) => setAccent(event.target.value)}
              className="h-9 w-full cursor-pointer"
              aria-label="Custom hex color"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm({
                label: label.trim() || "Custom Object",
                iconId,
                accent,
              });
              onOpenChange(false);
            }}
          >
            Add to canvas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
