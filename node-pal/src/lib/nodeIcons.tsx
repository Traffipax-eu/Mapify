import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  Box,
  Briefcase,
  Building2,
  Calendar,
  Cloud,
  Code2,
  Contact,
  Cpu,
  Database,
  FileText,
  Folder,
  GitBranch,
  Globe,
  HardDrive,
  Key,
  Layers,
  Link2,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  Network,
  Package,
  Phone,
  Plug,
  Radio,
  Server,
  Settings2,
  Shield,
  Table2,
  Tag,
  User,
  Users,
  Workflow,
  Wrench,
  Zap,
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
  | "branch"
  | "user"
  | "users"
  | "shield"
  | "mail"
  | "phone"
  | "link"
  | "key"
  | "lock"
  | "building"
  | "briefcase"
  | "folder"
  | "package"
  | "archive"
  | "cpu"
  | "hard-drive"
  | "network"
  | "monitor"
  | "plug"
  | "code"
  | "map-pin"
  | "calendar"
  | "bell"
  | "message"
  | "tag"
  | "activity"
  | "zap"
  | "wrench"
  | "contact"
  | "radio";

export const NODE_ICON_OPTIONS: { id: NodeIconId; label: string; Icon: LucideIcon }[] = [
  { id: "user", label: "User", Icon: User },
  { id: "users", label: "Team", Icon: Users },
  { id: "shield", label: "Security", Icon: Shield },
  { id: "globe", label: "Web / API", Icon: Globe },
  { id: "mail", label: "Email", Icon: Mail },
  { id: "cloud", label: "Cloud", Icon: Cloud },
  { id: "server", label: "Server", Icon: Server },
  { id: "database", label: "Database", Icon: Database },
  { id: "key", label: "Key", Icon: Key },
  { id: "phone", label: "Phone", Icon: Phone },
  { id: "link", label: "Link", Icon: Link2 },
  { id: "lock", label: "Lock", Icon: Lock },
  { id: "building", label: "Building", Icon: Building2 },
  { id: "briefcase", label: "Business", Icon: Briefcase },
  { id: "report", label: "Report", Icon: BarChart3 },
  { id: "table", label: "Table", Icon: Table2 },
  { id: "file", label: "Document", Icon: FileText },
  { id: "folder", label: "Folder", Icon: Folder },
  { id: "package", label: "Package", Icon: Package },
  { id: "box", label: "Box", Icon: Box },
  { id: "archive", label: "Archive", Icon: Archive },
  { id: "workflow", label: "Pipeline", Icon: Workflow },
  { id: "branch", label: "Branch", Icon: GitBranch },
  { id: "layers", label: "Layers", Icon: Layers },
  { id: "settings", label: "Service", Icon: Settings2 },
  { id: "cpu", label: "Compute", Icon: Cpu },
  { id: "hard-drive", label: "Storage", Icon: HardDrive },
  { id: "network", label: "Network", Icon: Network },
  { id: "monitor", label: "App", Icon: Monitor },
  { id: "plug", label: "Integration", Icon: Plug },
  { id: "code", label: "Code", Icon: Code2 },
  { id: "map-pin", label: "Location", Icon: MapPin },
  { id: "calendar", label: "Schedule", Icon: Calendar },
  { id: "bell", label: "Alert", Icon: Bell },
  { id: "message", label: "Message", Icon: MessageSquare },
  { id: "tag", label: "Tag", Icon: Tag },
  { id: "activity", label: "Activity", Icon: Activity },
  { id: "zap", label: "Action", Icon: Zap },
  { id: "wrench", label: "Tool", Icon: Wrench },
  { id: "contact", label: "Contact", Icon: Contact },
  { id: "radio", label: "Signal", Icon: Radio },
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
