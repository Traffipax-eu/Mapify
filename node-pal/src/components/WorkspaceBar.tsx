import { useEffect, useRef, useState } from "react";
import type { Project, Sheet } from "@/lib/workspaceStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, X, FilePlus } from "lucide-react";

interface WorkspaceBarProps {
  project: Project | null;
  sheets: Sheet[];
  activeSheetId: string | null;
  onProjectNameChange: (name: string) => void;
  onNewProject: () => void;
  onSheetSelect: (sheetId: string) => void;
  onSheetRename: (sheetId: string, name: string) => void;
  onSheetCreate: () => void;
  onSheetDelete: (sheetId: string) => void;
}

export function WorkspaceBar({
  project,
  sheets,
  activeSheetId,
  onProjectNameChange,
  onNewProject,
  onSheetSelect,
  onSheetRename,
  onSheetCreate,
  onSheetDelete,
}: WorkspaceBarProps) {
  const [projectName, setProjectName] = useState(project?.name ?? "");
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editingSheetName, setEditingSheetName] = useState("");
  const projectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProjectName(project?.name ?? "");
  }, [project?.name]);

  const commitProjectName = () => {
    const trimmed = projectName.trim() || "Untitled Project";
    setProjectName(trimmed);
    if (trimmed !== project?.name) {
      onProjectNameChange(trimmed);
    }
  };

  const startRenameSheet = (sheet: Sheet) => {
    setEditingSheetId(sheet.id);
    setEditingSheetName(sheet.name);
  };

  const commitSheetRename = () => {
    if (!editingSheetId) return;
    const trimmed = editingSheetName.trim() || "Sheet";
    onSheetRename(editingSheetId, trimmed);
    setEditingSheetId(null);
  };

  return (
    <div className="mapify-workspace-bar border-b border-border bg-muted/20 px-4 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <Input
            ref={projectInputRef}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={commitProjectName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="h-8 w-48 max-w-full border-transparent bg-transparent px-2 text-sm font-semibold shadow-none focus-visible:border-border focus-visible:bg-background"
            aria-label="Project name"
          />

          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-8 shrink-0 text-xs"
            onClick={onNewProject}
          >
            <FilePlus className="mr-1.5 h-3.5 w-3.5" />
            New project
          </Button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {sheets.map((sheet) => {
            const isActive = sheet.id === activeSheetId;
            const isEditing = editingSheetId === sheet.id;

            return (
              <div
                key={sheet.id}
                className={cn(
                  "group flex shrink-0 items-center rounded-md border text-xs transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/60",
                )}
              >
                {isEditing ? (
                  <Input
                    autoFocus
                    value={editingSheetName}
                    onChange={(e) => setEditingSheetName(e.target.value)}
                    onBlur={commitSheetRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setEditingSheetId(null);
                    }}
                    className="h-7 w-28 border-0 bg-transparent px-2 text-xs shadow-none"
                  />
                ) : (
                  <button
                    type="button"
                    className="h-7 px-3"
                    title="Double-click to rename"
                    onClick={() => onSheetSelect(sheet.id)}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      startRenameSheet(sheet);
                    }}
                  >
                    {sheet.name}
                  </button>
                )}
                {sheets.length > 1 && isActive && !isEditing && (
                  <button
                    type="button"
                    className="mr-1 rounded p-0.5 opacity-60 hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                    onClick={() => {
                      if (window.confirm(`Delete sheet "${sheet.name}"?`)) {
                        onSheetDelete(sheet.id);
                      }
                    }}
                    aria-label={`Delete ${sheet.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={onSheetCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            New sheet
          </Button>
        </div>
      </div>
    </div>
  );
}
