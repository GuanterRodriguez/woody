import "@/lib/pdf-worker";
import { useState, useEffect, useMemo } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Check,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDossier } from "@/services/database.service";
import { readPdfBytes } from "@/services/pdf.service";
import { useImportStore } from "@/stores/import.store";
import { WoodyError } from "@/types/errors";
import type { ImportedDocument } from "@/types/import.types";

interface PendingPair {
  cdvDoc: ImportedDocument;
  ficheDoc: ImportedDocument;
  produit: string;
  client: string;
}

interface DossierCreationWizardProps {
  pairs: PendingPair[];
  onClose: () => void;
  onCompleted: () => void;
  onUpdatePair: (index: number, field: "produit" | "client", value: string) => void;
}

export function DossierCreationWizard({
  pairs,
  onClose,
  onCompleted,
  onUpdatePair,
}: DossierCreationWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const { setDocumentCdvSessionId } = useImportStore();

  const currentPair = pairs[currentIndex];
  const canGoNext = currentIndex < pairs.length - 1;
  const canGoPrev = currentIndex > 0;
  const isLastPair = currentIndex === pairs.length - 1;

  // Load PDF for current pair
  useEffect(() => {
    if (!currentPair) return;

    let cancelled = false;
    setPdfLoading(true);
    setPdfData(null);

    readPdfBytes(currentPair.cdvDoc.filePath)
      .then((bytes) => {
        if (!cancelled) {
          setPdfData(bytes);
          setPdfLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error("Failed to load PDF:", error);
          setPdfLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentPair]);

  const fileData = useMemo(
    () => (pdfData ? { data: pdfData } : null),
    [pdfData],
  );

  function handleNext() {
    if (canGoNext) {
      setCurrentIndex((i) => i + 1);
      setCreateError(null);
    }
  }

  function handlePrev() {
    if (canGoPrev) {
      setCurrentIndex((i) => i - 1);
      setCreateError(null);
    }
  }

  async function handleCreateAll() {
    // Verify all pairs have produit and client filled
    const incompletePairs = pairs.filter((p) => !p.produit.trim() || !p.client.trim());
    if (incompletePairs.length > 0) {
      setCreateError(
        `${String(incompletePairs.length)} paire${incompletePairs.length > 1 ? "s" : ""} n'${incompletePairs.length > 1 ? "ont" : "a"} pas de produit ou client renseigné`,
      );
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      for (const pair of pairs) {
        const sessionId = uuidv4();

        await createDossier({
          id: sessionId,
          produit: pair.produit.trim(),
          client: pair.client.trim(),
          pdfCdvPath: pair.cdvDoc.filePath,
          pdfFicheLotPath: pair.ficheDoc.filePath,
        });

        setDocumentCdvSessionId(pair.cdvDoc.id, sessionId);
        setDocumentCdvSessionId(pair.ficheDoc.id, sessionId);
      }

      onCompleted();
    } catch (err) {
      const message =
        err instanceof WoodyError
          ? err.message
          : "Erreur lors de la creation des dossiers";
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  }

  if (!currentPair) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60">
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-lg border bg-background shadow-2xl">
        {/* Header with inputs */}
        <div className="flex flex-col gap-3 border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Créer les dossiers ({currentIndex + 1}/{pairs.length})
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Current pair info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{currentPair.cdvDoc.fileName}</span>
            <span>↔</span>
            <span className="font-medium">{currentPair.ficheDoc.fileName}</span>
          </div>

          {/* Input fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="produit">Produit *</Label>
              <Input
                id="produit"
                placeholder="Ex: Veau"
                value={currentPair.produit}
                onChange={(e) => {
                  onUpdatePair(currentIndex, "produit", e.target.value);
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Input
                id="client"
                placeholder="Ex: Client ABC"
                value={currentPair.client}
                onChange={(e) => {
                  onUpdatePair(currentIndex, "client", e.target.value);
                }}
              />
            </div>
          </div>

          {createError && (
            <p className="text-sm text-destructive">{createError}</p>
          )}
        </div>

        {/* PDF viewer */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20">
          <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
            {pdfLoading || !fileData ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Chargement du PDF...
                </span>
              </div>
            ) : (
              <Document file={fileData}>
                <Page
                  pageNumber={1}
                  scale={1.5}
                  renderAnnotationLayer={true}
                  renderTextLayer={true}
                />
              </Document>
            )}
          </div>
        </div>

        {/* Footer with navigation */}
        <div className="flex items-center justify-between border-t p-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={!canGoPrev || isCreating}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Précédent
          </Button>

          <div className="flex gap-2">
            {isLastPair ? (
              <Button
                onClick={() => {
                  void handleCreateAll();
                }}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Créer {pairs.length} dossier{pairs.length > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canGoNext || isCreating}>
                Suivant
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
