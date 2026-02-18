import {
  Save,
  CheckCircle2,
  FileSpreadsheet,
  RotateCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CdvStatut } from "@/types/cdv.types";

interface EditorToolbarProps {
  statut: CdvStatut;
  isSaving: boolean;
  isDirty: boolean;
  isRunningOcr: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
  onSave: () => void;
  onValidate: () => void;
  onGenerate: () => void;
  onRerunOcr: () => void;
}

function formatTimeSince(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "a l'instant";
  if (seconds < 60) return `il y a ${String(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return `il y a ${String(minutes)}min`;
}

function StatutBadge({ statut }: { statut: CdvStatut }) {
  switch (statut) {
    case "a_corriger":
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-300">
          A corriger
        </Badge>
      );
    case "valide":
      return (
        <Badge className="bg-blue-100 text-blue-800">
          Valide
        </Badge>
      );
    case "genere":
      return (
        <Badge className="bg-purple-100 text-purple-800">
          Genere
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {statut}
        </Badge>
      );
  }
}

export function EditorToolbar({
  statut,
  isSaving,
  isDirty,
  isRunningOcr,
  lastSavedAt,
  saveError,
  onSave,
  onValidate,
  onGenerate,
  onRerunOcr,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          Sauvegarder
        </Button>
        <Button
          size="sm"
          onClick={onValidate}
          disabled={isSaving || statut === "valide" || statut === "genere"}
        >
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
          Valider
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRerunOcr}
          disabled={isSaving || isRunningOcr}
        >
          {isRunningOcr ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Relancer OCR
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerate}
          disabled={isSaving || isRunningOcr || statut === "brouillon" || statut === "ocr_en_cours"}
        >
          <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
          Generer liasse
        </Button>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <StatutBadge statut={statut} />
        {saveError ? (
          <span className="flex items-center gap-1 text-destructive">
            <AlertCircle className="h-3 w-3" />
            {saveError}
          </span>
        ) : isSaving ? (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Sauvegarde...
          </span>
        ) : lastSavedAt ? (
          <span>Sauvegarde : {formatTimeSince(lastSavedAt)}</span>
        ) : isDirty ? (
          <span>Modifications non sauvegardees</span>
        ) : null}
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Auto-save actif
        </span>
      </div>
    </div>
  );
}
