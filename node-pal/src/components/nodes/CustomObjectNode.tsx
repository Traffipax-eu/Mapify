import { memo, useState } from "react";
import { Position, useReactFlow, type NodeProps } from "reactflow";
import { resolveCustomObjectIcon, type CustomObjectId } from "@/lib/customObjects";
import type { NodeIconId } from "@/lib/nodeIcons";
import { PlusHandle } from "./PlusHandle";
import { useNodeCanvas } from "@/contexts/NodeCanvasContext";

export type CustomObjectNodeData = {
  objectId: CustomObjectId;
  label: string;
  accent?: string;
  iconId?: NodeIconId;
};

function CustomObjectNodeImpl({ id, data, selected }: NodeProps<CustomObjectNodeData>) {
  const { onDeleteNode } = useNodeCanvas();
  const { setNodes } = useReactFlow();
  const Icon = resolveCustomObjectIcon(data.iconId, data.objectId);
  const accent = data.accent ?? "#3b82f6";
  const [editing, setEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(data.label);

  const stopPointer = (event: React.PointerEvent | React.MouseEvent) => {
    event.stopPropagation();
  };

  const commitLabel = (nextLabel: string) => {
    const label = nextLabel.trim() || "Object";
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...(node.data as CustomObjectNodeData), label } }
          : node,
      ),
    );
  };

  return (
    <div
      className={`custom-object-node ${selected ? "custom-object-node--selected" : ""}`}
      style={{ "--object-accent": accent } as React.CSSProperties}
    >
      <PlusHandle type="target" position={Position.Left} variant="parent" id="parent-target" />
      <PlusHandle type="source" position={Position.Right} variant="parent" id="parent-source" />

      <button
        type="button"
        className="custom-object-node__delete nodrag nopan"
        onPointerDown={stopPointer}
        onClick={(event) => {
          event.stopPropagation();
          onDeleteNode(id);
        }}
        title="Delete object"
        aria-label="Delete object"
      >
        ×
      </button>

      <div className="custom-object-node__icon-wrap nodrag nopan" aria-hidden>
        <Icon className="custom-object-node__icon" />
      </div>

      {editing ? (
        <input
          autoFocus
          value={labelDraft}
          onChange={(event) => setLabelDraft(event.target.value)}
          onBlur={() => {
            setEditing(false);
            commitLabel(labelDraft);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setLabelDraft(data.label);
              setEditing(false);
            }
          }}
          className="custom-object-node__label-input nodrag nopan"
          onPointerDown={stopPointer}
        />
      ) : (
        <button
          type="button"
          className="custom-object-node__label nodrag nopan"
          onDoubleClick={() => {
            setLabelDraft(data.label);
            setEditing(true);
          }}
          onPointerDown={stopPointer}
          title="Double-click to rename"
        >
          {data.label}
        </button>
      )}
    </div>
  );
}

export const CustomObjectNode = memo(CustomObjectNodeImpl);
