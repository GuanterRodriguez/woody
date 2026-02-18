import { useEffect, useState, useCallback } from "react";
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  AlertCircle,
  FileArchive,
  Download,
  Merge,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CdvSession, LigneVente } from "@/types/cdv.types";
import type { CalculationResult } from "@/types/calculation.types";
import {
  generateExcel,
  generateZip,
  buildFileName,
  saveFileWithDialog,
} from "@/services/excel-generator.service";
import {
  generateCalculationPdf,
  mergePdfs,
} from "@/services/pdf-generator.service";
import { readPdfBytes } from "@/services/pdf.service";
import {
  saveDocumentGenere,
  updateCdvSession,
} from "@/services/database.service";
import { WoodyError } from "@/types/errors";

interface GenerationDialogProps {
  open: boolean;
  session: CdvSession;
  lignes: LigneVente[];
  calculationResult: CalculationResult | null;
  onClose: () => void;
  onGenerated: (filePath: string) => void;
}

interface GeneratedDocs {
  excelBytes: Uint8Array | null;
  calcPdfBytes: Uint8Array | null;
  cdvPdfBytes: Uint8Array | null;
  fichePdfBytes: Uint8Array | null;
}

function DocumentRow({
  icon: Icon,
  label,
  available,
  isDownloading,
  onDownload,
}: {
  icon: typeof FileSpreadsheet;
  label: string;
  available: boolean;
  isDownloading: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
        {!available && (
          <span className="text-xs text-muted-foreground">(indisponible)</span>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={!available || isDownloading}
        onClick={onDownload}
      >
        {isDownloading ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="mr-1.5 h-3.5 w-3.5" />
        )}
        Telecharger
      </Button>
    </div>
  );
}

export function GenerationDialog({
  open,
  session,
  lignes,
  calculationResult,
  onClose,
  onGenerated,
}: GenerationDialogProps) {
  const [docs, setDocs] = useState<GeneratedDocs>({
    excelBytes: null,
    calcPdfBytes: null,
    cdvPdfBytes: null,
    fichePdfBytes: null,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingItem, setDownloadingItem] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseFileName = buildFileName(session).replace(/\.xlsx$/, "");

  // Generate documents when dialog opens
  const generateDocs = useCallback(async () => {
    if (!calculationResult) return;

    setIsGenerating(true);
    setError(null);

    try {
      const [excelBytes, cdvPdfBytes, fichePdfBytes] = await Promise.all([
        generateExcel(session, lignes),
        session.pdfCdvPath
          ? readPdfBytes(session.pdfCdvPath)
          : Promise.resolve(null),
        session.pdfFicheLotPath
          ? readPdfBytes(session.pdfFicheLotPath)
          : Promise.resolve(null),
      ]);

      const calcPdfBytes = generateCalculationPdf(session, calculationResult);

      setDocs({
        excelBytes,
        calcPdfBytes,
        cdvPdfBytes,
        fichePdfBytes,
      });
    } catch (err) {
      const message =
        err instanceof WoodyError
          ? err.message
          : "Erreur lors de la generation des documents";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [session, lignes, calculationResult]);

  useEffect(() => {
    if (open) {
      void generateDocs();
    } else {
      // Reset state when dialog closes
      setDocs({
        excelBytes: null,
        calcPdfBytes: null,
        cdvPdfBytes: null,
        fichePdfBytes: null,
      });
      setError(null);
      setDownloadingItem(null);
    }
  }, [open, generateDocs]);

  async function handleDownload(
    itemKey: string,
    data: Uint8Array,
    fileName: string,
  ) {
    setDownloadingItem(itemKey);
    try {
      await saveFileWithDialog(data, fileName);
    } catch (err) {
      const message =
        err instanceof WoodyError
          ? err.message
          : "Erreur lors du telechargement";
      setError(message);
    } finally {
      setDownloadingItem(null);
    }
  }

  async function handleMergePdf() {
    setIsMerging(true);
    setError(null);

    try {
      const pdfParts: Array<{ name: string; bytes: Uint8Array }> = [];

      if (docs.calcPdfBytes) {
        pdfParts.push({ name: "calcul", bytes: docs.calcPdfBytes });
      }
      if (docs.cdvPdfBytes) {
        pdfParts.push({ name: "cdv", bytes: docs.cdvPdfBytes });
      }
      if (docs.fichePdfBytes) {
        pdfParts.push({ name: "fiche_lot", bytes: docs.fichePdfBytes });
      }

      if (pdfParts.length === 0) {
        setError("Aucun document PDF disponible");
        setIsMerging(false);
        return;
      }

      const mergedBytes = await mergePdfs(pdfParts);
      const fileName = `${baseFileName}_liasse.pdf`;

      const savedPath = await saveFileWithDialog(mergedBytes, fileName);
      if (!savedPath) {
        setIsMerging(false);
        return;
      }

      // Record in database and update status
      await saveDocumentGenere(session.id, "calcul", savedPath);
      await updateCdvSession(session.id, { statut: "genere" });

      setIsMerging(false);
      onGenerated(savedPath);
    } catch (err) {
      const message =
        err instanceof WoodyError
          ? err.message
          : "Erreur lors de la fusion des PDFs";
      setError(message);
      setIsMerging(false);
    }
  }

  async function handleZipDownload() {
    if (!docs.excelBytes) return;

    setIsZipping(true);
    setError(null);

    try {
      const zipBytes = await generateZip(
        docs.excelBytes,
        `${baseFileName}.xlsx`,
        session.pdfCdvPath || null,
        session.pdfFicheLotPath || null,
      );

      const savedPath = await saveFileWithDialog(
        zipBytes,
        `${baseFileName}.zip`,
      );
      if (!savedPath) {
        setIsZipping(false);
        return;
      }

      await saveDocumentGenere(session.id, "calcul", savedPath);
      await updateCdvSession(session.id, { statut: "genere" });

      setIsZipping(false);
      onGenerated(savedPath);
    } catch (err) {
      const message =
        err instanceof WoodyError
          ? err.message
          : "Erreur lors de la creation du ZIP";
      setError(message);
      setIsZipping(false);
    }
  }

  const isReady = !isGenerating && docs.calcPdfBytes !== null;
  const isAnyAction = isMerging || isZipping || downloadingItem !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generer la liasse
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File name preview */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <span className="text-muted-foreground">Dossier : </span>
            <span className="font-medium">{baseFileName}</span>
          </div>

          {/* Generation loading */}
          {isGenerating && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparation des documents...
            </div>
          )}

          {/* Document list */}
          {isReady && (
            <>
              <Separator />

              <div className="space-y-1">
                <p className="text-sm font-medium">Documents disponibles</p>

                <DocumentRow
                  icon={FileSpreadsheet}
                  label="Feuille de calcul (Excel)"
                  available={docs.excelBytes !== null}
                  isDownloading={downloadingItem === "excel"}
                  onDownload={() => {
                    if (docs.excelBytes) {
                      void handleDownload(
                        "excel",
                        docs.excelBytes,
                        `${baseFileName}.xlsx`,
                      );
                    }
                  }}
                />

                <DocumentRow
                  icon={FileText}
                  label="Feuille de calcul (PDF)"
                  available={docs.calcPdfBytes !== null}
                  isDownloading={downloadingItem === "calcPdf"}
                  onDownload={() => {
                    if (docs.calcPdfBytes) {
                      void handleDownload(
                        "calcPdf",
                        docs.calcPdfBytes,
                        `${baseFileName}_calcul.pdf`,
                      );
                    }
                  }}
                />

                {session.pdfCdvPath && (
                  <DocumentRow
                    icon={FileText}
                    label="Compte de vente source (PDF)"
                    available={docs.cdvPdfBytes !== null}
                    isDownloading={downloadingItem === "cdv"}
                    onDownload={() => {
                      if (docs.cdvPdfBytes) {
                        void handleDownload(
                          "cdv",
                          docs.cdvPdfBytes,
                          `${baseFileName}_cdv.pdf`,
                        );
                      }
                    }}
                  />
                )}

                {session.pdfFicheLotPath && (
                  <DocumentRow
                    icon={FileText}
                    label="Fiche de lot source (PDF)"
                    available={docs.fichePdfBytes !== null}
                    isDownloading={downloadingItem === "fiche"}
                    onDownload={() => {
                      if (docs.fichePdfBytes) {
                        void handleDownload(
                          "fiche",
                          docs.fichePdfBytes,
                          `${baseFileName}_fiche_lot.pdf`,
                        );
                      }
                    }}
                  />
                )}
              </div>

              <Separator />

              {/* Merge all PDFs button */}
              <Button
                className="w-full"
                onClick={() => {
                  void handleMergePdf();
                }}
                disabled={isAnyAction}
              >
                {isMerging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fusion en cours...
                  </>
                ) : (
                  <>
                    <Merge className="mr-2 h-4 w-4" />
                    Generer la liasse complete (PDF)
                  </>
                )}
              </Button>

              {/* ZIP option */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  void handleZipDownload();
                }}
                disabled={isAnyAction}
              >
                {isZipping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creation du ZIP...
                  </>
                ) : (
                  <>
                    <FileArchive className="mr-2 h-4 w-4" />
                    Telecharger en ZIP (Excel + PDFs)
                  </>
                )}
              </Button>
            </>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
