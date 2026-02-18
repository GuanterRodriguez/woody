import "@/lib/pdf-worker";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  SkipForward,
  X,
  Loader2,
  Check,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { readPdfBytes } from "@/services/pdf.service";
import { WoodyError } from "@/types/errors";
import type { ImportedDocument } from "@/types/import.types";
import { cn } from "@/lib/utils";

interface PdfClassifierProps {
  documents: ImportedDocument[];
  onClassify: (id: string, type: "cdv" | "fiche_lot") => void;
  onClose: () => void;
}

type ClassificationValue = "cdv" | "fiche_lot" | "skipped";

const CONTAINER_PADDING = 32;
const DEFAULT_SCALE = 0.85;
const MIN_SCALE = 0.1;
const MAX_SCALE = 3.0;

export function PdfClassifier({
  documents,
  onClassify,
  onClose,
}: PdfClassifierProps) {
  // Snapshot the documents list at mount — prevents shrinking as docs get classified
  const snapshotRef = useRef(documents);
  const docs = snapshotRef.current;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [classifications, setClassifications] = useState<
    Map<string, ClassificationValue>
  >(() => new Map());
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pageDimensions, setPageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentDoc =
    currentIndex < docs.length ? docs[currentIndex] : undefined;
  const isComplete = currentIndex >= docs.length;

  // Load PDF bytes when currentDoc changes
  useEffect(() => {
    if (!currentDoc) {
      setPdfData(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setPdfData(null);
    setPageDimensions(null);

    readPdfBytes(currentDoc.filePath)
      .then((bytes) => {
        if (!cancelled) {
          setPdfData(bytes);
          setIsLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message =
            error instanceof WoodyError
              ? error.message
              : "Impossible de charger le PDF";
          setLoadError(message);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentDoc]);

  // Memoize file data for react-pdf Document
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

  // Compute scale to fit PDF in container
  const effectiveScale = useMemo(() => {
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
  }, [pageDimensions, containerSize]);

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

  // Classification actions
  function advanceTo(nextIndex: number) {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(nextIndex);
      setCurrentPage(1);
      setPageCount(0);
      setIsTransitioning(false);
    }, 150);
  }

  function handleClassify(type: "cdv" | "fiche_lot") {
    if (!currentDoc || isComplete) return;

    onClassify(currentDoc.id, type);
    setClassifications((prev) => {
      const next = new Map(prev);
      next.set(currentDoc.id, type);
      return next;
    });
    advanceTo(currentIndex + 1);
  }

  function handleSkip() {
    if (!currentDoc || isComplete) return;

    setClassifications((prev) => {
      const next = new Map(prev);
      next.set(currentDoc.id, "skipped");
      return next;
    });
    advanceTo(currentIndex + 1);
  }

  function handleGoBack() {
    if (currentIndex <= 0) return;
    advanceTo(currentIndex - 1);
  }

  function handleGoToIndex(index: number) {
    if (index < 0 || index >= docs.length) return;
    advanceTo(index);
  }

  function handleReviewSkipped() {
    // Find first skipped doc
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      if (doc && classifications.get(doc.id) === "skipped") {
        setCurrentIndex(i);
        setCurrentPage(1);
        setPageCount(0);
        return;
      }
    }
  }

  // Page navigation
  function handlePrevPage() {
    setCurrentPage((p) => Math.max(1, p - 1));
  }

  function handleNextPage() {
    setCurrentPage((p) => Math.min(pageCount, p + 1));
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handleClassify("cdv");
          break;
        case "ArrowRight":
          e.preventDefault();
          handleClassify("fiche_lot");
          break;
        case " ":
          e.preventDefault();
          handleSkip();
          break;
        case "Backspace":
          e.preventDefault();
          handleGoBack();
          break;
        case "ArrowUp":
          e.preventDefault();
          handlePrevPage();
          break;
        case "ArrowDown":
          e.preventDefault();
          handleNextPage();
          break;
        case "Escape":
          onClose();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  // Stats
  const classifiedCount = Array.from(classifications.values()).filter(
    (v) => v === "cdv" || v === "fiche_lot",
  ).length;
  const skippedCount = Array.from(classifications.values()).filter(
    (v) => v === "skipped",
  ).length;

  // Completion screen
  if (isComplete) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Classification terminee</h2>
          <p className="mt-2 text-muted-foreground">
            {classifiedCount} document{classifiedCount !== 1 ? "s" : ""}{" "}
            classifie{classifiedCount !== 1 ? "s" : ""}
            {skippedCount > 0 && (
              <span>
                , {skippedCount} passe{skippedCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          {skippedCount > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                handleReviewSkipped();
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Revoir les passes ({skippedCount})
            </Button>
          )}
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <h2 className="text-lg font-semibold">Classification express</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {docs.length}
          </span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{
            width: `${String((currentIndex / docs.length) * 100)}%`,
          }}
        />
      </div>

      {/* PDF Preview area */}
      <div
        ref={containerRef}
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center overflow-auto transition-opacity duration-150",
          isTransitioning ? "opacity-0" : "opacity-100",
        )}
      >
        {isLoading && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        )}

        {loadError && (
          <div className="flex flex-col items-center gap-3 px-8 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <p className="text-xs text-muted-foreground">
              Vous pouvez passer ce document ou revenir en arriere.
            </p>
          </div>
        )}

        {fileData && !isLoading && !loadError && (
          <Document
            file={fileData}
            onLoadSuccess={handleDocumentLoadSuccess}
            loading={<Skeleton className="h-[600px] w-[450px]" />}
          >
            <Page
              pageNumber={currentPage}
              scale={effectiveScale}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              onLoadSuccess={handlePageLoadSuccess}
              loading={<Skeleton className="h-[600px] w-[450px]" />}
            />
          </Document>
        )}
      </div>

      {/* Page navigation (if multi-page) */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 border-t px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage <= 1}
            onClick={handlePrevPage}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {currentPage} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage >= pageCount}
            onClick={handleNextPage}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Classification controls */}
      <div className="space-y-3 border-t px-6 py-4">
        {/* Filename */}
        <p className="text-center text-sm font-medium text-muted-foreground">
          {currentDoc?.fileName}
          {currentDoc && currentDoc.pageCount > 1 && (
            <span className="ml-2 text-xs">
              ({currentDoc.pageCount} pages)
            </span>
          )}
        </p>

        {/* Classification buttons */}
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            className="h-14 flex-1 gap-2 text-base"
            onClick={() => {
              handleClassify("cdv");
            }}
          >
            <ArrowLeft className="h-5 w-5" />
            Compte de Vente
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="h-14 gap-2"
            onClick={() => {
              handleSkip();
            }}
          >
            <SkipForward className="h-5 w-5" />
            Passer
          </Button>

          <Button
            size="lg"
            className="h-14 flex-1 gap-2 bg-emerald-600 text-base text-white hover:bg-emerald-700"
            onClick={() => {
              handleClassify("fiche_lot");
            }}
          >
            Fiche de Lot
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Keyboard shortcut hints */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ←
            </kbd>{" "}
            CDV
          </span>
          <span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Espace
            </kbd>{" "}
            Passer ·{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Retour
            </kbd>{" "}
            Revenir
            {pageCount > 1 && (
              <>
                {" "}
                ·{" "}
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  ↑↓
                </kbd>{" "}
                Pages
              </>
            )}
          </span>
          <span>
            Fiche{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              →
            </kbd>
          </span>
        </div>
      </div>

      {/* History bar */}
      {classifications.size > 0 && (
        <div className="flex gap-1.5 overflow-x-auto border-t px-4 py-2">
          {docs.map((doc, index) => {
            const classification = classifications.get(doc.id);
            if (!classification) return null;
            return (
              <button
                key={doc.id}
                type="button"
                className={cn(
                  "shrink-0 rounded-md border px-2 py-1 text-xs transition-colors",
                  classification === "cdv" &&
                    "border-primary bg-primary/10 text-primary",
                  classification === "fiche_lot" &&
                    "border-emerald-600 bg-emerald-600/10 text-emerald-600",
                  classification === "skipped" &&
                    "border-muted-foreground/30 bg-muted text-muted-foreground",
                  index === currentIndex && "ring-2 ring-ring",
                )}
                onClick={() => {
                  handleGoToIndex(index);
                }}
                title={doc.fileName}
              >
                {classification === "cdv" && "CDV"}
                {classification === "fiche_lot" && "FL"}
                {classification === "skipped" && "—"}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
