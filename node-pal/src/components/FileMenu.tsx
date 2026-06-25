import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  ChevronDown,
  CloudDownload,
  CloudUpload,
  Code2,
  Download,
  FileImage,
  FileType,
  FolderOpen,
  FilePlus,
  Lock,
  Save,
  Shield,
  Upload,
} from "lucide-react";

interface FileMenuProps {
  isSaving: boolean;
  saveSuccess: boolean;
  isVisualExporting: boolean;
  cloudConfigured: boolean;
  onLocalSave: () => void;
  onNewProject: () => void;
  onSaveToCloud: () => void;
  onLoadFromCloud: () => void;
  onImportJson: (file: File) => void;
  onImportEncrypted: (file: File) => void;
  onExportJson: () => void;
  onExportEncrypted: () => void;
  onGenerateEmbed: () => void;
  onVisualExport: (format: "png" | "jpeg" | "pdf") => void;
}

export function FileMenu({
  isSaving,
  saveSuccess,
  isVisualExporting,
  cloudConfigured,
  onLocalSave,
  onNewProject,
  onSaveToCloud,
  onLoadFromCloud,
  onImportJson,
  onImportEncrypted,
  onExportJson,
  onExportEncrypted,
  onGenerateEmbed,
  onVisualExport,
}: FileMenuProps) {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const encryptedInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={jsonInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportJson(file);
          e.target.value = "";
        }}
      />
      <input
        ref={encryptedInputRef}
        type="file"
        accept=".encrypted,.txt,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportEncrypted(file);
          e.target.value = "";
        }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderOpen className="mr-1.5 h-4 w-4" />
            File
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onLocalSave} disabled={isSaving}>
            {saveSuccess ? (
              <Check className="mr-2 h-4 w-4 text-green-600" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saveSuccess ? "Saved!" : "Save (local)"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onNewProject}>
            <FilePlus className="mr-2 h-4 w-4" />
            New project…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSaveToCloud} disabled={!cloudConfigured}>
            <CloudUpload className="mr-2 h-4 w-4" />
            Save to Cloud…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onLoadFromCloud} disabled={!cloudConfigured}>
            <CloudDownload className="mr-2 h-4 w-4" />
            Load from Cloud…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => jsonInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Import JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => encryptedInputRef.current?.click()}>
            <Lock className="mr-2 h-4 w-4" />
            Import Encrypted
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onExportJson}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportEncrypted}>
            <Shield className="mr-2 h-4 w-4" />
            Export Encrypted
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onGenerateEmbed}>
            <Code2 className="mr-2 h-4 w-4" />
            Embed snippet
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isVisualExporting}>
              <FileImage className="mr-2 h-4 w-4" />
              Export as image
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onVisualExport("png")}>
                <FileImage className="mr-2 h-4 w-4" />
                PNG (transparent)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onVisualExport("jpeg")}>
                <FileImage className="mr-2 h-4 w-4" />
                JPEG (white background)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onVisualExport("pdf")}>
                <FileType className="mr-2 h-4 w-4" />
                PDF document
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
