import { memo, useCallback } from "react";
import { NodeResizer, type NodeProps } from "reactflow";
import { Pencil, Trash2 } from "lucide-react";
import { useNodeCanvas } from "@/contexts/NodeCanvasContext";

export type ShapeVariant = "rectangle" | "diamond" | "sticky";

export type ShapeNodeData = {
  content: string;
  variant: ShapeVariant;
  color?: string;
};

function ShapeNodeImpl({ id, data, selected }: NodeProps<ShapeNodeData>) {
  const { onUpdateDrawingNodeData, onDeleteNode } = useNodeCanvas();
  const variant = data.variant ?? "rectangle";
  const isSticky = variant === "sticky";
  const isDiamond = variant === "diamond";

  const stopPointer = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  const updateContent = useCallback(
    (content: string) => {
      onUpdateDrawingNodeData(id, (current) => ({ ...current, content }));
    },
    [id, onUpdateDrawingNodeData],
  );

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={isDiamond ? 80 : 80}
        minHeight={isDiamond ? 80 : 48}
        keepAspectRatio={isDiamond}
        lineClassName="drawing-node-resizer-line"
        handleClassName="drawing-node-resizer-handle"
      />
      <div
        className={`drawing-node drawing-node--shape drawing-node--${variant} ${
          selected ? "drawing-node--selected" : ""
        }`}
        style={{
          backgroundColor: isSticky ? data.color || "#fef08a" : isDiamond ? "transparent" : "transparent",
        }}
      >
        {isSticky && (
          <span className="drawing-node__icon nodrag nopan" aria-hidden>
            <Pencil className="h-3.5 w-3.5" />
          </span>
        )}
        {selected && (
          <button
            type="button"
            className="drawing-node__delete nodrag nopan"
            onPointerDown={stopPointer}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(id);
            }}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
        <div className={`drawing-node__shape-inner ${isDiamond ? "drawing-node__shape-inner--diamond" : ""}`}>
          <textarea
            value={data.content ?? ""}
            onChange={(e) => updateContent(e.target.value)}
            placeholder={isSticky ? "Note..." : "Label..."}
            className="drawing-node__textarea nodrag nopan nowheel"
            onPointerDown={stopPointer}
          />
        </div>
      </div>
    </>
  );
}

export const ShapeNode = memo(ShapeNodeImpl);
