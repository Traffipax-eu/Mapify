import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Brain,
  Braces,
  FileCode,
  FileSpreadsheet,
  FileText,
  Globe,
  LayoutDashboard,
  Sparkles,
  Unplug,
  UserCircle,
  Workflow,
} from "lucide-react";
import { getNodeIcon, type NodeIconId } from "@/lib/nodeIcons";

export type CustomObjectCategory = "documents" | "analytics" | "processes" | "actors";

export type CustomObjectId =
  | "excel-file"
  | "csv-flat-file"
  | "json-payload"
  | "power-bi-report"
  | "ml-model"
  | "dashboard"
  | "python-script"
  | "api-endpoint"
  | "etl-pipeline"
  | "user-role";

export type CustomObjectPayload =
  | { kind: "custom-object"; objectId: CustomObjectId }
  | { kind: "custom-object-template" };

export type CustomObjectDefinition = {
  id: CustomObjectId;
  label: string;
  description: string;
  defaultName: string;
  icon: LucideIcon;
  accent: string;
  category: CustomObjectCategory;
};

export const CUSTOM_OBJECT_CATEGORIES: { id: CustomObjectCategory; label: string }[] = [
  { id: "documents", label: "Documents & Files" },
  { id: "analytics", label: "Analytics & Outputs" },
  { id: "processes", label: "Actions & Processes" },
  { id: "actors", label: "Actors" },
];

export const CUSTOM_OBJECT_COLOR_PALETTE = [
  "#0067F5",
  "#0DC5E7",
  "#16a34a",
  "#4f46e5",
  "#ea580c",
  "#7c3aed",
  "#0d9488",
  "#dc2626",
  "#475569",
  "#64748b",
];

export const CUSTOM_OBJECTS: CustomObjectDefinition[] = [
  {
    id: "excel-file",
    label: "Excel File",
    description: "Spreadsheet workbook or XLSX export",
    defaultName: "Excel File",
    icon: FileSpreadsheet,
    accent: "#16a34a",
    category: "documents",
  },
  {
    id: "csv-flat-file",
    label: "CSV / Flat File",
    description: "Delimited flat file extract",
    defaultName: "CSV File",
    icon: FileText,
    accent: "#64748b",
    category: "documents",
  },
  {
    id: "json-payload",
    label: "JSON / Payload",
    description: "Structured message or API payload",
    defaultName: "JSON Payload",
    icon: Braces,
    accent: "#4f46e5",
    category: "documents",
  },
  {
    id: "power-bi-report",
    label: "Power BI Report",
    description: "Published BI report or semantic model output",
    defaultName: "Power BI Report",
    icon: BarChart3,
    accent: "#ea580c",
    category: "analytics",
  },
  {
    id: "ml-model",
    label: "ML Model",
    description: "Trained model artifact or scoring endpoint",
    defaultName: "ML Model",
    icon: Brain,
    accent: "#7c3aed",
    category: "analytics",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Operational dashboard or KPI view",
    defaultName: "Dashboard",
    icon: LayoutDashboard,
    accent: "#0067F5",
    category: "analytics",
  },
  {
    id: "python-script",
    label: "Python Script",
    description: "Notebook, script, or batch job step",
    defaultName: "Python Script",
    icon: FileCode,
    accent: "#0d9488",
    category: "processes",
  },
  {
    id: "api-endpoint",
    label: "API Endpoint",
    description: "REST, GraphQL, or webhook interface",
    defaultName: "API Endpoint",
    icon: Unplug,
    accent: "#0067F5",
    category: "processes",
  },
  {
    id: "etl-pipeline",
    label: "ETL Pipeline",
    description: "Extract, transform, and load workflow",
    defaultName: "ETL Pipeline",
    icon: Workflow,
    accent: "#dc2626",
    category: "processes",
  },
  {
    id: "user-role",
    label: "User Role",
    description: "Persona, operator, or stakeholder",
    defaultName: "User Role",
    icon: UserCircle,
    accent: "#475569",
    category: "actors",
  },
];

/** Legacy palette ids from older canvases — kept for load compatibility. */
const LEGACY_CUSTOM_OBJECTS: Partial<CustomObjectDefinition & { id: string }>[] = [
  { id: "database", label: "Database", defaultName: "Database", icon: FileText, accent: "#3b82f6" },
  { id: "server", label: "Server", defaultName: "Server", icon: Globe, accent: "#64748b" },
  { id: "cloud-service", label: "Cloud Service", defaultName: "Cloud", icon: Globe, accent: "#0ea5e9" },
  { id: "security-zone", label: "Security Zone", defaultName: "Security Zone", icon: Globe, accent: "#f59e0b" },
  { id: "workflow", label: "Workflow", defaultName: "Workflow", icon: Workflow, accent: "#ec4899" },
  { id: "custom", label: "Custom Object", defaultName: "Custom Object", icon: Sparkles, accent: "#0067F5" },
];

export function isCustomObjectPayload(value: unknown): value is Extract<CustomObjectPayload, { kind: "custom-object" }> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as CustomObjectPayload).kind === "custom-object" &&
    typeof (value as { objectId?: string }).objectId === "string"
  );
}

export function isCustomObjectTemplatePayload(
  value: unknown,
): value is Extract<CustomObjectPayload, { kind: "custom-object-template" }> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as CustomObjectPayload).kind === "custom-object-template"
  );
}

export function getCustomObjectDefinition(objectId: string): CustomObjectDefinition | undefined {
  const current = CUSTOM_OBJECTS.find((item) => item.id === objectId);
  if (current) return current;

  const legacy = LEGACY_CUSTOM_OBJECTS.find((item) => item.id === objectId);
  if (!legacy?.icon) return undefined;

  return {
    id: objectId as CustomObjectId,
    label: legacy.label ?? "Artifact",
    description: legacy.label ?? "Legacy artifact",
    defaultName: legacy.defaultName ?? "Artifact",
    icon: legacy.icon,
    accent: legacy.accent ?? "#64748b",
    category: "processes",
  };
}

export function resolveCustomObjectIcon(iconId?: NodeIconId, objectId?: string): LucideIcon {
  if (iconId) {
    return getNodeIcon(iconId);
  }
  const definition = objectId ? getCustomObjectDefinition(objectId) : undefined;
  return definition?.icon ?? Sparkles;
}

export function getCustomObjectsByCategory(category: CustomObjectCategory): CustomObjectDefinition[] {
  return CUSTOM_OBJECTS.filter((item) => item.category === category);
}
