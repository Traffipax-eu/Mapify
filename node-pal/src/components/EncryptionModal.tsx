import { useState } from "react";
import { AlertTriangle, Eye, EyeOff, Lock, Shield } from "lucide-react";
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

export type EncryptionModalMode = "encrypt" | "decrypt";

type EncryptionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: EncryptionModalMode;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: (password: string) => void | Promise<void>;
};

export function EncryptionModal({
  open,
  onOpenChange,
  mode,
  title,
  description,
  confirmLabel,
  isLoading = false,
  onConfirm,
}: EncryptionModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassword("");
      setShowPassword(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;
    await onConfirm(password);
  };

  const isEncrypt = mode === "encrypt";
  const resolvedTitle = title ?? (isEncrypt ? "Workspace Encryption" : "Unlock Encrypted Workspace");
  const resolvedDescription =
    description ??
    (isEncrypt
      ? "Enter a password to encrypt your diagram before it leaves this device."
      : "Enter the password that was used to encrypt this workspace.");
  const resolvedConfirm = confirmLabel ?? (isEncrypt ? "Encrypt & Save" : "Decrypt & Import");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="encryption-modal sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary sm:mx-0">
            {isEncrypt ? <Shield className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-xl">{resolvedTitle}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{resolvedDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="encryption-modal__warning">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <p>
              Keep this password safe! If you lose it, your data cannot be recovered, as it is encrypted
              locally.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-encryption-password">Workspace Encryption Password</Label>
            <div className="relative">
              <Input
                id="workspace-encryption-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                autoComplete={isEncrypt ? "new-password" : "current-password"}
                className="pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="encryption-modal__eye"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!password.trim() || isLoading}>
              {isLoading ? "Working…" : resolvedConfirm}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
