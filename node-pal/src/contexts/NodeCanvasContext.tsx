import { createContext, useContext, type ReactNode } from "react";
import type { Edge } from "reactflow";
import type { Schema } from "@/lib/storage";
import type { SystemNodeData } from "@/components/nodes/SystemNode";
import type { StickyNoteData } from "@/components/nodes/StickyNoteNode";

export type NodeCanvasContextValue = {
  schema: Schema;
  edges: Edge[];
  selectedEdgeId: string | null;
  selectedNodeId: string | null;
  selectedFieldId: string | null;
  lineageEdgeIds: Set<string>;
  hasLineage: boolean;
  onSelectEdge: (edgeId: string) => void;
  onUpdateNodeData: (nodeId: string, updater: (data: SystemNodeData) => SystemNodeData) => void;
  onUpdateStickyNoteData: (nodeId: string, updater: (data: StickyNoteData) => StickyNoteData) => void;
  onDeleteNode: (nodeId: string) => void;
  onFieldSelect: (nodeId: string, fieldId: string) => void;
  onFieldEdit: (nodeId: string, fieldId: string) => void;
  onDeleteField: (nodeId: string, fieldId: string) => void;
  onFieldConnectDrop: (
    source: { nodeId: string; fieldId: string },
    target: { nodeId: string; fieldId: string },
  ) => void;
  onFieldToNodeConnectDrop: (
    source: { nodeId: string; fieldId: string },
    targetNodeId: string,
  ) => void;
  onRenameField: (nodeId: string, fieldId: string, label: string) => void;
  onUpdateFieldTableCell: (nodeId: string, fieldId: string, columnId: string, value: string) => void;
  onApplyFieldTablePaste: (
    nodeId: string,
    sectionId: string,
    groupId: string | undefined,
    plan: import("@/lib/tableClipboard").TablePastePlan,
  ) => void;
  onUpdateDrawingNodeData: (
    nodeId: string,
    updater: (data: Record<string, unknown>) => Record<string, unknown>,
  ) => void;
};

const NodeCanvasContext = createContext<NodeCanvasContextValue | null>(null);

export function NodeCanvasProvider({
  value,
  children,
}: {
  value: NodeCanvasContextValue;
  children: ReactNode;
}) {
  return <NodeCanvasContext.Provider value={value}>{children}</NodeCanvasContext.Provider>;
}

export function useNodeCanvas() {
  const ctx = useContext(NodeCanvasContext);
  if (!ctx) {
    throw new Error("useNodeCanvas must be used within NodeCanvasProvider");
  }
  return ctx;
}
