import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useImportStore } from "@/stores/import.store";
import { createDossier } from "@/services/database.service";
import { WoodyError } from "@/types/errors";
import { ClientCombobox } from "./ClientCombobox";

interface DossierCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (sessionId: string) => void;
}

export function DossierCreateDialog({
  open,
  onClose,
  onCreated,
}: DossierCreateDialogProps) {
  const [produit, setProduit] = useState("");
  const [client, setClient] = useState("");
  const [selectedCdvDocId, setSelectedCdvDocId] = useState("");
  const [selectedFicheDocId, setSelectedFicheDocId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getAvailableDocuments, setDocumentCdvSessionId } =
    useImportStore();
  const availableCdvDocs = getAvailableDocuments("cdv");
  const availableFicheDocs = getAvailableDocuments("fiche_lot");

  const isValid =
    produit.trim() !== "" &&
    client.trim() !== "" &&
    selectedCdvDocId !== "" &&
    selectedFicheDocId !== "";

  function resetForm() {
    setProduit("");
    setClient("");
    setSelectedCdvDocId("");
    setSelectedFicheDocId("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleCreate(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!isValid) return;

    setIsCreating(true);
    setError(null);

    try {
      const cdvDoc = availableCdvDocs.find((d) => d.id === selectedCdvDocId);
      const ficheDoc = availableFicheDocs.find(
        (d) => d.id === selectedFicheDocId,
      );
      if (!cdvDoc || !ficheDoc) {
        throw new WoodyError(
          "Documents selectionnes introuvables",
          "DOSSIER_DOCS_NOT_FOUND",
        );
      }

      const sessionId = uuidv4();

      await createDossier({
        id: sessionId,
        produit: produit.trim(),
        client: client.trim(),
        pdfCdvPath: cdvDoc.filePath,
        pdfFicheLotPath: ficheDoc.filePath,
      });

      // Mark both docs as assigned to this dossier
      setDocumentCdvSessionId(cdvDoc.id, sessionId);
      setDocumentCdvSessionId(ficheDoc.id, sessionId);

      resetForm();
      onCreated(sessionId);
    } catch (err) {
      const message =
        err instanceof WoodyError ? err.message : "Erreur lors de la creation";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Creer un dossier</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            void handleCreate(e);
          }}
          className="space-y-5"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="produit">Produit *</Label>
              <Input
                id="produit"
                value={produit}
                onChange={(e) => {
                  setProduit(e.target.value);
                }}
                placeholder="Ex: Mangues, Ananas..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Client *</Label>
              <ClientCombobox value={client} onChange={setClient} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Compte de vente *</Label>
            {availableCdvDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun document CDV disponible. Importez et classifiez des PDFs.
              </p>
            ) : (
              <RadioGroup
                value={selectedCdvDocId}
                onValueChange={setSelectedCdvDocId}
                className="space-y-1"
              >
                {availableCdvDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center space-x-2 rounded-md border px-3 py-2"
                  >
                    <RadioGroupItem value={doc.id} id={`cdv-${doc.id}`} />
                    <Label
                      htmlFor={`cdv-${doc.id}`}
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      {doc.fileName}{" "}
                      <span className="text-muted-foreground">
                        ({doc.pageCount} page{doc.pageCount > 1 ? "s" : ""})
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          <div className="space-y-2">
            <Label>Fiche de lot *</Label>
            {availableFicheDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun document Fiche de lot disponible. Importez et classifiez
                des PDFs.
              </p>
            ) : (
              <RadioGroup
                value={selectedFicheDocId}
                onValueChange={setSelectedFicheDocId}
                className="space-y-1"
              >
                {availableFicheDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center space-x-2 rounded-md border px-3 py-2"
                  >
                    <RadioGroupItem value={doc.id} id={`fiche-${doc.id}`} />
                    <Label
                      htmlFor={`fiche-${doc.id}`}
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      {doc.fileName}{" "}
                      <span className="text-muted-foreground">
                        ({doc.pageCount} page{doc.pageCount > 1 ? "s" : ""})
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!isValid || isCreating}>
              {isCreating ? "Creation..." : "Creer le dossier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
