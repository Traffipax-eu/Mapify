import { memo, useState } from "react";
import { NodeResizer, type NodeProps } from "reactflow";
import { useNodeCanvas } from "@/contexts/NodeCanvasContext";

export type StickyNoteVariant = "yellow" | "teal";

export type StickyNoteData = {
  content: string;
  variant?: StickyNoteVariant;
  /** @deprecated legacy color field */
  color?: string;
};

const VARIANTS: Record<StickyNoteVariant, { label: string }> = {
  yellow: { label: "Yellow" },
  teal: { label: "Teal" },
};

function StickyNoteImpl({ id, data, selected }: NodeProps<StickyNoteData>) {
  const { onDeleteNode, onUpdateStickyNoteData } = useNodeCanvas();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(data.content || "");
  const variant: StickyNoteVariant = data.variant ?? (data.color === "#ccfbf1" ? "teal" : "yellow");

  const stopPointer = (event: React.PointerEvent | React.MouseEvent) => {
    event.stopPropagation();
  };

  const handleSave = () => {
    const next = content.trim() || "New note...";
    setContent(next);
    onUpdateStickyNoteData(id, (current) => ({ ...current, content: next, variant }));
    setEditing(false);
  };

  const cycleVariant = () => {
    const nextVariant: StickyNoteVariant = variant === "yellow" ? "teal" : "yellow";
    onUpdateStickyNoteData(id, (current) => ({ ...current, variant: nextVariant }));
  };

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={140}
        minHeight={110}
        lineClassName="sticky-note__resizer-line"
        handleClassName="sticky-note__resizer-handle"
      />
      <div
        className={`sticky-note sticky-note--${variant} ${selected ? "sticky-note--selected" : ""}`}
        style={{ width: "100%", height: "100%" }}
      >
        <div className="sticky-note__curl" aria-hidden />

        <button
          type="button"
          className="sticky-note__delete nodrag nopan"
          onPointerDown={stopPointer}
          onClick={(event) => {
            event.stopPropagation();
            onDeleteNode(id);
          }}
          title="Delete note"
          aria-label="Delete note"
        >
          ×
        </button>

        <button
          type="button"
          className="sticky-note__color-toggle nodrag nopan"
          onPointerDown={stopPointer}
          onClick={(event) => {
            event.stopPropagation();
            cycleVariant();
          }}
          title={`Switch to ${variant === "yellow" ? VARIANTS.teal.label : VARIANTS.yellow.label}`}
          aria-label="Change note color"
        />

        {editing ? (
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onBlur={handleSave}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setContent(data.content || "");
                setEditing(false);
              }
            }}
            autoFocus
            className="sticky-note__textarea nodrag nopan nowheel"
            onPointerDown={stopPointer}
          />
        ) : (
          <div className="sticky-note__content" onDoubleClick={() => setEditing(true)}>
            {content || "Double-click to edit..."}
          </div>
        )}

        <span className="sticky-note__resize-grip nodrag nopan" aria-hidden />
      </div>
    </>
  );
}

export const StickyNoteNode = memo(StickyNoteImpl);
