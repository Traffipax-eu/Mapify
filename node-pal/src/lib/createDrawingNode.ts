import type { Node } from "reactflow";
import type { DrawingToolId } from "@/lib/drawingTools";

const DEFAULT_SIZES: Record<"textbox" | "sticky", { width: number; height: number }> = {
  textbox: { width: 200, height: 72 },
  sticky: { width: 220, height: 170 },
};

export function createDrawingNode(
  tool: DrawingToolId,
  position: { x: number; y: number },
  nextId: () => string,
): Node {
  const size = DEFAULT_SIZES[tool];

  if (tool === "textbox") {
    return {
      id: nextId(),
      type: "textNode",
      position,
      style: { width: size.width, height: size.height },
      data: { content: "" },
    };
  }

  if (tool === "sticky") {
    return {
      id: nextId(),
      type: "stickyNote",
      position,
      style: { width: size.width, height: size.height },
      data: {
        content: "Note...",
        variant: "yellow",
      },
    };
  }

  throw new Error(`Unsupported drawing tool: ${tool}`);
}
