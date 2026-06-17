import { memo, useCallback } from "react";
import { NodeResizer, type NodeProps } from "reactflow";
import { Trash2 } from "lucide-react";
import { useNodeCanvas } from "@/contexts/NodeCanvasContext";

export type TextNodeData = {
  content: string;
};

function TextNodeImpl({ id, data, selected }: NodeProps<TextNodeData>) {
  const { onUpdateDrawingNodeData, onDeleteNode } = useNodeCanvas();

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
        minWidth={80}
        minHeight={36}
        lineClassName="drawing-node-resizer-line"
        handleClassName="drawing-node-resizer-handle"
      />
      <div
        className={`drawing-node drawing-node--text ${selected ? "drawing-node--selected" : ""}`}
      >
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
        <textarea
          value={data.content ?? ""}
          onChange={(e) => updateContent(e.target.value)}
          placeholder="Text..."
          className="drawing-node__textarea nodrag nopan nowheel"
          onPointerDown={stopPointer}
        />
      </div>
    </>
  );
}

export const TextNode = memo(TextNodeImpl);
