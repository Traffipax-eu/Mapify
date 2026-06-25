import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { History, RotateCcw, Eye, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProjectVersions, type ProjectVersion } from "@/lib/projectCollaboration";
import { isSupabaseConfigured, formatSupabaseError } from "@/lib/supabaseClient";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
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
  sheetId,
  previewVersionId,
  onPreviewVersion,
  onRestoreVersion,
  onExitPreview,
}: Props) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);

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
    if (open) void loadVersions();
  }, [open, loadVersions]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Version history
          </SheetTitle>
          <SheetDescription>
            Saved snapshots of this sheet. Preview read-only, then restore when ready.
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
              No saved versions yet. Use &quot;Save version&quot; in the header to create one.
            </p>
          )}

          {versions.map((version) => {
            const isPreviewing = previewVersionId === version.id;
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
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
