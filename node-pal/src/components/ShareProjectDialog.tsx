import { useCallback, useState } from "react";
import { Copy, Eye, Link2, Mail, Share2 } from "lucide-react";
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
import { inviteProjectMember } from "@/lib/projectCollaboration";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import {
  buildEncryptedEmbedUrl,
  buildPlainEmbedUrl,
  packDiagramEmbedPayload,
  type DiagramEmbedPayload,
} from "@/lib/embedExport";
import { encryptPlaintext } from "@/utils/encryption";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectName: string;
  getPayload: () => DiagramEmbedPayload;
};

export function ShareProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  getPayload,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [viewLink, setViewLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const generateViewLink = useCallback(async (): Promise<string | null> => {
    setIsGenerating(true);
    try {
      const payload = getPayload();
      const packed = await packDiagramEmbedPayload(payload);

      const link = password.trim()
        ? buildEncryptedEmbedUrl(encryptPlaintext(packed, password.trim()))
        : buildPlainEmbedUrl(packed);

      setViewLink(link);
      toast.success("View link generated");
      return link;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate view link");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [getPayload, password]);

  const handleInviteViewer = async () => {
    if (!email.trim()) return;

    setIsInviting(true);
    try {
      if (!viewLink) {
        await generateViewLink();
      }

      if (projectId && isSupabaseConfigured()) {
        await inviteProjectMember({
          projectId,
          projectName,
          email: email.trim(),
          role: "viewer",
        });
      }

      setEmail("");
      toast.success("Viewer added — copy the link and send it to them");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save invite");
    } finally {
      setIsInviting(false);
    }
  };

  const copyLink = async () => {
    if (!viewLink) return;
    await navigator.clipboard.writeText(viewLink);
    toast.success("View link copied");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share for viewing
          </DialogTitle>
          <DialogDescription>
            Generate a read-only link so others can open and explore this diagram. They cannot edit
            your canvas — only view, pan, and zoom.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-password">Password (optional)</Label>
            <Input
              id="share-password"
              type="password"
              placeholder="Leave empty for an open link"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              With a password, viewers must unlock the link before they can see the diagram.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void generateViewLink()} disabled={isGenerating}>
              <Link2 className="mr-1.5 h-4 w-4" />
              {isGenerating ? "Generating…" : "Generate view link"}
            </Button>
            {viewLink && (
              <Button type="button" variant="secondary" onClick={() => void copyLink()}>
                <Copy className="mr-1.5 h-4 w-4" />
                Copy link
              </Button>
            )}
          </div>

          {viewLink && (
            <div className="space-y-2">
              <Label>View link</Label>
              <Input
                readOnly
                value={viewLink}
                className="text-xs font-mono"
                onFocus={(event) => event.target.select()}
              />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                Opens read-only — no editing, no real-time sync.
              </p>
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="share-viewer-email">Invite by email (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Records a viewer invite{isSupabaseConfigured() ? " in your project" : ""}. You still
              send them the view link yourself (e-mail, Teams, etc.).
            </p>
            <div className="flex gap-2">
              <Input
                id="share-viewer-email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleInviteViewer()}
                disabled={!email.trim() || isInviting}
              >
                <Mail className="mr-1.5 h-4 w-4" />
                Add viewer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
