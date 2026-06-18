import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DiagramEmbedCanvas } from "@/components/DiagramEmbedCanvas";
import {
  readEmbedCiphertextFromHash,
  type DiagramEmbedPayload,
} from "@/lib/embedExport";
import { decryptData } from "@/utils/encryption";

export function EmbedViewer() {
  const [ciphertext, setCiphertext] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [payload, setPayload] = useState<DiagramEmbedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    const fromHash = readEmbedCiphertextFromHash();
    if (!fromHash) {
      setError("No encrypted diagram found in this embed link.");
      return;
    }
    setCiphertext(fromHash);
    setError(null);
  }, []);

  const unlock = useCallback(async () => {
    if (!ciphertext) return;
    if (!password.trim()) {
      setError("Enter the embed password.");
      return;
    }

    setIsUnlocking(true);
    setError(null);
    try {
      const parsed = decryptData<DiagramEmbedPayload>(ciphertext, password);
      if (!parsed?.nodes || !parsed?.edges) {
        setError("Invalid password or corrupted embed data.");
        setPayload(null);
        return;
      }
      setPayload(parsed);
    } finally {
      setIsUnlocking(false);
    }
  }, [ciphertext, password]);

  const title = useMemo(
    () => payload?.projectName?.trim() || "Mapify embed",
    [payload?.projectName],
  );

  if (payload) {
    return (
      <div className="embed-viewer embed-viewer--ready">
        <DiagramEmbedCanvas payload={payload} className="embed-viewer__canvas" />
      </div>
    );
  }

  return (
    <div className="embed-viewer embed-viewer--locked">
      <div className="embed-viewer__card">
        <div className="embed-viewer__icon">
          <Shield className="h-8 w-8 text-[#0067F5]" />
        </div>
        <h1 className="embed-viewer__title">{title}</h1>
        <p className="embed-viewer__text">
          This interactive diagram is encrypted. Enter the password shared by the author to unlock
          pan, zoom, and selection inside the embed.
        </p>

        {ciphertext ? (
          <form
            className="embed-viewer__form"
            onSubmit={(event) => {
              event.preventDefault();
              void unlock();
            }}
          >
            <Label htmlFor="embed-password">Embed password</Label>
            <div className="embed-viewer__password-row">
              <Input
                id="embed-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <Lock className="h-4 w-4" />
              </Button>
            </div>
            {error ? <p className="embed-viewer__error">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isUnlocking}>
              {isUnlocking ? "Unlocking…" : "Unlock diagram"}
            </Button>
          </form>
        ) : (
          <p className="embed-viewer__error">{error ?? "Missing embed data."}</p>
        )}
      </div>
    </div>
  );
}
