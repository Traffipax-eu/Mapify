// Dynamic Schema Engine Types

export type PropertyType = "text" | "textarea" | "select" | "date" | "number" | "boolean";

export interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  options?: string[];
  required?: boolean;
  defaultValue?: any;
}

export interface NodeGroupSchema {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  /** Block-instance attribute definitions for this block type only. */
  blockProperties?: PropertyDefinition[];
  /** Shared field attribute definitions for this block type (same keys as block, values per field). */
  properties: PropertyDefinition[];
}

/** Field-level schema for a data asset / custom object type (shared across instances). */
export interface CustomObjectSchema {
  id: string;
  name: string;
  /** Block-instance attribute definitions for this asset type only. */
  blockProperties?: PropertyDefinition[];
  properties: PropertyDefinition[];
}

export interface FieldTypeSchema {
  id: string;
  name: string;
  properties: PropertyDefinition[];
}

export interface Schema {
  id?: number;
  /** Attributes that apply to every node and field across the application. */
  globalProperties: PropertyDefinition[];
  nodeGroups: NodeGroupSchema[];
  /** Field attribute definitions for data asset nodes, keyed by objectId. */
  customObjectSchemas: CustomObjectSchema[];
  /** @deprecated Legacy field-type schemas; metadata is now global + group-scoped. */
  fieldTypes: FieldTypeSchema[];
  timestamp: number;
}

// Dynamic metadata values (key-value pairs based on schema)
export type MetadataValues = Record<string, any>;

// Edge data structure for field-to-field connections
export type EdgeMarkerStyle = "none" | "arrow" | "arrowclosed" | "circle" | "circleclosed";

export type EdgePathType = "bezier" | "straight" | "step" | "custom";
export type EdgeLineStyle = "solid" | "dashed";

export type EdgeControlPoint = { x: number; y: number };

export interface EdgeData {
  sourceFieldId?: string | null;
  targetFieldId?: string | null;
  sourceNodeId?: string;
  targetNodeId?: string;
  label?: string;
  description?: string;
  pathType?: EdgePathType;
  lineStyle?: EdgeLineStyle;
  markerStart?: EdgeMarkerStyle;
  markerEnd?: EdgeMarkerStyle;
  rerouted?: boolean;
  originalSource?: string;
  originalTarget?: string;
  /** Flow-coordinate control points for custom / bendable Bézier paths */
  controlPoints?: EdgeControlPoint[];
}

// Graph State (nodes now use dynamic metadata)
export interface GraphState {
  id?: number;
  nodes: any[];
  edges: any[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  /** Serialized freehand drawing layer snapshots (data URLs). */
  drawings?: string[];
  timestamp: number;
}

// Default schema for new installations
export const DEFAULT_SCHEMA: Schema = {
  globalProperties: [],
  nodeGroups: [],
  customObjectSchemas: [],
  fieldTypes: [],
  timestamp: Date.now(),
};
