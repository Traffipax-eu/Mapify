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

interface NodeNameDialogProps {
  open: boolean;
  defaultName: string;
  blockName?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function NodeNameDialog({
  open,
  defaultName,
  blockName,
  onOpenChange,
  onConfirm,
  onCancel,
}: NodeNameDialogProps) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Name this block</DialogTitle>
          <DialogDescription>
            {blockName
              ? `You dropped "${blockName}" onto the canvas. What should this instance be called?`
              : "What should this block be called?"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="node-instance-name">Block name</Label>
            <Input
              id="node-instance-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CRM, Billing API"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Add to canvas
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
