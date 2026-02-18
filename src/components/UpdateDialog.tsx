import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  downloadAndInstallUpdate,
  type UpdateProgress,
} from "@/services/updater.service";

interface UpdateDialogProps {
  open: boolean;
  onClose: () => void;
  version: string;
  releaseNotes?: string;
}

export function UpdateDialog({
  open,
  onClose,
  version,
  releaseNotes,
}: UpdateDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleUpdate() {
    setIsUpdating(true);
    setError(null);
    downloadAndInstallUpdate((p) => {
      setProgress(p);
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      setIsUpdating(false);
    });
  }

  const progressPercent =
    progress?.total && progress.total > 0
      ? Math.round((progress.downloaded / progress.total) * 100)
      : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !isUpdating) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mise a jour disponible</DialogTitle>
          <DialogDescription>
            La version {version} est disponible. Voulez-vous mettre a jour
            maintenant ?
          </DialogDescription>
        </DialogHeader>

        {releaseNotes ? (
          <div className="max-h-40 overflow-y-auto rounded border p-3 text-sm text-muted-foreground">
            {releaseNotes}
          </div>
        ) : null}

        {isUpdating ? (
          <div className="space-y-2">
            <Progress value={progressPercent} />
            <p className="text-center text-sm text-muted-foreground">
              {progressPercent}% - Telechargement en cours...
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          {!isUpdating ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Plus tard
              </Button>
              <Button onClick={handleUpdate}>Mettre a jour</Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
