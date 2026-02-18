import { Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { OcrQueueProgress } from "@/components/dossier/OcrQueueProgress";
import { useQueueStore } from "@/stores/queue.store";

export function OcrQueue() {
  const {
    items,
    isProcessing,
    isPaused,
    processedCount,
    totalCount,
    pauseProcessing,
    resumeProcessing,
    cancelProcessing,
  } = useQueueStore();

  if (!isProcessing && items.length === 0) return null;

  const progressPercent =
    totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">File d'attente OCR</h2>

      <div className="rounded-lg border p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              Progression: {processedCount}/{totalCount} dossier
              {totalCount > 1 ? "s" : ""} traite
              {processedCount > 1 ? "s" : ""}
            </span>
            <span className="text-muted-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} />
        </div>

        <div className="space-y-1">
          {items.map((item) => (
            <OcrQueueProgress key={item.dossierSessionId} item={item} />
          ))}
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2">
            {isPaused ? (
              <Button size="sm" variant="outline" onClick={resumeProcessing}>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Reprendre
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={pauseProcessing}>
                <Pause className="mr-1.5 h-3.5 w-3.5" />
                Pause
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={cancelProcessing}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Annuler
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
