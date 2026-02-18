import "@/lib/pdf-worker";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Expand,
  FileText,
  Loader2,
  Shrink,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useImportStore } from "@/stores/import.store";
import { readPdfBytes } from "@/services/pdf.service";
import { WoodyError } from "@/types/errors";
import type { ImportedDocument } from "@/types/import.types";
import { DossierCreationWizard } from "./DossierCreationWizard";

// --- Types ---

interface DossierPairingProps {
  onClose: () => void;
  onCreated: () => void;
}

interface PendingPair {
  cdvDoc: ImportedDocument;
  ficheDoc: ImportedDocument;
  produit: string;
  client: string;
}

// --- PDF Preview Sub-component ---

const CONTAINER_PADDING = 16;
const DEFAULT_SCALE = 0.85;
const MIN_SCALE = 0.1;
const MAX_SCALE = 3.0;

type ZoomMode = "fit" | "manual";

function PdfPreviewPanel({
  filePath,
  label,
}: {
  filePath: string | null;
  label: string;
}) {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageDimensions, setPageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");
  const [manualZoom, setManualZoom] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF bytes
  useEffect(() => {
    if (!filePath) {
      setPdfData(null);
      setError(null);
      setPageCount(0);
      setCurrentPage(1);
      setPageDimensions(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setPdfData(null);
    setPageDimensions(null);
    setCurrentPage(1);
    setPageCount(0);

    readPdfBytes(filePath)
      .then((bytes) => {
        if (!cancelled) {
          setPdfData(bytes);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof WoodyError
              ? err.message
              : "Impossible de charger le PDF";
          setError(message);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  // Memoize file data
  const fileData = useMemo(
    () => (pdfData ? { data: pdfData } : null),
    [pdfData],
  );

  // ResizeObserver for fit-to-container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Reset fullscreen when file changes
  useEffect(() => {
    setIsFullscreen(false);
    setZoomMode("fit");
  }, [filePath]);

  // Reset zoom to fit when toggling fullscreen
  useEffect(() => {
    setZoomMode("fit");
  }, [isFullscreen]);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  // Compute scale
  const effectiveScale = useMemo(() => {
    if (zoomMode === "manual") {
      return manualZoom / 100;
    }

    if (
      !pageDimensions ||
      containerSize.width === 0 ||
      containerSize.height === 0
    ) {
      return DEFAULT_SCALE;
    }

    const availableWidth = containerSize.width - CONTAINER_PADDING;
    const availableHeight = containerSize.height - CONTAINER_PADDING;

    const scaleX = availableWidth / pageDimensions.width;
    const scaleY = availableHeight / pageDimensions.height;

    const fitScale = Math.min(scaleX, scaleY);
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale));
  }, [zoomMode, manualZoom, pageDimensions, containerSize]);

  const displayZoom = Math.round(effectiveScale * 100);

  function handleDocumentLoadSuccess(info: { numPages: number }) {
    setPageCount(info.numPages);
  }

  function handlePageLoadSuccess(page: {
    originalWidth: number;
    originalHeight: number;
  }) {
    if (!pageDimensions) {
      setPageDimensions({
        width: page.originalWidth,
        height: page.originalHeight,
      });
    }
  }

  // Placeholder when no file selected
  if (!filePath) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <FileText className="h-12 w-12 opacity-30" />
        <p className="text-sm">Selectionnez un {label}</p>
      </div>
    );
  }

  // PDF content
  let pdfContent: React.ReactNode;
  if (error) {
    pdfContent = (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  } else if (isLoading || !fileData) {
    pdfContent = (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  } else {
    pdfContent = (
      <div className="flex h-full items-center justify-center p-2">
        <Document
          file={fileData}
          onLoadSuccess={handleDocumentLoadSuccess}
          loading={<Skeleton className="h-[500px] w-[350px]" />}
        >
          <Page
            pageNumber={currentPage}
            scale={effectiveScale}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            onLoadSuccess={handlePageLoadSuccess}
            loading={<Skeleton className="h-[500px] w-[350px]" />}
          />
        </Document>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop - only visible in fullscreen, click to close */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={() => {
            setIsFullscreen(false);
          }}
        />
      )}

      {/* Viewer container - switches between inline (panel) and fixed (fullscreen) via CSS */}
      <div
        className={
          isFullscreen
            ? "bg-background fixed inset-4 z-50 flex flex-col overflow-hidden rounded-lg border shadow-2xl"
            : "flex flex-1 flex-col overflow-hidden"
        }
      >
        {/* Label */}
        <div className="border-b px-3 py-1.5 text-center text-xs font-medium text-muted-foreground">
          {label}
        </div>

        {/* PDF container */}
        <div className="relative min-h-0 flex-1">
          <div
            ref={containerRef}
            className={`absolute inset-0 overflow-auto ${!isFullscreen ? "cursor-pointer" : ""}`}
            onClick={
              !isFullscreen
                ? () => {
                    setIsFullscreen(true);
                  }
                : undefined
            }
            role={!isFullscreen ? "button" : undefined}
            tabIndex={!isFullscreen ? 0 : undefined}
            onKeyDown={
              !isFullscreen
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setIsFullscreen(true);
                    }
                  }
                : undefined
            }
          >
            {pdfContent}
          </div>
        </div>

        {/* Bottom toolbar with page navigation and fullscreen button */}
        <div className="flex items-center justify-between border-t px-2 py-1.5">
          {/* Page navigation */}
          {pageCount > 1 ? (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={currentPage <= 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                }}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
                {currentPage} / {pageCount}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={currentPage >= pageCount}
                onClick={() => {
                  setCurrentPage((p) => Math.min(pageCount, p + 1));
                }}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div /> /* spacer */
          )}

          {/* Zoom controls (only in fullscreen) + fullscreen button */}
          <div className="flex items-center gap-0.5">
            {isFullscreen && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setZoomMode("manual");
                    setManualZoom((z) => Math.max(50, z - 25));
                  }}
                  disabled={zoomMode === "manual" && manualZoom <= 50}
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <span className="min-w-[2.5rem] text-center text-xs">
                  {displayZoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setZoomMode("manual");
                    setManualZoom((z) => Math.min(200, z + 25));
                  }}
                  disabled={zoomMode === "manual" && manualZoom >= 200}
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
                <Button
                  variant={zoomMode === "fit" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setZoomMode("fit");
                  }}
                  title="Ajuster au panneau"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setIsFullscreen((f) => !f);
              }}
              title={isFullscreen ? "Quitter plein ecran" : "Plein ecran"}
              disabled={!fileData}
            >
              {isFullscreen ? (
                <Shrink className="h-3 w-3" />
              ) : (
                <Expand className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// --- Sidebar Item ---

function SidebarItem({
  doc,
  isSelected,
  onSelect,
}: {
  doc: ImportedDocument;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "w-full px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50",
        isSelected && "border-l-2 border-primary bg-primary/10",
      )}
      onClick={onSelect}
      title={doc.fileName}
    >
      <p className="truncate font-medium">{doc.fileName}</p>
      <p className="text-muted-foreground">
        {doc.pageCount} page{doc.pageCount > 1 ? "s" : ""}
      </p>
    </button>
  );
}

