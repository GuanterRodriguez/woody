import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { DossierFilters } from "@/components/dashboard/DossierFilters";
import { GenereTable } from "@/components/dashboard/GenereTable";
import {
  filterSessions,
  getUniqueClients,
  getUniqueProduits,
} from "@/lib/dashboard-utils";

export function GeneresPage() {
  const navigate = useNavigate();
  const {
    genereData,
    isLoading,
    loadError,
    filters,
    loadDashboardData,
    setFilter,
    clearFilters,
  } = useDashboardStore();

  const { loadBadges } = useNavigationStore();

  useEffect(() => {
    void loadDashboardData();
    void loadBadges();
  }, [loadDashboardData, loadBadges]);

  const filteredGenere = useMemo(
    () => filterSessions(genereData, filters),
    [genereData, filters],
  );

  const clients = useMemo(() => {
    return getUniqueClients(genereData);
  }, [genereData]);

  const produits = useMemo(() => {
    return getUniqueProduits(genereData);
  }, [genereData]);

  function handleRowClick(sessionId: string) {
    void navigate({ to: "/editor/$sessionId", params: { sessionId } });
  }

  function handleRefresh() {
    void loadDashboardData();
    void loadBadges();
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Générés</h1>

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

      {loadError !== null && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <DossierFilters
        filters={filters}
        clients={clients}
        produits={produits}
        onFilterChange={setFilter}
        onReset={clearFilters}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <GenereTable data={filteredGenere} onRowClick={handleRowClick} />
      )}
    </div>
  );
}
