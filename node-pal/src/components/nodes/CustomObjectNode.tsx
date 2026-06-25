import { memo, useCallback, useState } from "react";
import { Position, type NodeProps } from "reactflow";
import { Trash2 } from "lucide-react";
import { resolveCustomObjectIcon } from "@/lib/customObjects";
import type { CustomObjectNodeData } from "@/lib/createCustomObjectNode";
import {
  FIELD_CONNECTION_MIME,
  parseFieldConnectionDrag,
} from "@/lib/fieldConnectionDnD";
import { useLineage } from "@/contexts/LineageContext";
import { useNodeCanvas } from "@/contexts/NodeCanvasContext";
import { BRAND } from "@/lib/brand";
import { PlusHandle } from "./PlusHandle";

function CustomObjectNodeImpl({ id, data: rawData, selected }: NodeProps<CustomObjectNodeData>) {
  const data: CustomObjectNodeData = rawData ?? { objectId: "custom", label: "Object" };
  const { onUpdateNodeData, onDeleteNode, onFieldToNodeConnectDrop } = useNodeCanvas();
  const { hasLineage, lineageNodeIds, highlightedNodeIds } = useLineage();
  const Icon = resolveCustomObjectIcon(data.iconId, data.objectId);
  const headerColor = data.accent ?? BRAND.blue;
  const [isConnectTarget, setIsConnectTarget] = useState(false);

  const inLineage = lineageNodeIds.has(id);
  const isHighlighted = highlightedNodeIds.has(id);
  const glow = selected || inLineage || isHighlighted;
  const faded = hasLineage && !inLineage && !isHighlighted && !selected;

  const stopPointer = (event: React.PointerEvent | React.MouseEvent) => {
    event.stopPropagation();
  };

  const updateLabel = useCallback(
    (nextLabel: string) => {
      const label = nextLabel.trim() || "Object";
      onUpdateNodeData(id, (current) => ({ ...current, label }));
    },
    [id, onUpdateNodeData],
  );

  const handleDragOver = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes(FIELD_CONNECTION_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsConnectTarget(true);
  };

  const handleDragLeave = () => {
    setIsConnectTarget(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes(FIELD_CONNECTION_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    setIsConnectTarget(false);

    const source = parseFieldConnectionDrag(event.dataTransfer.getData(FIELD_CONNECTION_MIME));
    if (!source || source.sourceNodeId === id) return;

    onFieldToNodeConnectDrop(
      { nodeId: source.sourceNodeId, fieldId: source.sourceFieldId },
      id,
    );
  };

  return (
    <div
      className={`custom-object-node ${selected ? "custom-object-node--selected" : ""} ${
        inLineage ? "custom-object-node--lineage" : ""
      } ${glow ? "custom-object-node--glow" : ""} ${faded ? "custom-object-node--faded" : ""}`}
    >
      <PlusHandle
        type="target"
        position={Position.Left}
        id={`parent-target-${id}`}
        variant="parent"
        isConnectable
        className="custom-object-node__parent-handle custom-object-node__parent-handle--target"
      />
      <PlusHandle
        type="target"
        position={Position.Top}
        id={`parent-target-${id}-top`}
        variant="parent"
        isConnectable
        className="custom-object-node__parent-handle custom-object-node__parent-handle--top"
      />

      <div
        className={`custom-object-node__surface overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm ${
          isConnectTarget ? "custom-object-node__surface--connect-target" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="custom-object-node__header" style={{ backgroundColor: headerColor }}>
          <span className="custom-object-node__header-icon" aria-hidden>
            <Icon className="custom-object-node__icon" />
          </span>
          <input
            type="text"
            value={data.label ?? "Object"}
            onChange={(event) => updateLabel(event.target.value)}
            onBlur={(event) => updateLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="custom-object-node__label-input nodrag nopan"
            onPointerDown={stopPointer}
            onMouseDown={stopPointer}
            spellCheck={false}
            aria-label="Custom object name"
          />
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
        </div>
      </div>

      <PlusHandle
        type="source"
        position={Position.Right}
        id={`parent-source-${id}`}
        variant="parent"
        isConnectable
        className="custom-object-node__parent-handle custom-object-node__parent-handle--source"
      />
      <PlusHandle
        type="source"
        position={Position.Bottom}
        id={`parent-source-${id}-bottom`}
        variant="parent"
        isConnectable
        className="custom-object-node__parent-handle custom-object-node__parent-handle--bottom"
      />
    </div>
  );
}

export const CustomObjectNode = memo(CustomObjectNodeImpl);
