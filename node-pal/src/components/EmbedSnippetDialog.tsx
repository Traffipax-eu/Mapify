import { useMemo, useState } from "react";
import { Copy, Code2, ExternalLink } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  buildConfluenceHint,
  buildEncryptedEmbedUrl,
  buildIframeSnippet,
  buildPlainEmbedUrl,
  packDiagramEmbedPayload,
  type DiagramEmbedPayload,
} from "@/lib/embedExport";
import { encryptPlaintext } from "@/utils/encryption";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getPayload: () => DiagramEmbedPayload;
};

export function EmbedSnippetDialog({ open, onOpenChange, getPayload }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [generated, setGenerated] = useState<{
    embedUrl: string;
    snippet: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const confluenceHint = useMemo(() => buildConfluenceHint(true), []);

  const reset = () => {
    setPassword("");
    setConfirmPassword("");
    setGenerated(null);
  };

  const handleGenerate = async () => {
    const trimmedPassword = password.trim();
    if (trimmedPassword && trimmedPassword !== confirmPassword.trim()) {
      toast.error("Passwords do not match");
      return;
    }

    setIsGenerating(true);
    try {
      const payload = getPayload();
      const packed = await packDiagramEmbedPayload(payload);
      const embedUrl = trimmedPassword
        ? buildEncryptedEmbedUrl(encryptPlaintext(packed, trimmedPassword))
        : buildPlainEmbedUrl(packed);
      const snippet = buildIframeSnippet(embedUrl, {
        title: payload.projectName,
      });
      setGenerated({ embedUrl, snippet });
      toast.success("Embed snippet ready");
    } catch {
      toast.error("Failed to generate embed");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="embed-snippet-dialog sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-[#0067F5]" />
            Embed snippet
          </DialogTitle>
          <DialogDescription>
            Generate an iframe for Confluence or any site. The diagram loads interactively (pan,
            zoom, select). Leave the password empty for a direct embed, or set one to encrypt the
            link.
          </DialogDescription>
        </DialogHeader>

        {!generated ? (
          <div className="embed-snippet-dialog__form space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <Label htmlFor="embed-gen-password">Password (optional)</Label>
                <Input
                  id="embed-gen-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Leave empty for no password"
                />
              </label>
              <label className="space-y-2 text-sm">
                <Label htmlFor="embed-gen-password-confirm">Confirm password</Label>
                <Input
                  id="embed-gen-password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Only if you set a password"
                  disabled={!password.trim()}
                />
              </label>
            </div>
            <Button type="button" className="w-full" onClick={() => void handleGenerate()} disabled={isGenerating}>
              {isGenerating ? "Generating…" : "Generate snippet"}
            </Button>
          </div>
        ) : (
          <div className="embed-snippet-dialog__result space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Embed URL</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyText(generated.embedUrl, "URL")}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy URL
                  </Button>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <a href={generated.embedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Preview
                    </a>
                  </Button>
                </div>
              </div>
              <Input readOnly value={generated.embedUrl} className="font-mono text-xs" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>HTML iframe snippet</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyText(generated.snippet, "Snippet")}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy snippet
                </Button>
              </div>
              <Textarea readOnly value={generated.snippet} rows={6} className="font-mono text-xs" />
            </div>

            <p className="embed-snippet-dialog__hint text-sm text-muted-foreground">{confluenceHint}</p>

            <Button type="button" variant="outline" className="w-full" onClick={() => setGenerated(null)}>
              Generate another
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
