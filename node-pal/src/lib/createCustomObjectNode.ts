import type { Node } from "reactflow";
import type { CustomObjectId } from "@/lib/customObjects";
import { getCustomObjectDefinition } from "@/lib/customObjects";

export function createCustomObjectNode(
  objectId: CustomObjectId,
  position: { x: number; y: number },
  nextId: () => string,
): Node {
  const definition = getCustomObjectDefinition(objectId);

  return {
    id: nextId(),
    type: "customObject",
    position,
    data: {
      objectId,
      label: definition?.defaultName ?? "Object",
      accent: definition?.accent ?? "#3b82f6",
    },
  };
}
