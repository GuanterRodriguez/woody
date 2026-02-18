import { useEffect, useState } from "react";
import { FolderPlus, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DossierCard } from "@/components/dossier/DossierCard";
import { DossierCreateDialog } from "@/components/dossier/DossierCreateDialog";
import { useImportStore } from "@/stores/import.store";
import { useQueueStore } from "@/stores/queue.store";
import {
  listCdvSessions,
  deleteCdvSession,
} from "@/services/database.service";
import { processQueue } from "@/services/ocr.orchestrator";
import type { CdvSession } from "@/types/cdv.types";
import type { QueueItem } from "@/types/queue.types";

interface DossierListProps {
  onOpenEditor: (sessionId: string) => void;
}

export function DossierList({ onOpenEditor }: DossierListProps) {
  const [dossiers, setDossiers] = useState<CdvSession[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { documents, clearDocumentCdvSessionId } = useImportStore();
  const {
    isProcessing,
    addToQueue,
    clearQueue,
    items: queueItems,
  } = useQueueStore();

  async function loadDossiers() {
    const sessions = await listCdvSessions();
    setDossiers(sessions);
  }

  useEffect(() => {
    void loadDossiers();
  }, []);

  // Reload dossiers when queue item statuses change
  const queueDoneCount = queueItems.filter(
    (i) => i.status === "done" || i.status === "error",
  ).length;
  useEffect(() => {
    if (queueDoneCount > 0) {
      void loadDossiers();
    }
  }, [queueDoneCount]);

  function handleDossierCreated(_sessionId: string) {
    setShowCreateDialog(false);
    void loadDossiers();
  }

  async function handleDeleteDossier(sessionId: string) {
    // Find docs assigned to this dossier and release them
    const assignedDocs = documents.filter(
      (d) => d.cdvSessionId === sessionId,
    );
    for (const doc of assignedDocs) {
      clearDocumentCdvSessionId(doc.id);
    }

    await deleteCdvSession(sessionId);
    void loadDossiers();
  }

  function handleLaunchQueue() {
    if (isProcessing) return;

    // Clear finished items from previous runs
    clearQueue();

    // Add eligible dossiers (brouillon) to the queue, skip duplicates
    const eligibleDossiers = dossiers.filter(
      (d) => d.statut === "brouillon",
    );

    for (const dossier of eligibleDossiers) {
      const cdvDoc = documents.find(
        (d) => d.cdvSessionId === dossier.id && d.type === "cdv",
      );
      const ficheDoc = documents.find(
        (d) => d.cdvSessionId === dossier.id && d.type === "fiche_lot",
      );

      if (cdvDoc && ficheDoc) {
        const queueItem: QueueItem = {
          dossierSessionId: dossier.id,
          produit: dossier.produit,
          client: dossier.client,
          pdfCdvDocId: cdvDoc.id,
          pdfFicheDocId: ficheDoc.id,
          status: "pending",
          error: null,
          currentStep: null,
        };
        addToQueue(queueItem);
      }
    }

    void processQueue();
  }

  function hasBothPdfs(sessionId: string): boolean {
    const hasCdv = documents.some(
      (doc) => doc.cdvSessionId === sessionId && doc.type === "cdv",
    );
    const hasFiche = documents.some(
      (doc) => doc.cdvSessionId === sessionId && doc.type === "fiche_lot",
    );
    return hasCdv && hasFiche;
  }

  function handleRetryDossier(sessionId: string) {
    if (isProcessing) return;

    const dossier = dossiers.find((d) => d.id === sessionId);
    if (!dossier) return;

    const cdvDoc = documents.find(
      (d) => d.cdvSessionId === sessionId && d.type === "cdv",
    );
    const ficheDoc = documents.find(
      (d) => d.cdvSessionId === sessionId && d.type === "fiche_lot",
    );
    if (!cdvDoc || !ficheDoc) return;

    clearQueue();

    const queueItem: QueueItem = {
      dossierSessionId: dossier.id,
      produit: dossier.produit,
      client: dossier.client,
      pdfCdvDocId: cdvDoc.id,
      pdfFicheDocId: ficheDoc.id,
      status: "pending",
      error: null,
      currentStep: null,
    };
    addToQueue(queueItem);
    void processQueue();
  }

  const eligibleCount = dossiers.filter((d) => {
    if (d.statut !== "brouillon") return false;
    return hasBothPdfs(d.id);
  }).length;

  function getDocFileName(
    sessionId: string,
    type: "cdv" | "fiche_lot",
  ): string {
    const doc = documents.find(
      (d) => d.cdvSessionId === sessionId && d.type === type,
    );
    return doc?.fileName ?? "—";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dossiers</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowCreateDialog(true);
            }}
          >
            <FolderPlus className="mr-1.5 h-4 w-4" />
            Creer un dossier
          </Button>
          {eligibleCount > 0 && (
            <Button
              size="sm"
              disabled={isProcessing}
              onClick={handleLaunchQueue}
            >
              <Play className="mr-1.5 h-4 w-4" />
              {isProcessing
                ? "Traitement en cours..."
                : `Lancer la file OCR (${String(eligibleCount)})`}
            </Button>
          )}
        </div>
      </div>

      {dossiers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun dossier. Importez des PDFs, classifiez-les, puis creez un
          dossier.
        </div>
      ) : (
        <div className="space-y-2">
          {dossiers.map((dossier) => (
            <DossierCard
              key={dossier.id}
              dossier={dossier}
              cdvFileName={getDocFileName(dossier.id, "cdv")}
              ficheFileName={getDocFileName(dossier.id, "fiche_lot")}
              canRetry={hasBothPdfs(dossier.id)}
              onDelete={(id) => {
                void handleDeleteDossier(id);
              }}
              onOpenEditor={onOpenEditor}
              onRetry={handleRetryDossier}
            />
          ))}
        </div>
      )}

      <DossierCreateDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
        }}
        onCreated={handleDossierCreated}
      />
    </div>
  );
}
