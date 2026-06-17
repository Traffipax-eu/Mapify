import { useState } from "react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#64748b", // slate
  "#f97316", // orange
  "#14b8a6", // teal
];

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          style={{ backgroundColor: value || "#3b82f6" }}
        >
          <div className="h-full w-full" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid grid-cols-5 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                onChange(color);
                setOpen(false);
              }}
              className="h-8 w-8 rounded-md border-2 border-transparent hover:border-foreground transition-all"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <input
            type="color"
            value={value || "#3b82f6"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 rounded-md cursor-pointer"
            title="Custom color"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
