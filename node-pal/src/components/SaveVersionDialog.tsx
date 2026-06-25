import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  defaultName: string;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (versionName: string) => void;
};

export function SaveVersionDialog({
  open,
  defaultName,
  isSaving,
  onOpenChange,
  onConfirm,
}: Props) {
  const [versionName, setVersionName] = useState(defaultName);

  useEffect(() => {
    if (open) setVersionName(defaultName);
  }, [open, defaultName]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = versionName.trim();
    if (!trimmed || isSaving) return;
    onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save version</DialogTitle>
          <DialogDescription>
            Name this snapshot so you can restore it later from version history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="version-name">Version name</Label>
            <Input
              id="version-name"
              value={versionName}
              onChange={(event) => setVersionName(event.target.value)}
              placeholder="e.g. Initial Draft"
              autoFocus
              disabled={isSaving}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!versionName.trim() || isSaving}>
              {isSaving ? "Saving…" : "Save version"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
