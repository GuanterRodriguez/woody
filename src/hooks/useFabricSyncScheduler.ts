import { useEffect, useRef } from "react";
import { syncAllFabricData } from "@/services/fabric.service";
import { ENV } from "@/lib/env";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Background scheduler that syncs Fabric data (cv_encours + cv_cloture)
 * and auto-closes matching dossiers every 5 minutes.
 */
export function useFabricSyncScheduler(enabled: boolean): void {
  const isSyncing = useRef(false);

  useEffect(() => {
    if (!enabled || !ENV.fabric.graphqlEndpoint) return;

    async function runSync() {
      if (isSyncing.current) return;
      isSyncing.current = true;
      try {
        const result = await syncAllFabricData();
        console.log(
          `[Fabric Sync] cv_encours: ${String(result.encoursRows)}, cv_cloture: ${String(result.clotureRows)}, auto-clotures: ${String(result.autoClosed)}`,
        );
      } catch (error) {
        console.warn("[Fabric Sync] Erreur sync periodique:", error);
      } finally {
        isSyncing.current = false;
      }
    }

    // Run once on mount, then every 5 minutes
    void runSync();
    const intervalId = setInterval(() => {
      void runSync();
    }, SYNC_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, []);
}
