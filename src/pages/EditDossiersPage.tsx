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

export function EditDossiersPage() {
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

  const { loadBadges } = useNavigationStore();

  useEffect(() => {
    void loadDashboardData();
    void loadBadges();
  }, [loadDashboardData, loadBadges]);

  // Combine both matched and unmatched for editing view
  const allEditableDossiers = useMemo(
    () => [...aTraiterData, ...anomaliesData],
    [aTraiterData, anomaliesData],
  );

  const filteredDossiers = useMemo(
    () => filterSessions(allEditableDossiers, filters),
    [allEditableDossiers, filters],
  );

  const clients = useMemo(() => {
    return getUniqueClients(allEditableDossiers);
  }, [allEditableDossiers]);

  const produits = useMemo(() => {
    return getUniqueProduits(allEditableDossiers);
  }, [allEditableDossiers]);

  function handleRowClick(sessionId: string) {
    void navigate({ to: "/editor/$sessionId", params: { sessionId } });
  }

  function handleRefresh() {
    void loadDashboardData();
    void loadBadges();
  }

  // Split filtered dossiers into matched and anomalies for display
  const filteredMatched = useMemo(
    () => filteredDossiers.filter((d) => d.fabricMatched),
    [filteredDossiers],
  );

  const filteredAnomalies = useMemo(
    () => filteredDossiers.filter((d) => !d.fabricMatched),
    [filteredDossiers],
  );

  return (
    <div className="h-full overflow-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Corriger des dossiers</h1>

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
          mainData={filteredMatched}
          anomaliesData={filteredAnomalies}
          anomaliesCount={filteredAnomalies.length}
          activeSubTab={aTraiterSubTab}
          onSubTabChange={setATraiterSubTab}
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
