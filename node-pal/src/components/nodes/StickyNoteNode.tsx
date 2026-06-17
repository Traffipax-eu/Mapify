import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Pencil, Trash2 } from "lucide-react";
import { useNodeCanvas } from "@/contexts/NodeCanvasContext";

export type StickyNoteData = {
  content: string;
  color?: string;
};

function StickyNoteImpl({ id, data, selected }: NodeProps<StickyNoteData>) {
  const { onDeleteNode, onUpdateStickyNoteData } = useNodeCanvas();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(data.content || "");

  const stopPointer = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  const handleSave = () => {
    const next = content.trim() || "New note...";
    setContent(next);
    onUpdateStickyNoteData(id, (d) => ({ ...d, content: next }));
    setEditing(false);
  };

  return (
    <div
      className={`sticky-note ${selected ? "sticky-note--selected" : ""}`}
      style={{
        backgroundColor: data.color || "#fef08a",
        width: 200,
        minHeight: 150,
        padding: 12,
        borderRadius: 4,
        boxShadow: selected ? "0 0 0 2px #3b82f6, 2px 2px 8px rgba(0,0,0,0.15)" : "2px 2px 8px rgba(0,0,0,0.1)",
        transform: "rotate(-1deg)",
      }}
    >
      <Handle type="target" position={Position.Top} className="sticky-note__handle" />
      <Handle type="source" position={Position.Bottom} className="sticky-note__handle" />

      <div className="flex justify-end gap-1 mb-2 nodrag nopan" onPointerDown={stopPointer}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(!editing);
          }}
          className="p-1 hover:bg-black/10 rounded nodrag nopan"
          title="Edit note"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteNode(id);
          }}
          className="p-1 hover:bg-black/10 rounded nodrag nopan text-red-700/80 hover:text-red-700"
          title="Delete note"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setContent(data.content || "");
              setEditing(false);
            }
          }}
          autoFocus
          className="w-full h-32 bg-transparent border-none resize-none text-sm focus:outline-none nodrag nopan nowheel"
          style={{ fontFamily: "Comic Sans MS, cursive, sans-serif" }}
        />
      ) : (
        <div
          className="text-sm whitespace-pre-wrap"
          style={{ fontFamily: "Comic Sans MS, cursive, sans-serif" }}
          onDoubleClick={() => setEditing(true)}
        >
          {content || "Double-click to edit..."}
        </div>
      )}
    </div>
  );
}

export const StickyNoteNode = memo(StickyNoteImpl);
