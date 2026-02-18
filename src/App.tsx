import { useState, useEffect, useCallback } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./routes";
import { initDatabase } from "@/services/database.service";
import { useSettingsStore } from "@/stores/settings.store";
import {
  checkForUpdate,
  type UpdateCheckResult,
} from "@/services/updater.service";
import { UpdateDialog } from "@/components/UpdateDialog";

export function App() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  const initApp = useCallback(async () => {
    try {
      await initDatabase();
      await loadSettings();
      setIsReady(true);

      // Check for updates after app is ready (non-blocking)
      try {
        const result = await checkForUpdate();
        if (result.available) {
          setUpdateInfo(result);
        }
      } catch {
        // Silently ignore update check errors (no network, etc.)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      setInitError(message);
    }
  }, [loadSettings]);

  useEffect(() => {
    void initApp();
  }, [initApp]);

  if (initError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-destructive">
            Erreur d&apos;initialisation
          </h1>
          <p className="mt-2 text-muted-foreground">{initError}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      {updateInfo?.available && updateInfo.version ? (
        <UpdateDialog
          open={true}
          onClose={() => {
            setUpdateInfo(null);
          }}
          version={updateInfo.version}
          releaseNotes={updateInfo.body}
        />
      ) : null}
    </>
  );
}
