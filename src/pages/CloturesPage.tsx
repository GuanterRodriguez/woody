import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { DossierFilters } from "@/components/dashboard/DossierFilters";
import { ClotureTable } from "@/components/dashboard/ClotureTable";
import {
  filterSessions,
  getUniqueClients,
  getUniqueProduits,
} from "@/lib/dashboard-utils";

export function CloturesPage() {
  const navigate = useNavigate();
  const {
    clotureData,
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

  const filteredCloture = useMemo(
    () => filterSessions(clotureData, filters),
    [clotureData, filters],
  );

  const clients = useMemo(() => {
    return getUniqueClients(clotureData);
  }, [clotureData]);

  const produits = useMemo(() => {
    return getUniqueProduits(clotureData);
  }, [clotureData]);

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
        <h1 className="text-2xl font-bold">Clôturés</h1>

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
        <ClotureTable data={filteredCloture} onRowClick={handleRowClick} />
      )}
    </div>
  );
}
