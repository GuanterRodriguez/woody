import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  Trash2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CdvSession } from "@/types/cdv.types";
import { cn } from "@/lib/utils";

interface DossierCardProps {
  dossier: CdvSession;
  cdvFileName: string;
  ficheFileName: string;
  canRetry: boolean;
  onDelete: (id: string) => void;
  onOpenEditor: (id: string) => void;
  onRetry: (id: string) => void;
}

function StatusIndicator({ statut }: { statut: CdvSession["statut"] }) {
  switch (statut) {
    case "brouillon":
      return (
        <Badge variant="outline" className="text-xs">
          Pret
        </Badge>
      );
    case "ocr_en_cours":
      return (
        <Badge variant="secondary" className="text-xs">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          OCR en cours
        </Badge>
      );
    case "a_corriger":
      return (
        <Badge className="bg-green-100 text-green-800 text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Termine
        </Badge>
      );
    case "valide":
      return (
        <Badge className="bg-blue-100 text-blue-800 text-xs">
          Valide
        </Badge>
      );
    case "genere":
      return (
        <Badge className="bg-purple-100 text-purple-800 text-xs">
          Genere
        </Badge>
      );
    case "cloture":
      return (
        <Badge variant="outline" className="text-muted-foreground text-xs">
          Cloture
        </Badge>
      );
  }
}

export function DossierCard({
  dossier,
  cdvFileName,
  ficheFileName,
  canRetry,
  onDelete,
  onOpenEditor,
  onRetry,
}: DossierCardProps) {
  const isComplete =
    dossier.statut === "a_corriger" ||
    dossier.statut === "valide" ||
    dossier.statut === "genere";
  const isProcessing = dossier.statut === "ocr_en_cours";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3",
        isProcessing && "border-blue-200 bg-blue-50/50",
        isComplete && "border-green-200 bg-green-50/50",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{dossier.produit}</span>
            <span className="text-muted-foreground">-</span>
            <span className="text-muted-foreground">{dossier.client}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              CDV: {cdvFileName}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Fiche: {ficheFileName}
            </span>
          </div>
          {dossier.statut === "ocr_en_cours" && dossier.camion && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <AlertCircle className="h-3 w-3" />
              Camion: {dossier.camion}
            </div>
          )}
        </div>
        <StatusIndicator statut={dossier.statut} />
      </div>

      <div className="flex items-center gap-2">
        {isComplete && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onOpenEditor(dossier.id);
            }}
          >
            <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
            Ouvrir editeur
          </Button>
        )}
        {dossier.statut === "brouillon" && canRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onRetry(dossier.id);
            }}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reessayer OCR
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onDelete(dossier.id);
          }}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Supprimer
        </Button>
      </div>
    </div>
  );
}
