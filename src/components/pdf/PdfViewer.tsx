import { useEffect, useMemo, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useImportStore } from "@/stores/import.store";
import { readPdfBytes } from "@/services/pdf.service";
import { WoodyError } from "@/types/errors";

interface PdfViewerProps {
  filePath: string;
  fileName: string;
  pageCount: number;
  onClose: () => void;
}

export function PdfViewer({
  filePath,
  pageCount,
  onClose,
}: PdfViewerProps) {
  const { viewerPage, viewerZoom, setViewerPage, setViewerZoom } =
    useImportStore();

  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState(String(viewerPage));

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    readPdfBytes(filePath)
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
  }, [filePath]);

  useEffect(() => {
    setPageInput(String(viewerPage));
  }, [viewerPage]);

  function handlePrevPage() {
    if (viewerPage > 1) {
      setViewerPage(viewerPage - 1);
    }
  }

  function handleNextPage() {
    if (viewerPage < pageCount) {
      setViewerPage(viewerPage + 1);
    }
  }

  function handlePageInputCommit() {
    const num = parseInt(pageInput, 10);
    if (!isNaN(num) && num >= 1 && num <= pageCount) {
      setViewerPage(num);
    } else {
      setPageInput(String(viewerPage));
    }
  }

  function handleZoomIn() {
    setViewerZoom(viewerZoom + 25);
  }

  function handleZoomOut() {
    setViewerZoom(viewerZoom - 25);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        handlePrevPage();
      } else if (e.key === "ArrowRight") {
        handleNextPage();
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  // Memoize file prop to prevent react-pdf from reloading on every re-render
  const fileData = useMemo(
    () => (pdfData ? { data: pdfData } : null),
    [pdfData],
  );

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }

  if (isLoading || !fileData) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex justify-center p-4">
          <Document
            file={fileData}
            loading={
              <Skeleton className="h-[600px] w-[450px]" />
            }
          >
            <Page
              pageNumber={viewerPage}
              scale={viewerZoom / 100}
              renderAnnotationLayer={true}
              renderTextLayer={true}
              loading={
                <Skeleton className="h-[600px] w-[450px]" />
              }
            />
          </Document>
        </div>
      </div>

      <div className="flex items-center justify-between border-t px-2 pt-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevPage}
            disabled={viewerPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-sm">
            <span>Page</span>
            <Input
              className="h-7 w-14 text-center"
              value={pageInput}
              onChange={(e) => {
                setPageInput(e.target.value);
              }}
              onBlur={handlePageInputCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handlePageInputCommit();
                }
              }}
            />
            <span>/ {pageCount}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextPage}
            disabled={viewerPage >= pageCount}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={viewerZoom <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-sm">
            {viewerZoom}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={viewerZoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
