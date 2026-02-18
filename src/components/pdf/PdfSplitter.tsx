import { useEffect, useMemo, useState } from "react";
import { Document } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { v4 as uuidv4 } from "uuid";
import { Loader2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImportStore } from "@/stores/import.store";
import { readPdfBytes, splitPdfBySegments } from "@/services/pdf.service";
import { PdfThumbnail } from "@/components/pdf/PdfThumbnail";
import type { ImportedDocument } from "@/types/import.types";
import { WoodyError } from "@/types/errors";
import { cn } from "@/lib/utils";

interface PdfSplitterProps {
  filePath: string;
  pageCount: number;
  onClose: () => void;
  onSplitComplete: (newDocuments: ImportedDocument[]) => void;
}

function SplitSeparator({
  afterPage,
  isActive,
  onToggle,
}: {
  afterPage: number;
  isActive: boolean;
  onToggle: (afterPage: number) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group flex w-8 shrink-0 cursor-pointer items-center justify-center self-stretch transition-colors",
        isActive
          ? "bg-destructive/10"
          : "hover:bg-muted",
      )}
      onClick={() => {
        onToggle(afterPage);
      }}
      title={
        isActive
          ? "Retirer la separation"
          : "Couper ici"
      }
    >
      <div className="relative flex h-full w-full items-center justify-center">
        <div
          className={cn(
            "absolute inset-y-2 left-1/2 w-0.5 -translate-x-1/2 transition-colors",
            isActive
              ? "bg-destructive"
              : "bg-transparent group-hover:bg-muted-foreground/30",
          )}
        />
        <Scissors
          className={cn(
            "relative z-10 h-4 w-4 rotate-90 transition-opacity",
            isActive
              ? "text-destructive opacity-100"
              : "opacity-0 group-hover:text-muted-foreground group-hover:opacity-100",
          )}
        />
      </div>
    </button>
  );
}

function computeSegments(
  splitPoints: number[],
  totalPages: number,
): { start: number; end: number }[] {
  const sorted = [...splitPoints].sort((a, b) => a - b);
  const boundaries = [0, ...sorted, totalPages];
  const segments: { start: number; end: number }[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = (boundaries[i] ?? 0) + 1;
    const end = boundaries[i + 1] ?? totalPages;
    if (start <= end) {
      segments.push({ start, end });
    }
  }
  return segments;
}

function formatSegment(seg: { start: number; end: number }): string {
  return seg.start === seg.end
    ? String(seg.start)
    : String(seg.start) + "-" + String(seg.end);
}

export function PdfSplitter({
  filePath,
  pageCount,
  onClose,
  onSplitComplete,
}: PdfSplitterProps) {
  const {
    splitPoints,
    isSplitting,
    toggleSplitPoint,
    clearSplitPoints,
    setAllSplitPoints,
    setIsSplitting,
  } = useImportStore();

  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [splitError, setSplitError] = useState<string | null>(null);

  useEffect(() => {
    clearSplitPoints();
  }, [clearSplitPoints]);

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

  const fileData = useMemo(
    () => (pdfData ? { data: pdfData } : null),
    [pdfData],
  );

  const segments = computeSegments(splitPoints, pageCount);

  async function handleSplit() {
    if (splitPoints.length === 0) return;
    setIsSplitting(true);
    setSplitError(null);
    try {
      const results = await splitPdfBySegments(
        filePath,
        splitPoints,
        pageCount,
      );

      const newDocs: ImportedDocument[] = results.map((seg) => ({
        id: uuidv4(),
        fileName: seg.fileName,
        filePath: seg.filePath,
        originalPath: filePath,
        pageCount: seg.pageCount,
        type: null,
        cdvSessionId: null,
      }));

      onSplitComplete(newDocs);
      onClose();
    } catch (error) {
      const message =
        error instanceof WoodyError
          ? error.message
          : "Erreur lors du decoupage";
      setSplitError(message);
    } finally {
      setIsSplitting(false);
    }
  }

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

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <p className="text-sm text-muted-foreground">
        {pageCount} pages — Cliquez entre deux pages pour ajouter un
        point de separation
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Document file={fileData}>
          <div className="flex flex-wrap items-start gap-y-3 p-1">
            {pages.map((pageNum) => (
              <div key={pageNum} className="flex items-start">
                <PdfThumbnail pageNumber={pageNum} />
                {pageNum < pageCount && (
                  <SplitSeparator
                    afterPage={pageNum}
                    isActive={splitPoints.includes(pageNum)}
                    onToggle={toggleSplitPoint}
                  />
                )}
              </div>
            ))}
          </div>
        </Document>
      </div>

      <div className="space-y-3 border-t pt-3">
        {splitPoints.length > 0 && (
          <p className="text-sm">
            <span className="font-medium">
              {segments.length} documents :
            </span>{" "}
            {segments
              .map(
                (seg, i) =>
                  "pages " + formatSegment(seg) +
                  (i < segments.length - 1 ? ", " : ""),
              )
              .join("")}
          </p>
        )}

        {splitError && (
          <p className="text-sm text-destructive">{splitError}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAllSplitPoints(pageCount);
            }}
            disabled={splitPoints.length === pageCount - 1}
          >
            Tout couper
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSplitPoints}
            disabled={splitPoints.length === 0}
          >
            Tout retirer
          </Button>
          <Button
            size="sm"
            disabled={splitPoints.length === 0 || isSplitting}
            onClick={() => void handleSplit()}
          >
            {isSplitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Decoupage...
              </>
            ) : (
              "Decouper"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
