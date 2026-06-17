import { useState } from "react";
import {
  Database,
  Plus,
  Settings,
  Trash2,
  Shapes,
  Type,
  StickyNote,
  ChevronDown,
  ChevronRight,
  Box,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Schema, NodeGroupSchema } from "@/lib/storage";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";
import type { Dispatch, SetStateAction } from "react";
import { DRAWING_TOOLS, type DrawingToolId } from "@/lib/drawingTools";
import { CUSTOM_OBJECTS, type CustomObjectId } from "@/lib/customObjects";

interface Props {
  schema: Schema;
  onUpdateSchema: Dispatch<SetStateAction<Schema>>;
  onOpenSchemaBuilder: (groupId?: string) => void;
  onDeleteGroup: (groupId: string) => void;
}

const TOOL_ICONS: Record<DrawingToolId, typeof Type> = {
  textbox: Type,
  sticky: StickyNote,
  container: Box,
};

export function Sidebar({ schema, onUpdateSchema, onOpenSchemaBuilder, onDeleteGroup }: Props) {
  const [toolsOpen, setToolsOpen] = useState(true);
  const [objectsOpen, setObjectsOpen] = useState(true);

  const addGroup = () => {
    const newGroup: NodeGroupSchema = {
      id: `ng_${Date.now()}`,
      name: `Group ${schema.nodeGroups.length + 1}`,
      properties: [],
      color: "#3b82f6",
    };

    onUpdateSchema((prev) => ({
      ...prev,
      nodeGroups: [...prev.nodeGroups, newGroup],
    }));
    onOpenSchemaBuilder(newGroup.id);
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4" />
          <span>Node Groups</span>
        </div>
        <button
          onClick={addGroup}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          Create New Group
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        {schema.nodeGroups.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1">
            No groups yet. Create one to define your schema and drag it onto the canvas.
          </p>
        )}
        {schema.nodeGroups.map((item) => (
          <GroupCard
            key={item.id}
            item={item}
            globalCount={schema.globalProperties?.length ?? 0}
            onEdit={() => onOpenSchemaBuilder(item.id)}
            onDelete={() => onDeleteGroup(item.id)}
          />
        ))}

        <Collapsible open={toolsOpen} onOpenChange={setToolsOpen} className="mt-2 border-t border-sidebar-border pt-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-2 text-sm font-semibold hover:bg-accent/50 transition">
            <span className="flex items-center gap-2">
              <Shapes className="h-4 w-4" />
              Drawing Tools
            </span>
            {toolsOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 grid grid-cols-2 gap-2">
            {DRAWING_TOOLS.map((tool) => (
              <DrawingToolCard key={tool.id} tool={tool.id} label={tool.label} description={tool.description} />
            ))}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={objectsOpen} onOpenChange={setObjectsOpen} className="mt-2 border-t border-sidebar-border pt-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-2 text-sm font-semibold hover:bg-accent/50 transition">
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Custom Objects
            </span>
            {objectsOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 grid grid-cols-2 gap-2">
            {CUSTOM_OBJECTS.map((object) => (
              <CustomObjectCard key={object.id} objectId={object.id} label={object.label} description={object.description} icon={object.icon} accent={object.accent} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="mt-auto border-t border-sidebar-border p-4 text-xs text-muted-foreground">
        Drag node groups, drawing tools, or custom objects onto the canvas.
      </div>
    </aside>
  );
}

function GroupCard({
  item,
  globalCount,
  onEdit,
  onDelete,
}: {
  item: NodeGroupSchema;
  globalCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const onDragStart = (e: React.DragEvent, group: NodeGroupSchema) => {
    e.dataTransfer.setData("application/reactflow", JSON.stringify({ kind: "node-group", ...group }));
    e.dataTransfer.effectAllowed = "move";
  };

  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      className="group rounded-xl border bg-background/70 p-3 transition hover:-translate-y-0.5 hover:shadow-sm cursor-grab active:cursor-grabbing"
      style={{
        borderColor: item.color || "#3b82f6",
        backgroundColor: `${item.color || "#3b82f6"}10`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {globalCount} {SCHEMA_SCOPE_LABELS.global.short} · {item.properties.length}{" "}
            {SCHEMA_SCOPE_LABELS.group.short}
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onEdit();
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            title="Edit group schema"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onDelete();
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            title="Delete group and remove from canvas"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <span
            className="h-2.5 w-2.5 rounded-full ml-1"
            style={{ backgroundColor: item.color || "#3b82f6" }}
          />
        </div>
      </div>
    </div>
  );
}

function DrawingToolCard({
  tool,
  label,
  description,
}: {
  tool: DrawingToolId;
  label: string;
  description: string;
}) {
  const Icon = TOOL_ICONS[tool];

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ kind: "drawing-tool", tool }),
    );
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      title={description}
      className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-background/80 p-3 text-center transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm cursor-grab active:cursor-grabbing"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/30">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </div>
  );
}

function CustomObjectCard({
  objectId,
  label,
  description,
  icon: Icon,
  accent,
}: {
  objectId: CustomObjectId;
  label: string;
  description: string;
  icon: typeof Database;
  accent: string;
}) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify(
        objectId === "custom"
          ? { kind: "custom-object-template" }
          : { kind: "custom-object", objectId },
      ),
    );
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      title={description}
      className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-background/80 p-3 text-center transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm cursor-grab active:cursor-grabbing"
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted/30"
        style={{ borderColor: `${accent}55`, color: accent }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </div>
  );
}
