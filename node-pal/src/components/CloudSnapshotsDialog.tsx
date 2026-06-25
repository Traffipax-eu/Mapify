import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  deleteEncryptedSnapshot,
  listSnapshotsForProject,
  type CloudSnapshotSummary,
} from "@/lib/cloudStorage";
import { formatSupabaseError } from "@/lib/supabaseClient";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CloudSnapshotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onSelect: (snapshot: CloudSnapshotSummary) => void;
}

export function CloudSnapshotsDialog({
  open,
  onOpenChange,
  projectName,
  onSelect,
}: CloudSnapshotsDialogProps) {
  const [snapshots, setSnapshots] = useState<CloudSnapshotSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotToDelete, setSnapshotToDelete] = useState<CloudSnapshotSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listSnapshotsForProject(projectName);
      setSnapshots(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load snapshots");
    } finally {
      setLoading(false);
    }
  }, [projectName]);

  useEffect(() => {
    if (!open) return;
    void loadSnapshots();
  }, [open, loadSnapshots]);

  const handleDeleteSnapshot = async () => {
    if (!snapshotToDelete) return;

    setDeletingId(snapshotToDelete.id);
    try {
      await deleteEncryptedSnapshot(snapshotToDelete.id, projectName);
      await loadSnapshots();
      toast.success("Encrypted backup deleted from cloud");
      setSnapshotToDelete(null);
    } catch (err) {
      toast.error(formatSupabaseError(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Load from Cloud</DialogTitle>
            <DialogDescription>
              Encrypted backups for <strong>{projectName}</strong> only — the project you currently
              have open.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading snapshots…
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {!loading && !error && snapshots.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No encrypted cloud backups for this project yet.
            </p>
          )}

          {!loading && !error && snapshots.length > 0 && (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {snapshots.map((snapshot) => (
                <li key={snapshot.id} className="flex items-stretch gap-1">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
                    onClick={() => {
                      onSelect(snapshot);
                      onOpenChange(false);
                    }}
                  >
                    <span className="truncate">
                      <span className="font-medium">{snapshot.sheetName}</span>
                      <span className="text-muted-foreground"> · encrypted backup</span>
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {new Date(snapshot.updatedAt).toLocaleString()}
                    </span>
                  </button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-destructive hover:text-destructive"
                    disabled={deletingId === snapshot.id}
                    title="Delete this backup from cloud"
                    onClick={() => setSnapshotToDelete(snapshot)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={snapshotToDelete !== null}
        onOpenChange={(next) => {
          if (!next) setSnapshotToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete encrypted backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the cloud backup for sheet &quot;{snapshotToDelete?.sheetName}&quot; in
              &quot;{projectName}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingId !== null}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteSnapshot();
              }}
            >
              {deletingId ? "Deleting…" : "Delete backup"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
