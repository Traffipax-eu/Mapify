export type DrawingToolId = "textbox" | "sticky";

export type DrawingToolPayload = {
  kind: "drawing-tool";
  tool: DrawingToolId;
};

export type NodeGroupDragPayload = {
  kind?: "node-group";
  id: string;
  name: string;
  icon?: string;
  color?: string;
};

export const DRAWING_TOOLS: {
  id: DrawingToolId;
  label: string;
  description: string;
}[] = [
  { id: "textbox", label: "Textbox", description: "Transparent text area" },
  { id: "sticky", label: "Sticky Note", description: "Colored note" },
];

export function isDrawingToolPayload(value: unknown): value is DrawingToolPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as DrawingToolPayload).kind === "drawing-tool" &&
    typeof (value as DrawingToolPayload).tool === "string"
  );
}

export function isNodeGroupPayload(value: unknown): value is NodeGroupDragPayload {
  return typeof value === "object" && value !== null && typeof (value as NodeGroupDragPayload).id === "string";
}
