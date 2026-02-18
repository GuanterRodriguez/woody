import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { QueueItem } from "@/types/queue.types";
import { cn } from "@/lib/utils";

interface OcrQueueProgressProps {
  item: QueueItem;
}

export function OcrQueueProgress({ item }: OcrQueueProgressProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
        item.status === "done" && "bg-green-50 text-green-800",
        item.status === "error" && "bg-destructive/10 text-destructive",
        (item.status === "ocr_cdv" || item.status === "ocr_fiche") &&
          "bg-blue-50 text-blue-800",
        item.status === "pending" && "text-muted-foreground",
      )}
    >
      <StatusIcon status={item.status} />
      <div className="flex-1 min-w-0">
        <span className="font-medium">
          {item.produit} - {item.client}
        </span>
        {item.currentStep && (
          <span className="ml-2 text-xs opacity-75">{item.currentStep}</span>
        )}
        {item.error && (
          <p className="mt-0.5 text-xs text-destructive truncate">
            {item.error}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: QueueItem["status"] }) {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 shrink-0" />;
    case "ocr_cdv":
    case "ocr_fiche":
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin" />;
    case "done":
      return <CheckCircle2 className="h-4 w-4 shrink-0" />;
    case "error":
      return <AlertCircle className="h-4 w-4 shrink-0" />;
  }
}
