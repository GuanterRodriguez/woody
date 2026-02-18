import "@/lib/pdf-worker";

import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { v4 as uuidv4 } from "uuid";
import { Eye, Link, Scissors, Trash2, Zap } from "lucide-react";
import { useImportStore } from "@/stores/import.store";
import { PdfDropZone } from "@/components/pdf/PdfDropZone";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { PdfSplitter } from "@/components/pdf/PdfSplitter";
import { PdfClassifier } from "@/components/pdf/PdfClassifier";
import { DossierPairing } from "@/components/dossier/DossierPairing";
import { DocumentTypeSelect } from "@/components/ocr/DocumentTypeSelect";
import { DossierList } from "@/components/dossier/DossierList";
import { OcrQueue } from "@/components/dossier/OcrQueue";
import {
  validatePdf,
  copyPdfToAppDir,
  getPdfPageCount,
  extractFileName,
} from "@/services/pdf.service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ImportedDocument } from "@/types/import.types";
import { WoodyError } from "@/types/errors";

export function ImportPage() {
  const navigate = useNavigate();
  const {
    activeDocumentId,
    viewMode,
    isImporting,
    addDocument,
    removeDocument,
    setActiveDocument,
    setViewMode,
    setIsImporting,
    setDocumentType,
    getAvailableDocuments,
  } = useImportStore();

  const documents = useImportStore((s) => s.documents);
  const availableDocuments = getAvailableDocuments();
  const unclassifiedDocuments = availableDocuments.filter(
    (d) => d.type === null,
  );

  const availableCdvDocs = getAvailableDocuments("cdv");
  const availableFicheDocs = getAvailableDocuments("fiche_lot");

  const [importError, setImportError] = useState<string | null>(null);
  const [dossierListKey, setDossierListKey] = useState(0);

  const activeDocument = documents.find((d) => d.id === activeDocumentId);

  const handleFilesDropped = useCallback(
    async (filePaths: string[]) => {
      setIsImporting(true);
      setImportError(null);
      try {
        for (const filePath of filePaths) {
          const fileName = extractFileName(filePath);
          const isValid = await validatePdf(filePath);
          if (!isValid) {
            setImportError(
              `Le fichier "${fileName}" n'est pas un PDF valide`,
            );
            continue;
          }
          const localPath = await copyPdfToAppDir(filePath, fileName);
          const pageCount = await getPdfPageCount(localPath);
          const doc: ImportedDocument = {
            id: uuidv4(),
            fileName,
            filePath: localPath,
            originalPath: filePath,
            pageCount,
            type: null,
            cdvSessionId: null,
          };
          addDocument(doc);
        }
      } catch (error) {
        let message = "Erreur lors de l'import";
        if (error instanceof WoodyError) {
          message = error.message;
          if (error.cause instanceof Error) {
            message += ` (${error.cause.message})`;
          }
        }
        setImportError(message);
      } finally {
        setIsImporting(false);
      }
    },
    [addDocument, setIsImporting],
  );

  function handleView(doc: ImportedDocument) {
    setActiveDocument(doc.id);
    setViewMode("viewer");
  }

  function handleSplit(doc: ImportedDocument) {
    setActiveDocument(doc.id);
    setViewMode("splitter");
  }

  function handleDelete(id: string) {
    removeDocument(id);
  }

  function handleCloseDialog() {
    setViewMode("list");
    setActiveDocument(null);
  }

  function handleSplitComplete(newDocs: ImportedDocument[]) {
    if (activeDocumentId) {
      removeDocument(activeDocumentId);
    }
    for (const doc of newDocs) {
      addDocument(doc);
    }
  }

  function handleOpenEditor(sessionId: string) {
    void navigate({ to: "/editor/$sessionId", params: { sessionId } });
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Import & Dossiers</h1>

      {/* Zone 1: Import + Pool de documents disponibles */}
      <PdfDropZone
        onFilesDropped={(paths) => void handleFilesDropped(paths)}
        isImporting={isImporting}
      />

      {importError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {importError}
        </div>
      )}

      {availableDocuments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Documents disponibles</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Classifiez vos documents (CDV ou Fiche de lot) puis creez des
              dossiers.
            </p>
            <div className="flex gap-2">
              {unclassifiedDocuments.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setViewMode("classifier");
                  }}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Classification express ({unclassifiedDocuments.length})
                </Button>
              )}
              {availableCdvDocs.length > 0 &&
                availableFicheDocs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewMode("pairing");
                    }}
                  >
                    <Link className="mr-2 h-4 w-4" />
                    Apparier (
                    {Math.min(
                      availableCdvDocs.length,
                      availableFicheDocs.length,
                    )}
                    )
                  </Button>
                )}
            </div>
          </div>

          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Pages</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {availableDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-2 text-sm">{doc.fileName}</td>
                    <td
                      className="px-4 py-2"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <DocumentTypeSelect
                        value={doc.type}
                        onChange={(type) => {
                          setDocumentType(doc.id, type);
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 text-sm">{doc.pageCount}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Voir"
                          onClick={() => {
                            handleView(doc);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Decouper"
                          onClick={() => {
                            handleSplit(doc);
                          }}
                        >
                          <Scissors className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Supprimer"
                          onClick={() => {
                            handleDelete(doc.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Zone 2: Dossiers */}
      <DossierList key={dossierListKey} onOpenEditor={handleOpenEditor} />

      {/* Zone 3: File d'attente OCR */}
      <OcrQueue />

      {/* PDF Viewer dialog */}
      <Dialog
        open={viewMode === "viewer" && !!activeDocument}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog();
        }}
      >
        <DialogContent className="flex h-[90vh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle>{activeDocument?.fileName}</DialogTitle>
          </DialogHeader>
          {activeDocument && (
            <PdfViewer
              filePath={activeDocument.filePath}
              fileName={activeDocument.fileName}
              pageCount={activeDocument.pageCount}
              onClose={handleCloseDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Splitter dialog */}
      <Dialog
        open={viewMode === "splitter" && !!activeDocument}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog();
        }}
      >
        <DialogContent className="flex h-[90vh] w-[calc(100vw-2rem)] max-w-none sm:max-w-none flex-col">
          <DialogHeader>
            <DialogTitle>
              Decouper : {activeDocument?.fileName}
            </DialogTitle>
          </DialogHeader>
          {activeDocument && (
            <PdfSplitter
              filePath={activeDocument.filePath}
              pageCount={activeDocument.pageCount}
              onClose={handleCloseDialog}
              onSplitComplete={handleSplitComplete}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Classifier dialog */}
      <Dialog
        open={viewMode === "classifier"}
        onOpenChange={(open) => {
          if (!open) {
            setViewMode("list");
          }
        }}
      >
        <DialogContent className="flex h-[90vh] w-[calc(100vw-2rem)] max-w-none sm:max-w-none flex-col p-0">
          <PdfClassifier
            documents={unclassifiedDocuments}
            onClassify={(id, type) => {
              setDocumentType(id, type);
            }}
            onClose={() => {
              setViewMode("list");
            }}
          />
        </DialogContent>
      </Dialog>

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
