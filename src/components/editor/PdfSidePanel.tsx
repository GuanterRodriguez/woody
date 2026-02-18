import "@/lib/pdf-worker";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Expand,
  Shrink,
  RotateCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { readPdfBytes } from "@/services/pdf.service";
import { WoodyError } from "@/types/errors";

interface PdfSidePanelProps {
  pdfCdvPath: string;
  pdfFicheLotPath: string;
  activeTab: "cdv" | "fiche_lot";
  onTabChange: (tab: "cdv" | "fiche_lot") => void;
}

interface PdfState {
  data: Uint8Array | null;
  isLoading: boolean;
  error: string | null;
  pageCount: number;
}

type ZoomMode = "fit" | "manual";

const CONTAINER_PADDING = 16;
const DEFAULT_SCALE = 0.9;
const MIN_SCALE = 0.1;
const MAX_SCALE = 3.0;

function PdfToolbar({
  currentPage,
  pageCount,
  displayZoom,
  zoomMode,
  manualZoom,
  rotation,
  isFullscreen,
  onPrevPage,
  onNextPage,
  onZoomOut,
  onZoomIn,
  onFitZoom,
  onRotate,
  onToggleFullscreen,
}: {
  currentPage: number;
  pageCount: number;
  displayZoom: number;
  zoomMode: ZoomMode;
  manualZoom: number;
  rotation: number;
  isFullscreen: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitZoom: () => void;
  onRotate: () => void;
  onToggleFullscreen: () => void;
}) {
  return (
    <div className="bg-background flex shrink-0 items-center justify-between border-t px-2 py-1.5">
      {/* Page navigation */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onPrevPage}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-muted-foreground min-w-[3rem] text-center text-xs">
          {currentPage} / {pageCount || 1}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onNextPage}
          disabled={currentPage >= pageCount}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Zoom + rotate + fullscreen controls */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onZoomOut}
          disabled={zoomMode === "manual" && manualZoom <= 50}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[2.5rem] text-center text-xs">
          {displayZoom}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onZoomIn}
          disabled={zoomMode === "manual" && manualZoom >= 200}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={zoomMode === "fit" ? "secondary" : "ghost"}
          size="icon"
          className="ml-0.5 h-7 w-7"
          onClick={onFitZoom}
          title="Ajuster au panneau"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={rotation !== 0 ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={onRotate}
          title="Rotation 90°"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Quitter plein ecran" : "Plein ecran"}
        >
          {isFullscreen ? (
            <Shrink className="h-3.5 w-3.5" />
          ) : (
            <Expand className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

function PdfPanelViewer({ filePath }: { filePath: string }) {
  const [pdf, setPdf] = useState<PdfState>({
    data: null,
    isLoading: true,
    error: null,
    pageCount: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");
  const [manualZoom, setManualZoom] = useState(100);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pageDimensions, setPageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!filePath) {
      setPdf({
        data: null,
        isLoading: false,
        error: "Aucun PDF",
        pageCount: 0,
      });
      return;
    }

    let cancelled = false;
    setPdf((prev) => ({ ...prev, isLoading: true, error: null }));
    setPageDimensions(null);
    setCurrentPage(1);
    setRotation(0);

    readPdfBytes(filePath)
      .then((bytes) => {
        if (!cancelled) {
          setPdf({ data: bytes, isLoading: false, error: null, pageCount: 0 });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message =
            error instanceof WoodyError
              ? error.message
              : "Impossible de charger le PDF";
          setPdf({
            data: null,
            isLoading: false,
            error: message,
            pageCount: 0,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  // Measure container size (works for both inline and fullscreen via ResizeObserver)
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

  // Reset zoom to fit when toggling fullscreen (container size changes)
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

  const fileData = useMemo(
    () => (pdf.data ? { data: pdf.data } : null),
    [pdf.data],
  );

  function handleDocumentLoadSuccess(info: { numPages: number }) {
    setPdf((prev) => ({ ...prev, pageCount: info.numPages }));
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

  // Account for rotation when computing fit dimensions
  const effectiveDimensions = useMemo(() => {
    if (!pageDimensions) return null;
    const isRotated = rotation === 90 || rotation === 270;
    return {
      width: isRotated ? pageDimensions.height : pageDimensions.width,
      height: isRotated ? pageDimensions.width : pageDimensions.height,
    };
  }, [pageDimensions, rotation]);

  const effectiveScale = useMemo(() => {
    if (zoomMode === "manual") {
      return manualZoom / 100;
    }

    if (!effectiveDimensions || containerSize.width === 0 || containerSize.height === 0) {
      return DEFAULT_SCALE;
    }

    const availableWidth = containerSize.width - CONTAINER_PADDING;
    const availableHeight = containerSize.height - CONTAINER_PADDING;

    const scaleX = availableWidth / effectiveDimensions.width;
    const scaleY = availableHeight / effectiveDimensions.height;

    const fitScale = Math.min(scaleX, scaleY);
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale));
  }, [zoomMode, manualZoom, effectiveDimensions, containerSize]);

  const displayZoom = Math.round(effectiveScale * 100);

  // Toolbar handlers
  const handlePrevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(pdf.pageCount, p + 1));
  }, [pdf.pageCount]);

  const handleZoomOut = useCallback(() => {
    setZoomMode("manual");
    setManualZoom((z) => Math.max(50, z - 25));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomMode("manual");
    setManualZoom((z) => Math.min(200, z + 25));
  }, []);

  const handleFitZoom = useCallback(() => {
    setZoomMode("fit");
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((f) => !f);
  }, []);

  // PDF content - always a single Document instance
  let pdfContent: React.ReactNode;
  if (pdf.error) {
    pdfContent = (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-destructive">{pdf.error}</p>
      </div>
    );
  } else if (pdf.isLoading || !fileData) {
    pdfContent = (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
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
            rotate={rotation}
            onLoadSuccess={handlePageLoadSuccess}
            renderAnnotationLayer={true}
            renderTextLayer={true}
            loading={<Skeleton className="h-[500px] w-[350px]" />}
          />
        </Document>
      </div>
    );
  }

  const toolbarProps = {
    currentPage,
    pageCount: pdf.pageCount,
    displayZoom,
    zoomMode,
    manualZoom,
    rotation,
    onPrevPage: handlePrevPage,
    onNextPage: handleNextPage,
    onZoomOut: handleZoomOut,
    onZoomIn: handleZoomIn,
    onFitZoom: handleFitZoom,
    onRotate: handleRotate,
    onToggleFullscreen: handleToggleFullscreen,
  };

  // Single return - never unmount the Document.
  // In fullscreen: backdrop + fixed overlay wraps the same viewer.
  // In panel: inline layout with cursor pointer to open fullscreen.
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
            : "flex h-full flex-col"
        }
      >
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
        <PdfToolbar {...toolbarProps} isFullscreen={isFullscreen} />
      </div>
    </>
  );
}

export function PdfSidePanel({
  pdfCdvPath,
  pdfFicheLotPath,
  activeTab,
  onTabChange,
}: PdfSidePanelProps) {
  return (
    <div className="flex h-full flex-col">
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          onTabChange(v as "cdv" | "fiche_lot");
        }}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="mx-2 mt-2 shrink-0">
          <TabsTrigger value="cdv" disabled={!pdfCdvPath}>
            CDV
          </TabsTrigger>
          <TabsTrigger value="fiche_lot" disabled={!pdfFicheLotPath}>
            Fiche lot
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="cdv"
          className="mt-0 relative min-h-0 flex-1"
        >
          <div className="absolute inset-0">
            {pdfCdvPath ? (
              <PdfPanelViewer filePath={pdfCdvPath} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Aucun PDF CDV
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent
          value="fiche_lot"
          className="mt-0 relative min-h-0 flex-1"
        >
          <div className="absolute inset-0">
            {pdfFicheLotPath ? (
              <PdfPanelViewer filePath={pdfFicheLotPath} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Aucun PDF Fiche de lot
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
