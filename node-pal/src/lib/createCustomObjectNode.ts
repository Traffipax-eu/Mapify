import type { Node } from "reactflow";
import type { CustomObjectId } from "@/lib/customObjects";
import { getCustomObjectDefinition } from "@/lib/customObjects";
import type { NodeIconId } from "@/lib/nodeIcons";
import type { MetadataValues } from "@/lib/storage";
import type { Field } from "@/components/nodes/SystemNode";

export type CustomObjectNodeData = {
  objectId: CustomObjectId | string;
  label: string;
  accent?: string;
  iconId?: NodeIconId;
  fields?: Field[];
  collapsed?: boolean;
  tableExpanded?: boolean;
  metadata?: MetadataValues;
  visibleColumns?: string[];
};

export function createCustomObjectNode(
  objectId: CustomObjectId | string,
  position: { x: number; y: number },
  nextId: () => string,
  overrides?: Partial<Pick<CustomObjectNodeData, "label" | "accent" | "iconId">>,
): Node {
  const definition = getCustomObjectDefinition(objectId);

  return {
    id: nextId(),
    type: "customObject",
    position,
    data: {
      objectId,
      label: overrides?.label ?? definition?.defaultName ?? "Object",
      accent: overrides?.accent ?? definition?.accent ?? "#3b82f6",
      iconId: overrides?.iconId,
      fields: [],
      collapsed: false,
      metadata: {},
    },
  };
}

export function createConfiguredCustomObjectNode(
  position: { x: number; y: number },
  nextId: () => string,
  config: { label: string; accent: string; iconId: NodeIconId },
): Node {
  return createCustomObjectNode("custom", position, nextId, config);
}
