import { useEffect, useMemo } from "react";
import { RefreshCw, Loader2, CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard.store";
import { useSettingsStore } from "@/stores/settings.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { DossierFilters } from "@/components/dashboard/DossierFilters";
import { NonTraiteTable } from "@/components/dashboard/NonTraiteTable";
import { ENV } from "@/lib/env";
import {
  filterFabricRows,
  getUniqueFabricClients,
} from "@/lib/dashboard-utils";

export function DeclarationsPage() {
  const {
    nonTraiteData,
    isLoading,
    isSyncingFabric,
    syncProgress,
    loadError,
    filters,
    loadDashboardData,
    syncFabricAndReload,
    setFilter,
    clearFilters,
  } = useDashboardStore();

  const { settings } = useSettingsStore();
  const { markFabricPageSeen } = useNavigationStore();

  // Mark page as seen on mount
  useEffect(() => {
    void markFabricPageSeen();
  }, [markFabricPageSeen]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const filteredNonTraite = useMemo(
    () => filterFabricRows(nonTraiteData, filters),
    [nonTraiteData, filters],
  );

  const clients = useMemo(
    () => getUniqueFabricClients(nonTraiteData),
    [nonTraiteData],
  );

  function handleRefresh() {
    void loadDashboardData();
  }

  function handleSyncFabric() {
    void syncFabricAndReload();
  }

  const fabricConfigured = ENV.fabric.graphqlEndpoint.length > 0;
  const lastSync = settings.fabricLastSyncAt;

  return (
    <div className="h-full overflow-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Déclarations non traitées</h1>
          {lastSync.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Dernière sync Fabric : {lastSync}
            </p>
          )}
          {!fabricConfigured && (
            <p className="text-xs text-muted-foreground">
              Fabric non configuré — variables d'environnement manquantes
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isSyncingFabric && syncProgress !== null && (
            <span className="text-xs text-muted-foreground">{syncProgress}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncFabric}
            disabled={isSyncingFabric || !fabricConfigured}
          >
            {isSyncingFabric ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CloudDownload className="mr-1.5 h-4 w-4" />
            )}
            Sync Fabric
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Actualiser
          </Button>
        </div>
      </div>

      {loadError !== null && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <DossierFilters
        filters={filters}
        clients={clients}
        produits={[]} // No produits for Fabric data
        onFilterChange={setFilter}
        onReset={clearFilters}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <NonTraiteTable data={filteredNonTraite} />
      )}
    </div>
  );
}
