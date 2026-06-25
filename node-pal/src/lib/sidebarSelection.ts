import type { Node } from "reactflow";
import type { CustomObjectNodeData } from "@/lib/createCustomObjectNode";
import type { SystemNodeData, Field } from "@/components/nodes/SystemNode";
import type { MetadataValues } from "@/lib/storage";
import type { Schema } from "@/lib/storage";
import {
  getCustomObjectBlockProperties,
  getCustomObjectFieldProperties,
  getFieldProperties,
  getGroupBlockProperties,
  type ScopedProperty,
} from "@/lib/schemaProperties";
import {
  getBlockAttributeDefinitions,
  getFieldAttributeDefinitions,
} from "@/lib/fieldMetadata";

export type SidebarSelectionContext = "node" | "field";

export type ResolvedSidebarSelection = {
  nodeId: string;
  nodeLabel: string;
  nodeType: "system" | "customObject";
  fieldId: string | null;
  fieldLabel: string | null;
  metadata: MetadataValues;
  blockProperties: ScopedProperty[];
  fieldProperties: ScopedProperty[];
  selectionContext: SidebarSelectionContext;
  lockBlockPropertyKeys: boolean;
  lockFieldPropertyKeys: boolean;
  allowAddBlockAttributes: boolean;
  allowAddFieldAttributes: boolean;
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

function resolveForNode(
  nodeData: SystemNodeData | CustomObjectNodeData,
  fields: Field[],
  schema: Schema | null | undefined,
  scope: "block" | "artifact",
  selectedFieldId: string | null,
  nodeId: string,
  nodeLabel: string,
  nodeType: "system" | "customObject",
): ResolvedSidebarSelection | null {
  const isArtifact = scope === "artifact";
  const source = isArtifact
    ? {
        objectId: (nodeData as CustomObjectNodeData).objectId,
        fieldAttributeKeys: nodeData.fieldAttributeKeys,
        blockMetadata: nodeData.metadata,
      }
    : {
        nodeGroupId: (nodeData as SystemNodeData).nodeGroupId,
        fieldAttributeKeys: nodeData.fieldAttributeKeys,
        blockMetadata: nodeData.metadata,
      };

  const schemaBlockProps = isArtifact
    ? getCustomObjectBlockProperties(schema, source.objectId)
    : getGroupBlockProperties(schema, source.nodeGroupId);
  const schemaFieldProps = isArtifact
    ? getCustomObjectFieldProperties(schema, source.objectId)
    : getFieldProperties(schema, source.nodeGroupId);

  const blockProperties = normalizeSidebarProperties(
    getBlockAttributeDefinitions(schema, source, scope),
  );
  const fieldProperties = normalizeSidebarProperties(
    getFieldAttributeDefinitions(schema, source, fields, scope),
  );

  if (selectedFieldId) {
    const field = fields.find((item) => item?.id === selectedFieldId);
    if (!field) return null;

    return {
      nodeId,
      nodeLabel,
      nodeType,
      fieldId: selectedFieldId,
      fieldLabel: typeof field.label === "string" ? field.label : "Field",
      metadata: safeMetadata(field.metadata),
      blockProperties,
      fieldProperties,
      selectionContext: "field",
      lockBlockPropertyKeys: blockProperties.length > 0,
      lockFieldPropertyKeys: fieldProperties.length > 0,
      allowAddBlockAttributes: schemaBlockProps.length === 0,
      allowAddFieldAttributes: schemaFieldProps.length === 0,
    };
  }

  if (isArtifact) {
    const customData = nodeData as CustomObjectNodeData;
    return {
      nodeId,
      nodeLabel,
      nodeType,
      fieldId: null,
      fieldLabel: null,
      metadata: safeMetadata(customData.attributes ?? customData.metadata),
      blockProperties: [],
      fieldProperties: fields.length > 0 ? fieldProperties : [],
      selectionContext: "node",
      lockBlockPropertyKeys: false,
      lockFieldPropertyKeys: fields.length > 0 && fieldProperties.length > 0,
      allowAddBlockAttributes: true,
      allowAddFieldAttributes: schemaFieldProps.length === 0,
    };
  }

  return {
    nodeId,
    nodeLabel,
    nodeType,
    fieldId: null,
    fieldLabel: null,
    metadata: safeMetadata(nodeData.metadata),
    blockProperties,
    fieldProperties,
    selectionContext: "node",
    lockBlockPropertyKeys: blockProperties.length > 0,
    lockFieldPropertyKeys: fieldProperties.length > 0,
    allowAddBlockAttributes: schemaBlockProps.length === 0,
    allowAddFieldAttributes: schemaFieldProps.length === 0,
  };
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

  const nodeData = (node.data ?? {}) as SystemNodeData | CustomObjectNodeData;
  const nodeLabel = typeof nodeData.label === "string" ? nodeData.label : "System";
  const fields = safeFields(nodeData.fields);

  if (node.type === "system") {
    return resolveForNode(
      nodeData,
      fields,
      schema,
      "block",
      selectedFieldId,
      selectedNodeId,
      nodeLabel,
      "system",
    );
  }

  return resolveForNode(
    nodeData,
    fields,
    schema,
    "artifact",
    selectedFieldId,
    selectedNodeId,
    nodeLabel,
    "customObject",
  );
}
