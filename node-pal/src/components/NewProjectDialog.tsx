import { FilePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NewProjectDialogProps {
  open: boolean;
  projectName: string;
  isCreating: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onContinueWithoutSaving: () => void;
  onSaveAndContinue: () => void;
}

export function NewProjectDialog({
  open,
  projectName,
  isCreating,
  onOpenChange,
  onCancel,
  onContinueWithoutSaving,
  onSaveAndContinue,
}: NewProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary sm:mx-0">
            <FilePlus className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl">Start a new project?</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            You are working on <strong>{projectName}</strong>. Save your current work before opening a
            blank project, or continue without saving.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            className="w-full"
            disabled={isCreating}
            onClick={onSaveAndContinue}
          >
            {isCreating ? "Creating…" : "Save and start new project"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isCreating}
            onClick={onContinueWithoutSaving}
          >
            Start new project without saving
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={isCreating}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
