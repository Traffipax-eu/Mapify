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
  Layers,
  Sparkles,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Schema, NodeGroupSchema } from "@/lib/storage";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";
import type { Dispatch, SetStateAction } from "react";
import { DRAWING_TOOLS, type DrawingToolId } from "@/lib/drawingTools";
import { CUSTOM_OBJECTS, type CustomObjectId } from "@/lib/customObjects";
import { PRO_ICON_COLORS } from "@/lib/brand";

interface Props {
  schema: Schema;
  onUpdateSchema: Dispatch<SetStateAction<Schema>>;
  onOpenSchemaBuilder: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onOpenCustomObjectCreator: () => void;
}

const TOOL_ICONS: Record<DrawingToolId, typeof Type> = {
  textbox: Type,
  sticky: StickyNote,
  container: Box,
};

export function Sidebar({
  schema,
  onUpdateSchema,
  onOpenSchemaBuilder,
  onDeleteGroup,
  onOpenCustomObjectCreator,
}: Props) {
  const [toolsOpen, setToolsOpen] = useState(true);
  const [artifactsOpen, setArtifactsOpen] = useState(true);

  const addGroup = () => {
    const newGroup: NodeGroupSchema = {
      id: `ng_${Date.now()}`,
      name: `Block ${schema.nodeGroups.length + 1}`,
      properties: [],
      color: PRO_ICON_COLORS.block,
    };

    onUpdateSchema((prev) => ({
      ...prev,
      nodeGroups: [...prev.nodeGroups, newGroup],
    }));
    onOpenSchemaBuilder(newGroup.id);
  };

  return (
    <aside className="mapify-sidebar flex w-72 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border/60 bg-sidebar p-4">
        <div className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <Database className="h-4 w-4 text-primary" />
          <span>Blocks</span>
        </div>
        <button
          onClick={addGroup}
          className="palette-chip ui-bounce inline-flex items-center gap-1 rounded-xl border-2 border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          New Block
        </button>
      </div>

      <div className="mapify-sidebar__blocks-list flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
        {schema.nodeGroups.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1">
            No blocks yet. Create one to define your schema and drag it onto the canvas.
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
        </div>

        <div className="flex flex-col gap-3 px-4 pb-4">
        <Collapsible open={toolsOpen} onOpenChange={setToolsOpen} className="mt-2 border-t border-sidebar-border pt-4">
          <CollapsibleTrigger className="ui-bounce flex w-full items-center justify-between gap-2 rounded-xl px-1 py-2 text-sm font-bold tracking-tight hover:bg-accent/50 transition">
            <span className="flex items-center gap-2">
              <Shapes className="h-4 w-4 text-primary" />
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

        <Collapsible open={artifactsOpen} onOpenChange={setArtifactsOpen} className="mt-2 border-t border-sidebar-border pt-4">
          <CollapsibleTrigger className="ui-bounce flex w-full items-center justify-between gap-2 rounded-xl px-1 py-2 text-sm font-bold tracking-tight hover:bg-accent/50 transition">
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Custom Objects
            </span>
            {artifactsOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 grid grid-cols-2 gap-2">
            {CUSTOM_OBJECTS.map((object) => (
              <ArtifactCard
                key={object.id}
                objectId={object.id}
                label={object.label}
                description={object.description}
                icon={object.icon}
                accent={object.accent}
              />
            ))}
            <CustomObjectCreatorCard onOpen={onOpenCustomObjectCreator} />
          </CollapsibleContent>
        </Collapsible>
        </div>
      </div>

      <div className="mt-auto shrink-0 border-t border-sidebar-border p-4 text-xs text-muted-foreground">
        Drag blocks, custom objects, or tools onto the canvas.
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
  const accent = item.color || PRO_ICON_COLORS.block;

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
      className="palette-card palette-card--block ui-bounce group relative cursor-grab active:cursor-grabbing"
    >
      <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-[3px_3px_0_0_rgb(15_23_42/0.06)]">
        <div
          className="w-full px-3 py-2"
          style={{ backgroundColor: accent }}
        >
          <p className="truncate text-sm font-bold tracking-tight text-white">{item.name}</p>
        </div>
        <div className="flex items-start justify-between gap-2 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">
              {globalCount} {SCHEMA_SCOPE_LABELS.global.short} · {item.properties.length}{" "}
              {SCHEMA_SCOPE_LABELS.group.short}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onPointerDown={stop}
              onClick={(e) => {
                stop(e);
                onEdit();
              }}
              className="ui-bounce inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              title="Edit block schema"
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
              className="ui-bounce inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              title="Delete block and remove from canvas"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
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
      className="palette-card ui-bounce flex cursor-grab flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2.5 text-center shadow-[3px_3px_0_0_rgb(15_23_42/0.06)] active:cursor-grabbing"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/25">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <span className="text-[10px] font-bold leading-tight tracking-tight">{label}</span>
    </div>
  );
}

function ArtifactCard({
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
      JSON.stringify({ kind: "custom-object", objectId }),
    );
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      title={description}
      className="palette-card ui-bounce flex min-h-[76px] cursor-grab flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 text-center shadow-[3px_3px_0_0_rgb(15_23_42/0.06)] active:cursor-grabbing"
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
        style={{ color: accent }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[10px] font-bold leading-tight tracking-tight text-slate-700">{label}</span>
    </div>
  );
}

function CustomObjectCreatorCard({ onOpen }: { onOpen: () => void }) {
  const accent = PRO_ICON_COLORS.custom;

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ kind: "custom-object-template" }),
    );
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      title="Pick your own icon and color"
      className="palette-card ui-bounce flex min-h-[76px] cursor-grab flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white p-2 text-center shadow-[3px_3px_0_0_rgb(15_23_42/0.04)] active:cursor-grabbing"
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
        style={{ color: accent }}
      >
        <Sparkles className="h-4 w-4" />
      </div>
      <span className="text-[10px] font-bold leading-tight tracking-tight text-slate-700">
        Custom Object
      </span>
    </button>
  );
}
