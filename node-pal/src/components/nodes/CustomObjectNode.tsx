import { memo, useState } from "react";
import { Position, type NodeProps } from "reactflow";
import { Trash2 } from "lucide-react";
import { resolveCustomObjectIcon } from "@/lib/customObjects";
import type { CustomObjectNodeData } from "@/lib/createCustomObjectNode";
import { getNodeGroupProperties } from "@/lib/schemaProperties";
import { SmartHoverAttributes } from "@/components/SmartHoverAttributes";
import { useNodeCanvas } from "@/contexts/NodeCanvasContext";
import { PlusHandle } from "./PlusHandle";

function CustomObjectNodeImpl({ id, data: rawData, selected }: NodeProps<CustomObjectNodeData>) {
  const data: CustomObjectNodeData = rawData ?? { objectId: "custom", label: "Object" };
  const { schema, onUpdateNodeData, onDeleteNode } = useNodeCanvas();
  const Icon = resolveCustomObjectIcon(data.iconId, data.objectId);
  const accent = data.accent ?? "#3b82f6";
  const nodeProperties = getNodeGroupProperties(schema);

  const [editing, setEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(data.label);

  const stopPointer = (event: React.PointerEvent | React.MouseEvent) => {
    event.stopPropagation();
  };

  const commitLabel = (nextLabel: string) => {
    const label = nextLabel.trim() || "Object";
    onUpdateNodeData(id, (current) => ({ ...current, label }));
  };

  return (
    <div
      className={`custom-object-node ${selected ? "custom-object-node--selected" : ""}`}
      style={{ "--object-accent": accent } as React.CSSProperties}
    >
      <SmartHoverAttributes
        title={data.label}
        metadata={data.metadata}
        properties={nodeProperties}
        className="custom-object-node__card nodrag nopan"
      >
        <PlusHandle
          type="target"
          position={Position.Top}
          id="parent-target"
          variant="ghost"
          className="custom-object-node__drop-handle"
        />
        <PlusHandle
          type="source"
          position={Position.Top}
          id="parent-source"
          variant="ghost"
          className="custom-object-node__drop-handle custom-object-node__drop-handle--source"
        />

        <div className="custom-object-node__icon-wrap nodrag nopan" aria-hidden>
          <Icon className="custom-object-node__icon" />
        </div>

        <div className="custom-object-node__title-wrap nodrag nopan">
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

        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={(event) => {
            event.stopPropagation();
            onDeleteNode(id);
          }}
          className="custom-object-node__delete nodrag nopan"
          title="Delete object"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </SmartHoverAttributes>
    </div>
  );
}

export const CustomObjectNode = memo(CustomObjectNodeImpl);
