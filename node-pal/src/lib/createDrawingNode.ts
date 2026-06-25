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

export function createTextNodeWithContent(
  content: string,
  position: { x: number; y: number },
  nextId: () => string,
): Node {
  const lineCount = Math.max(1, content.split("\n").length);
  const width = Math.min(480, Math.max(200, Math.min(content.length, 48) * 8));
  const height = Math.min(400, Math.max(72, lineCount * 22 + 24));

  return {
    id: nextId(),
    type: "textNode",
    position,
    style: { width, height },
    data: { content },
  };
}
