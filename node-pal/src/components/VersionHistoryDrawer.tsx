import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CloudOff, History, RotateCcw, Eye, Trash2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  deleteCloudProject,
  deleteProjectVersion,
  getProjectVersions,
  type ProjectVersion,
} from "@/lib/projectCollaboration";
import { isSupabaseConfigured, formatSupabaseError } from "@/lib/supabaseClient";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectName: string;
  sheetId: string | null;
  previewVersionId: string | null;
  onPreviewVersion: (version: ProjectVersion) => void;
  onRestoreVersion: (version: ProjectVersion) => void;
  onExitPreview: () => void;
};

export function VersionHistoryDrawer({
  open,
  onOpenChange,
  projectId,
  projectName,
  sheetId,
  previewVersionId,
  onPreviewVersion,
  onRestoreVersion,
  onExitPreview,
}: Props) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const loadVersions = useCallback(async () => {
    if (!projectId || !sheetId || !isSupabaseConfigured()) return;
    setLoading(true);
    try {
      const rows = await getProjectVersions(projectId, sheetId);
      setVersions(rows);
    } catch (error) {
      toast.error(formatSupabaseError(error));
    } finally {
      setLoading(false);
    }
  }, [projectId, sheetId]);

  useEffect(() => {
    setVersions([]);
    if (open) void loadVersions();
  }, [open, projectId, sheetId, loadVersions]);

  const isVersionInOpenProject = (version: ProjectVersion) =>
    Boolean(
      projectId &&
        sheetId &&
        version.projectId === projectId &&
        version.sheetId === sheetId,
    );

  const handleDeleteVersion = async (version: ProjectVersion) => {
    if (!projectId || !sheetId) return;
    if (!isVersionInOpenProject(version)) {
      toast.error("You can only delete versions from the project and sheet you have open.");
      return;
    }

    if (
      !window.confirm(
        `Delete version "${version.versionName}" from "${projectName}" in the cloud? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingVersionId(version.id);
    try {
      await deleteProjectVersion(version.id, { projectId, sheetId });
      if (previewVersionId === version.id) {
        onExitPreview();
      }
      await loadVersions();
      toast.success(`Deleted "${version.versionName}"`);
    } catch (error) {
      toast.error(formatSupabaseError(error));
    } finally {
      setDeletingVersionId(null);
    }
  };

  const handleDeleteCloudProject = async () => {
    if (!projectId) return;

    const confirmed = window.confirm(
      `Delete all cloud data for the project you have open: "${projectName}"?\n\nOnly this project's versions, invites, and encrypted backups are removed. Other projects in the cloud are not affected. Your local canvas is not deleted.`,
    );
    if (!confirmed) return;

    const typed = window.prompt(
      `Type the project name exactly to confirm cloud deletion for "${projectName}":`,
    );
    if (typed?.trim() !== projectName) {
      toast.message("Cloud deletion cancelled");
      return;
    }

    setIsDeletingProject(true);
    try {
      await deleteCloudProject(projectId, { projectName });
      if (previewVersionId) {
        onExitPreview();
      }
      setVersions([]);
      toast.success("Cloud data deleted for this project");
    } catch (error) {
      toast.error(formatSupabaseError(error));
    } finally {
      setIsDeletingProject(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Version history
          </SheetTitle>
          <SheetDescription>
            Saved snapshots of this sheet in the cloud. Preview read-only, restore, or delete versions
            you no longer need.
          </SheetDescription>
        </SheetHeader>

        {previewVersionId && (
          <div className="version-preview-banner">
            <span>Read-only preview active</span>
            <Button type="button" size="sm" variant="outline" onClick={onExitPreview}>
              <X className="mr-1 h-3.5 w-3.5" />
              Exit preview
            </Button>
          </div>
        )}

        <div className="version-history-list flex-1 overflow-y-auto">
          {!isSupabaseConfigured() && (
            <p className="text-sm text-muted-foreground">
              Connect Supabase to persist version history across devices.
            </p>
          )}

          {loading && <p className="text-sm text-muted-foreground">Loading versions…</p>}

          {!loading && versions.length === 0 && isSupabaseConfigured() && (
            <p className="text-sm text-muted-foreground">
              No saved versions yet. Use &quot;Save Version&quot; in the header to create one.
            </p>
          )}

          {versions.map((version) => {
            const isPreviewing = previewVersionId === version.id;
            const isDeleting = deletingVersionId === version.id;
            return (
              <div
                key={version.id}
                className={`version-history-item ${isPreviewing ? "version-history-item--active" : ""}`}
              >
                <div className="version-history-item__meta">
                  <strong>{version.versionName}</strong>
                  <span className="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleString()}
                    {" · "}
                    {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                  </span>
                  {version.createdBy && (
                    <span className="text-xs text-muted-foreground">by {version.createdBy}</span>
                  )}
                </div>
                <div className="version-history-item__actions">
                  {isPreviewing ? (
                    <Badge variant="secondary">Previewing</Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onPreviewVersion(version)}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      Preview
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    onClick={() => onRestoreVersion(version)}
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Restore
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={isDeleting}
                    onClick={() => void handleDeleteVersion(version)}
                    title="Delete this version from cloud"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {isSupabaseConfigured() && projectId && (
          <div className="version-history-footer border-t border-border pt-4">
            <p className="mb-2 text-xs text-muted-foreground">
              Delete cloud data for <strong>{projectName}</strong> only — the project you currently
              have open. Other cloud projects are not affected. Your local project stays on this
              device.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              disabled={isDeletingProject}
              onClick={() => void handleDeleteCloudProject()}
            >
              <CloudOff className="mr-1.5 h-4 w-4" />
              {isDeletingProject
                ? "Deleting cloud data…"
                : `Delete cloud data for "${projectName}"`}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