// --- Main Component ---

export function DossierPairing({ onClose, onCreated }: DossierPairingProps) {
  const { getAvailableDocuments } = useImportStore();

  const [selectedCdvId, setSelectedCdvId] = useState<string | null>(null);
  const [selectedFicheId, setSelectedFicheId] = useState<string | null>(null);
  const [pairs, setPairs] = useState<PendingPair[]>([]);
  const [showWizard, setShowWizard] = useState(false);

  // Filter out already-paired docs
  const pairedCdvIds = useMemo(
    () => new Set(pairs.map((p) => p.cdvDoc.id)),
    [pairs],
  );
  const pairedFicheIds = useMemo(
    () => new Set(pairs.map((p) => p.ficheDoc.id)),
    [pairs],
  );

  const availableCdvs = getAvailableDocuments("cdv").filter(
    (d) => !pairedCdvIds.has(d.id),
  );
  const availableFiches = getAvailableDocuments("fiche_lot").filter(
    (d) => !pairedFicheIds.has(d.id),
  );

  const selectedCdvDoc = availableCdvs.find((d) => d.id === selectedCdvId);
  const selectedFicheDoc = availableFiches.find(
    (d) => d.id === selectedFicheId,
  );

  const canPair = !!selectedCdvDoc && !!selectedFicheDoc;

  // Auto-select when only one doc left
  useEffect(() => {
    if (!selectedCdvId && availableCdvs.length === 1 && availableCdvs[0]) {
      setSelectedCdvId(availableCdvs[0].id);
    }
  }, [availableCdvs, selectedCdvId]);

  useEffect(() => {
    if (
      !selectedFicheId &&
      availableFiches.length === 1 &&
      availableFiches[0]
    ) {
      setSelectedFicheId(availableFiches[0].id);
    }
  }, [availableFiches, selectedFicheId]);

  // Keyboard: Enter to pair
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Enter" && canPair) {
        e.preventDefault();
        handlePair();
      }
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  function handlePair() {
    if (!selectedCdvDoc || !selectedFicheDoc) return;

    setPairs((prev) => [
      ...prev,
      {
        cdvDoc: selectedCdvDoc,
        ficheDoc: selectedFicheDoc,
        produit: "",
        client: "",
      },
    ]);
    setSelectedCdvId(null);
    setSelectedFicheId(null);
  }

  function handleUpdatePair(index: number, field: "produit" | "client", value: string) {
    setPairs((prev) =>
      prev.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)),
    );
  }

  function handleRemovePair(index: number) {
    setPairs((prev) => prev.filter((_, i) => i !== index));
  }

  function handleOpenWizard() {
    if (pairs.length === 0) return;
    setShowWizard(true);
  }

  function handleWizardCompleted() {
    setPairs([]);
    setShowWizard(false);
    onCreated();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <h2 className="text-lg font-semibold">Appariement des dossiers</h2>
        <div className="flex items-center gap-4">
          {pairs.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {pairs.length} paire{pairs.length > 1 ? "s" : ""}
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content: sidebars + previews */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar: CDVs */}
        <div className="flex w-[200px] shrink-0 flex-col border-r">
          <div className="border-b px-3 py-2 text-sm font-medium">
            CDV ({availableCdvs.length})
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {availableCdvs.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                Aucun CDV disponible
              </p>
            )}
            {availableCdvs.map((doc) => (
              <SidebarItem
                key={doc.id}
                doc={doc}
                isSelected={selectedCdvId === doc.id}
                onSelect={() => {
                  setSelectedCdvId(doc.id);
                }}
              />
            ))}
          </div>
        </div>

        {/* Center: Two previews side by side */}
        <div className="flex min-h-0 flex-1">
          <div className="flex flex-1 flex-col border-r">
            <PdfPreviewPanel
              filePath={selectedCdvDoc?.filePath ?? null}
              label="Compte de Vente"
            />
          </div>
          <div className="flex flex-1 flex-col">
            <PdfPreviewPanel
              filePath={selectedFicheDoc?.filePath ?? null}
              label="Fiche de Lot"
            />
          </div>
        </div>

        {/* Right sidebar: Fiches */}
        <div className="flex w-[200px] shrink-0 flex-col border-l">
          <div className="border-b px-3 py-2 text-sm font-medium">
            Fiches ({availableFiches.length})
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {availableFiches.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                Aucune fiche disponible
              </p>
            )}
            {availableFiches.map((doc) => (
              <SidebarItem
                key={doc.id}
                doc={doc}
                isSelected={selectedFicheId === doc.id}
                onSelect={() => {
                  setSelectedFicheId(doc.id);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Pair button */}
      <div className="flex items-center justify-center border-t px-4 py-2">
        <Button disabled={!canPair} onClick={handlePair}>
          <Check className="mr-2 h-4 w-4" />
          Apparier ces documents
        </Button>
      </div>

      {/* Pairs strip + create button */}
      {pairs.length > 0 && (
        <div className="space-y-2 border-t px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {pairs.map((pair, index) => (
              <div
                key={pair.cdvDoc.id + pair.ficheDoc.id}
                className="flex shrink-0 items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-xs"
              >
                <span className="max-w-[120px] truncate font-medium">
                  {pair.cdvDoc.fileName}
                </span>
                <span className="text-muted-foreground">↔</span>
                <span className="max-w-[120px] truncate font-medium">
                  {pair.ficheDoc.fileName}
                </span>
                <button
                  type="button"
                  className="ml-1 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => {
                    handleRemovePair(index);
                  }}
                  title="Retirer cette paire"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <Button onClick={handleOpenWizard}>
              Créer {pairs.length} dossier{pairs.length > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}

      {/* Creation wizard */}
      {showWizard && (
        <DossierCreationWizard
          pairs={pairs}
          onClose={() => {
            setShowWizard(false);
          }}
          onCompleted={handleWizardCompleted}
          onUpdatePair={handleUpdatePair}
        />
      )}
    </div>
  );
}
