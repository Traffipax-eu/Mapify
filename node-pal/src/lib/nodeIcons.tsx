import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Box,
  Cloud,
  Database,
  FileText,
  GitBranch,
  Globe,
  Layers,
  Server,
  Settings2,
  Table2,
  Workflow,
} from "lucide-react";

export type NodeIconId =
  | "database"
  | "server"
  | "report"
  | "file"
  | "cloud"
  | "workflow"
  | "table"
  | "layers"
  | "globe"
  | "box"
  | "settings"
  | "branch";

export const NODE_ICON_OPTIONS: { id: NodeIconId; label: string; Icon: LucideIcon }[] = [
  { id: "database", label: "Database", Icon: Database },
  { id: "server", label: "System", Icon: Server },
  { id: "report", label: "Report", Icon: BarChart3 },
  { id: "file", label: "Document", Icon: FileText },
  { id: "table", label: "Table", Icon: Table2 },
  { id: "cloud", label: "Cloud", Icon: Cloud },
  { id: "workflow", label: "Pipeline", Icon: Workflow },
  { id: "branch", label: "Branch", Icon: GitBranch },
  { id: "layers", label: "Layers", Icon: Layers },
  { id: "globe", label: "API", Icon: Globe },
  { id: "box", label: "Package", Icon: Box },
  { id: "settings", label: "Service", Icon: Settings2 },
];

const ICON_MAP = Object.fromEntries(NODE_ICON_OPTIONS.map((o) => [o.id, o.Icon])) as Record<
  NodeIconId,
  LucideIcon
>;

export function getNodeIcon(iconId?: string): LucideIcon {
  if (iconId && iconId in ICON_MAP) {
    return ICON_MAP[iconId as NodeIconId];
  }
  return Database;
}
