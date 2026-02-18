import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Link } from "lucide-react";
import { useImportStore } from "@/stores/import.store";
import { DossierList } from "@/components/dossier/DossierList";
import { DossierPairing } from "@/components/dossier/DossierPairing";
import { OcrQueue } from "@/components/dossier/OcrQueue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export function CreateDossiersPage() {
  const navigate = useNavigate();
  const { viewMode, setViewMode, getAvailableDocuments } = useImportStore();

  const availableCdvDocs = getAvailableDocuments("cdv");
  const availableFicheDocs = getAvailableDocuments("fiche_lot");
  const canPair = availableCdvDocs.length > 0 && availableFicheDocs.length > 0;

  const [dossierListKey, setDossierListKey] = useState(0);

  function handleOpenEditor(sessionId: string) {
    void navigate({ to: "/editor/$sessionId", params: { sessionId } });
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Créer des dossiers</h1>
        {canPair && (
          <Button
            variant="default"
            onClick={() => {
              setViewMode("pairing");
            }}
          >
            <Link className="mr-2 h-4 w-4" />
            Apparier ({Math.min(availableCdvDocs.length, availableFicheDocs.length)})
          </Button>
        )}
      </div>

      {!canPair && (
        <div className="rounded-lg border border-muted bg-muted/20 p-4 text-sm text-muted-foreground">
          Pour créer des dossiers, vous devez d'abord importer et classifier au
          moins 1 CDV et 1 Fiche de lot.
        </div>
      )}

      {/* Dossiers list */}
      <DossierList key={dossierListKey} onOpenEditor={handleOpenEditor} />

      {/* OCR Queue */}
      <OcrQueue />

      {/* Dossier Pairing dialog */}
      <Dialog
        open={viewMode === "pairing"}
        onOpenChange={(open) => {
          if (!open) {
            setViewMode("list");
          }
        }}
      >
        <DialogContent className="flex h-[90vh] w-[calc(100vw-2rem)] max-w-none sm:max-w-none flex-col p-0">
          <DossierPairing
            onClose={() => {
              setViewMode("list");
            }}
            onCreated={() => {
              setViewMode("list");
              setDossierListKey((k) => k + 1);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
