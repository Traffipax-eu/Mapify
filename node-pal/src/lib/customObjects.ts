import type { LucideIcon } from "lucide-react";
import { Database, Globe, UserCircle, Server, Cloud, Shield, Workflow, Sparkles } from "lucide-react";
import { getNodeIcon, type NodeIconId } from "@/lib/nodeIcons";

export type CustomObjectId =
  | "database"
  | "api-endpoint"
  | "user-role"
  | "server"
  | "cloud-service"
  | "security-zone"
  | "workflow"
  | "custom";

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
};

export const CUSTOM_OBJECT_COLOR_PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#64748b",
  "#0ea5e9",
  "#22c55e",
  "#ef4444",
  "#6366f1",
];

export const CUSTOM_OBJECTS: CustomObjectDefinition[] = [
  {
    id: "database",
    label: "Database",
    description: "Data store or warehouse",
    defaultName: "Database",
    icon: Database,
    accent: "#3b82f6",
  },
  {
    id: "api-endpoint",
    label: "API Endpoint",
    description: "REST or GraphQL service",
    defaultName: "API",
    icon: Globe,
    accent: "#8b5cf6",
  },
  {
    id: "user-role",
    label: "User Role",
    description: "Actor or persona",
    defaultName: "User Role",
    icon: UserCircle,
    accent: "#14b8a6",
  },
  {
    id: "server",
    label: "Server",
    description: "Application or compute host",
    defaultName: "Server",
    icon: Server,
    accent: "#64748b",
  },
  {
    id: "cloud-service",
    label: "Cloud Service",
    description: "Managed cloud component",
    defaultName: "Cloud",
    icon: Cloud,
    accent: "#0ea5e9",
  },
  {
    id: "security-zone",
    label: "Security Zone",
    description: "Trust boundary or perimeter",
    defaultName: "Security Zone",
    icon: Shield,
    accent: "#f59e0b",
  },
  {
    id: "workflow",
    label: "Workflow",
    description: "Process or orchestration step",
    defaultName: "Workflow",
    icon: Workflow,
    accent: "#ec4899",
  },
  {
    id: "custom",
    label: "Your Object",
    description: "Pick your own icon and color",
    defaultName: "Custom Object",
    icon: Sparkles,
    accent: "#6366f1",
  },
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

export function getCustomObjectDefinition(objectId: CustomObjectId): CustomObjectDefinition | undefined {
  return CUSTOM_OBJECTS.find((item) => item.id === objectId);
}

export function resolveCustomObjectIcon(iconId?: NodeIconId, objectId?: CustomObjectId): LucideIcon {
  if (iconId) {
    return getNodeIcon(iconId);
  }
  const definition = objectId ? getCustomObjectDefinition(objectId) : undefined;
  return definition?.icon ?? Database;
}
