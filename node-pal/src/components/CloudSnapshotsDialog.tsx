import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listSnapshots, type CloudSnapshotSummary } from "@/lib/cloudStorage";
import { Loader2 } from "lucide-react";

interface CloudSnapshotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (snapshot: CloudSnapshotSummary) => void;
}

export function CloudSnapshotsDialog({ open, onOpenChange, onSelect }: CloudSnapshotsDialogProps) {
  const [snapshots, setSnapshots] = useState<CloudSnapshotSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    listSnapshots()
      .then((items) => {
        if (!cancelled) setSnapshots(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load snapshots");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Load from Cloud</DialogTitle>
          <DialogDescription>Select an encrypted snapshot to decrypt and import.</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading snapshots…
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && snapshots.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No cloud snapshots yet.</p>
        )}

        {!loading && !error && snapshots.length > 0 && (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {snapshots.map((snapshot) => (
              <li key={snapshot.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
                  onClick={() => {
                    onSelect(snapshot);
                    onOpenChange(false);
                  }}
                >
                  <span>
                    <span className="font-medium">{snapshot.projectName}</span>
                    <span className="text-muted-foreground"> · {snapshot.sheetName}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(snapshot.updatedAt).toLocaleString()}
                  </span>
                </button>
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
  );
}
