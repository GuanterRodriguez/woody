import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { DossierFilters } from "@/components/dashboard/DossierFilters";
import { ATraiterTable } from "@/components/dashboard/ATraiterTable";
import {
  filterSessions,
  getUniqueClients,
  getUniqueProduits,
} from "@/lib/dashboard-utils";

export function ATraiterPage() {
  const navigate = useNavigate();
  const {
    aTraiterSubTab,
    aTraiterData,
    anomaliesData,
    isLoading,
    loadError,
    filters,
    setATraiterSubTab,
    loadDashboardData,
    setFilter,
    clearFilters,
  } = useDashboardStore();

  const { badges, loadBadges } = useNavigationStore();

  useEffect(() => {
    void loadDashboardData();
    void loadBadges();
  }, [loadDashboardData, loadBadges]);

  const filteredATraiter = useMemo(
    () => filterSessions(aTraiterData, filters),
    [aTraiterData, filters],
  );

  const filteredAnomalies = useMemo(
    () => filterSessions(anomaliesData, filters),
    [anomaliesData, filters],
  );

  const clients = useMemo(() => {
    return getUniqueClients([...aTraiterData, ...anomaliesData]);
  }, [aTraiterData, anomaliesData]);

  const produits = useMemo(() => {
    return getUniqueProduits([...aTraiterData, ...anomaliesData]);
  }, [aTraiterData, anomaliesData]);

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
        <h1 className="text-2xl font-bold">À traiter</h1>

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
        <ATraiterTable
          mainData={filteredATraiter}
          anomaliesData={filteredAnomalies}
          anomaliesCount={badges.dashboardAnomalies.total}
          activeSubTab={aTraiterSubTab}
          onSubTabChange={setATraiterSubTab}
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
