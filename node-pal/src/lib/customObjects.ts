import type { LucideIcon } from "lucide-react";
import { Database, Globe, UserCircle, Server, Cloud, Shield, Workflow } from "lucide-react";

export type CustomObjectId =
  | "database"
  | "api-endpoint"
  | "user-role"
  | "server"
  | "cloud-service"
  | "security-zone"
  | "workflow";

export type CustomObjectPayload = {
  kind: "custom-object";
  objectId: CustomObjectId;
};

export type CustomObjectDefinition = {
  id: CustomObjectId;
  label: string;
  description: string;
  defaultName: string;
  icon: LucideIcon;
  accent: string;
};

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
];

export function isCustomObjectPayload(value: unknown): value is CustomObjectPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as CustomObjectPayload).kind === "custom-object" &&
    typeof (value as CustomObjectPayload).objectId === "string"
  );
}

export function getCustomObjectDefinition(objectId: CustomObjectId): CustomObjectDefinition | undefined {
  return CUSTOM_OBJECTS.find((item) => item.id === objectId);
}
