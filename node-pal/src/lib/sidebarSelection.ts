import type { Node } from "reactflow";
import type { CustomObjectNodeData } from "@/lib/createCustomObjectNode";
import type { SystemNodeData, Field } from "@/components/nodes/SystemNode";
import type { MetadataValues } from "@/lib/storage";
import type { Schema } from "@/lib/storage";
import {
  getCustomObjectFieldProperties,
  getFieldProperties,
  getNodeGroupProperties,
  type ScopedProperty,
} from "@/lib/schemaProperties";

export type SidebarSelectionContext = "node" | "field";

export type ResolvedSidebarSelection = {
  nodeId: string;
  nodeLabel: string;
  nodeType: "system" | "customObject";
  fieldId: string | null;
  fieldLabel: string | null;
  metadata: MetadataValues;
  properties: ScopedProperty[];
  selectionContext: SidebarSelectionContext;
};

function safeMetadata(value: unknown): MetadataValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as MetadataValues) };
}

function safeFields(fields: Field[] | undefined): Field[] {
  return Array.isArray(fields) ? fields : [];
}

export function normalizeSidebarProperties(
  properties: ScopedProperty[] | null | undefined,
): ScopedProperty[] {
  if (!Array.isArray(properties)) return [];

  return properties
    .filter((property): property is ScopedProperty => Boolean(property?.id))
    .map((property) => ({
      ...property,
      id: property.id,
      name: property.name?.trim() || "Attribute",
      type: property.type ?? "text",
      options: Array.isArray(property.options)
        ? property.options.filter((option) => typeof option === "string" && option.length > 0)
        : undefined,
    }));
}

export function resolveSidebarSelection(
  nodes: Node[],
  schema: Schema | null | undefined,
  selectedNodeId: string | null,
  selectedFieldId: string | null,
): ResolvedSidebarSelection | null {
  if (!selectedNodeId) return null;

  const node = nodes.find((item) => item?.id === selectedNodeId);
  if (!node || (node.type !== "system" && node.type !== "customObject")) return null;

  if (node.type === "system") {
    const nodeData = (node.data ?? {}) as SystemNodeData;
    const nodeGroupId = nodeData.nodeGroupId;
    const nodeLabel = typeof nodeData.label === "string" ? nodeData.label : "System";

    if (selectedFieldId) {
      const field = safeFields(nodeData.fields).find((item) => item?.id === selectedFieldId);
      if (!field) return null;

      return {
        nodeId: selectedNodeId,
        nodeLabel,
        nodeType: "system",
        fieldId: selectedFieldId,
        fieldLabel: typeof field.label === "string" ? field.label : "Field",
        metadata: safeMetadata(field.metadata),
        properties: normalizeSidebarProperties(getFieldProperties(schema, nodeGroupId)),
        selectionContext: "field",
      };
    }

    return {
      nodeId: selectedNodeId,
      nodeLabel,
      nodeType: "system",
      fieldId: null,
      fieldLabel: null,
      metadata: safeMetadata(nodeData.metadata),
      properties: normalizeSidebarProperties(getNodeGroupProperties(schema)),
      selectionContext: "node",
    };
  }

  const nodeData = (node.data ?? {}) as CustomObjectNodeData;
  const objectId = nodeData.objectId;
  const nodeLabel = typeof nodeData.label === "string" ? nodeData.label : "Artifact";

  if (selectedFieldId) {
    const field = safeFields(nodeData.fields).find((item) => item?.id === selectedFieldId);
    if (!field) return null;

    return {
      nodeId: selectedNodeId,
      nodeLabel,
      nodeType: "customObject",
      fieldId: selectedFieldId,
      fieldLabel: typeof field.label === "string" ? field.label : "Field",
      metadata: safeMetadata(field.metadata),
      properties: normalizeSidebarProperties(getCustomObjectFieldProperties(schema, objectId)),
      selectionContext: "field",
    };
  }

  return {
    nodeId: selectedNodeId,
    nodeLabel,
    nodeType: "customObject",
    fieldId: null,
    fieldLabel: null,
    metadata: safeMetadata(nodeData.metadata),
    properties: normalizeSidebarProperties(getNodeGroupProperties(schema)),
    selectionContext: "node",
  };
}
