import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PdfDropZoneProps {
  onFilesDropped: (filePaths: string[]) => void | Promise<void>;
  isImporting: boolean;
}

function filterPdfPaths(paths: string[]): string[] {
  return paths.filter((p) => p.toLowerCase().endsWith(".pdf"));
}

export function PdfDropZone({
  onFilesDropped,
  isImporting,
}: PdfDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  // Stabilize callback via ref to avoid re-registering Tauri listeners on every render
  const onFilesDroppedRef = useRef(onFilesDropped);
  useEffect(() => {
    onFilesDroppedRef.current = onFilesDropped;
  }, [onFilesDropped]);

  useEffect(() => {
    let active = true;
    const unlisteners: (() => void)[] = [];

    async function setupListeners() {
      const unDrop = await listen<{ paths: string[] }>(
        "tauri://drag-drop",
        (event) => {
          if (!active) return;
          setIsDragOver(false);
          const pdfPaths = filterPdfPaths(event.payload.paths);
          if (pdfPaths.length > 0) {
            onFilesDroppedRef.current(pdfPaths);
          }
        },
      );
      if (!active) { unDrop(); return; }
      unlisteners.push(unDrop);

      const unEnter = await listen("tauri://drag-enter", () => {
        if (!active) return;
        setIsDragOver(true);
      });
      if (!active) { unEnter(); return; }
      unlisteners.push(unEnter);

      const unLeave = await listen("tauri://drag-leave", () => {
        if (!active) return;
        setIsDragOver(false);
      });
      if (!active) { unLeave(); return; }
      unlisteners.push(unLeave);
    }

    void setupListeners();

    return () => {
      active = false;
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, []);

  async function handleBrowse() {
    const selected = await open({
      multiple: true,
      filters: [{ name: "PDF", extensions: ["pdf", "PDF"] }],
    });
    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      const pdfPaths = filterPdfPaths(paths);
      if (pdfPaths.length > 0) {
        onFilesDropped(pdfPaths);
      }
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25",
        isImporting && "pointer-events-none opacity-60",
      )}
    >
      {isImporting ? (
        <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
      ) : (
        <FileUp className="text-muted-foreground h-10 w-10" />
      )}
      <div className="text-center">
        <p className="font-medium">
          {isImporting
            ? "Import en cours..."
            : "Glissez vos PDFs ici"}
        </p>
        {!isImporting && (
          <p className="text-muted-foreground text-sm">
            ou cliquez pour parcourir
          </p>
        )}
      </div>
      {!isImporting && (
        <Button variant="outline" size="sm" onClick={() => void handleBrowse()}>
          Parcourir
        </Button>
      )}
      <p className="text-muted-foreground text-xs">
        Formats acceptes : PDF
      </p>
    </div>
  );
}
