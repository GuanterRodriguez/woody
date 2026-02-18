import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useImportStore } from "@/stores/import.store";
import {
  createDossier,
  getFabricCvEncoursCount,
} from "@/services/database.service";
import { getClientList } from "@/services/fabric.service";
import { WoodyError } from "@/types/errors";

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

  // Fabric client list state
  const [clientListOpen, setClientListOpen] = useState(false);
  const [fabricClients, setFabricClients] = useState<string[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [fabricAvailable, setFabricAvailable] = useState(false);

  const { getAvailableDocuments, setDocumentCdvSessionId } =
    useImportStore();
  const availableCdvDocs = getAvailableDocuments("cdv");
  const availableFicheDocs = getAvailableDocuments("fiche_lot");

  const isValid =
    produit.trim() !== "" &&
    client.trim() !== "" &&
    selectedCdvDocId !== "" &&
    selectedFicheDocId !== "";

  // Load Fabric clients from local SQLite cache
  const loadFabricClients = useCallback(async () => {
    try {
      const count = await getFabricCvEncoursCount();
      if (count === 0) {
        setFabricAvailable(false);
        return;
      }

      setFabricAvailable(true);
      setIsLoadingClients(true);
      const clients = await getClientList();
      setFabricClients(clients);
    } catch {
      // Silently fail - user can still type manually
      setFabricAvailable(false);
    } finally {
      setIsLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadFabricClients();
    }
  }, [open, loadFabricClients]);

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
              {fabricAvailable && fabricClients.length > 0 ? (
                <Popover open={clientListOpen} onOpenChange={setClientListOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientListOpen}
                      className="w-full justify-between font-normal"
                    >
                      {client || "Selectionner un client..."}
                      {isLoadingClients ? (
                        <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
                      ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Rechercher un client..." />
                      <CommandList>
                        <CommandEmpty>Aucun client trouve.</CommandEmpty>
                        <CommandGroup>
                          {fabricClients.map((c) => (
                            <CommandItem
                              key={c}
                              value={c}
                              onSelect={(value) => {
                                setClient(value);
                                setClientListOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  client === c
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {c}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  value={client}
                  onChange={(e) => {
                    setClient(e.target.value);
                  }}
                  placeholder="Ex: Client A..."
                />
              )}
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
