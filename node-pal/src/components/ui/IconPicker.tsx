import { useState } from "react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { 
  Database, Server, HardDrive, Cloud, Globe, Building2, Factory, Store, 
  ShoppingCart, Package, Box, Archive, Folder, FileText, FileCode, Cpu, 
  Microchip, Zap, Bolt, Power, Wifi, Radio, Satellite, Network, Share2, 
  Link, GitBranch, GitMerge, Workflow, Kanban, Layout, Grid, List, Table, 
  Calendar, Clock, Timer, AlarmClock, Bell, Mail, MessageSquare, Send, 
  Phone, User, Users, UserCircle, Shield, Lock, Key, Fingerprint, Eye, 
  EyeOff, Search, Filter, SlidersHorizontal, Settings, Cog, Wrench, 
  Hammer, Palette, Brush, PenTool, Scissors, Eraser, Trash2, 
  Download, Upload, RefreshCw, RotateCcw, Undo, Redo, Copy, Clipboard, 
  CheckCircle, XCircle, AlertCircle, Info, HelpCircle, Star, Heart, 
  Bookmark, Flag, Tag, Hash, AtSign, Percent, DollarSign, Euro, 
  type LucideIcon 
} from "lucide-react";

const ICONS: { name: string; component: LucideIcon }[] = [
  { name: "Database", component: Database },
  { name: "Server", component: Server },
  { name: "HardDrive", component: HardDrive },
  { name: "Cloud", component: Cloud },
  { name: "Globe", component: Globe },
  { name: "Building2", component: Building2 },
  { name: "Factory", component: Factory },
  { name: "Store", component: Store },
  { name: "ShoppingCart", component: ShoppingCart },
  { name: "Package", component: Package },
  { name: "Box", component: Box },
  { name: "Archive", component: Archive },
  { name: "Folder", component: Folder },
  { name: "FileText", component: FileText },
  { name: "FileCode", component: FileCode },
  { name: "Cpu", component: Cpu },
  { name: "Microchip", component: Microchip },
  { name: "Zap", component: Zap },
  { name: "Bolt", component: Bolt },
  { name: "Power", component: Power },
  { name: "Wifi", component: Wifi },
  { name: "Radio", component: Radio },
  { name: "Satellite", component: Satellite },
  { name: "Network", component: Network },
  { name: "Share2", component: Share2 },
  { name: "Link", component: Link },
  { name: "GitBranch", component: GitBranch },
  { name: "GitMerge", component: GitMerge },
  { name: "Workflow", component: Workflow },
  { name: "Kanban", component: Kanban },
  { name: "Layout", component: Layout },
  { name: "Grid", component: Grid },
  { name: "List", component: List },
  { name: "Table", component: Table },
  { name: "Calendar", component: Calendar },
  { name: "Clock", component: Clock },
  { name: "Timer", component: Timer },
  { name: "AlarmClock", component: AlarmClock },
  { name: "Bell", component: Bell },
  { name: "Mail", component: Mail },
  { name: "MessageSquare", component: MessageSquare },
  { name: "Send", component: Send },
  { name: "Phone", component: Phone },
  { name: "User", component: User },
  { name: "Users", component: Users },
  { name: "UserCircle", component: UserCircle },
  { name: "Shield", component: Shield },
  { name: "Lock", component: Lock },
  { name: "Key", component: Key },
  { name: "Fingerprint", component: Fingerprint },
  { name: "Eye", component: Eye },
  { name: "EyeOff", component: EyeOff },
  { name: "Search", component: Search },
  { name: "Filter", component: Filter },
  { name: "SlidersHorizontal", component: SlidersHorizontal },
  { name: "Settings", component: Settings },
  { name: "Cog", component: Cog },
  { name: "Wrench", component: Wrench },
  { name: "Hammer", component: Hammer },
  { name: "Palette", component: Palette },
  { name: "Brush", component: Brush },
  { name: "PenTool", component: PenTool },
  { name: "Scissors", component: Scissors },
  { name: "Eraser", component: Eraser },
  { name: "Trash2", component: Trash2 },
  { name: "Download", component: Download },
  { name: "Upload", component: Upload },
  { name: "RefreshCw", component: RefreshCw },
  { name: "RotateCcw", component: RotateCcw },
  { name: "Undo", component: Undo },
  { name: "Redo", component: Redo },
  { name: "Copy", component: Copy },
  { name: "Clipboard", component: Clipboard },
  { name: "CheckCircle", component: CheckCircle },
  { name: "XCircle", component: XCircle },
  { name: "AlertCircle", component: AlertCircle },
  { name: "Info", component: Info },
  { name: "HelpCircle", component: HelpCircle },
  { name: "Star", component: Star },
  { name: "Heart", component: Heart },
  { name: "Bookmark", component: Bookmark },
  { name: "Flag", component: Flag },
  { name: "Tag", component: Tag },
  { name: "Hash", component: Hash },
  { name: "AtSign", component: AtSign },
  { name: "Percent", component: Percent },
  { name: "DollarSign", component: DollarSign },
  { name: "Euro", component: Euro },
];

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredIcons = ICONS.filter((icon) =>
    icon.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedIcon = ICONS.find((icon) => icon.name === value);
  const IconComponent = selectedIcon?.component || Database;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <IconComponent className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <input
          type="text"
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-3 px-3 py-2 text-sm border rounded-md"
        />
        <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
          {filteredIcons.map((icon) => (
            <button
              key={icon.name}
              onClick={() => {
                onChange(icon.name);
                setOpen(false);
              }}
              className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-accent transition-all"
              title={icon.name}
            >
              <icon.component className="h-4 w-4" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
