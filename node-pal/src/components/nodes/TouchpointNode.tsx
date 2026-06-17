import { memo } from "react";
import { Position, type NodeProps } from "reactflow";
import { Layers } from "lucide-react";
import { useLineage } from "@/contexts/LineageContext";
import { PlusHandle } from "./PlusHandle";

export type TouchpointNodeData = {
  label: string;
  kind: "touchpoint";
};

function TouchpointNodeImpl({ id, data }: NodeProps<TouchpointNodeData>) {
  const { hasLineage, lineageNodeIds } = useLineage();
  const faded = hasLineage && !lineageNodeIds.has(id);
  const inLineage = lineageNodeIds.has(id);

  return (
    <div
      className={`touchpoint-node ${faded ? "touchpoint-node--faded" : ""} ${
        inLineage ? "touchpoint-node--lineage" : ""
      }`}
    >
      <PlusHandle type="target" position={Position.Left} variant="parent" />
      <PlusHandle type="source" position={Position.Right} variant="parent" />
      <Layers className="h-3.5 w-3.5" />
      <span className="touchpoint-node__label">{data.label}</span>
    </div>
  );
}

export const TouchpointNode = memo(TouchpointNodeImpl);
