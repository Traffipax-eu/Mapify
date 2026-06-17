import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ClearCanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onExportFirst: () => void;
  onConfirmClear: () => void;
}

export function ClearCanvasDialog({
  open,
  onOpenChange,
  onCancel,
  onExportFirst,
  onConfirmClear,
}: ClearCanvasDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="clear-canvas-dialog sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl">Clear the entire board?</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Are you sure you want to clear the entire board? All unsaved changes and drawings will be
            permanently lost.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button variant="outline" onClick={onCancel} className="sm:min-w-[100px]">
            Cancel
          </Button>
          <Button onClick={onExportFirst} className="sm:min-w-[120px]">
            Export First
          </Button>
          <Button variant="destructive" onClick={onConfirmClear} className="sm:min-w-[160px]">
            Yes, Clear Everything
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
