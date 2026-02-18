import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardStore } from "@/stores/dashboard.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { DossierFilters } from "@/components/dashboard/DossierFilters";
import { ATraiterTable } from "@/components/dashboard/ATraiterTable";
import { GenereTable } from "@/components/dashboard/GenereTable";
import { ClotureTable } from "@/components/dashboard/ClotureTable";
import {
  filterSessions,
  getUniqueClients,
  getUniqueProduits,
} from "@/lib/dashboard-utils";
import type { DashboardTab } from "@/types/dashboard.types";

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    activeTab,
    aTraiterSubTab,
    aTraiterData,
    anomaliesData,
    genereData,
    clotureData,
    isLoading,
    loadError,
    filters,
    setActiveTab,
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

  // Filtered data per active tab
  const filteredATraiter = useMemo(
    () => filterSessions(aTraiterData, filters),
    [aTraiterData, filters],
  );
  const filteredAnomalies = useMemo(
    () => filterSessions(anomaliesData, filters),
    [anomaliesData, filters],
  );
  const filteredGenere = useMemo(
    () => filterSessions(genereData, filters),
    [genereData, filters],
  );
  const filteredCloture = useMemo(
    () => filterSessions(clotureData, filters),
    [clotureData, filters],
  );

  // Client/produit lists
  const clients = useMemo(() => {
    const allSessions = [
      ...aTraiterData,
      ...anomaliesData,
      ...genereData,
      ...clotureData,
    ];
    return getUniqueClients(allSessions);
  }, [aTraiterData, anomaliesData, genereData, clotureData]);

  const produits = useMemo(() => {
    const allSessions = [
      ...aTraiterData,
      ...anomaliesData,
      ...genereData,
      ...clotureData,
    ];
    return getUniqueProduits(allSessions);
  }, [aTraiterData, anomaliesData, genereData, clotureData]);

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
        <h1 className="text-2xl font-bold">Tableau de bord</h1>

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

      <Tabs
        value={activeTab === "non_traite" ? "a_traiter" : activeTab}
        onValueChange={(v) => {
          setActiveTab(v as DashboardTab);
        }}
      >
        <TabsList>
          <TabsTrigger value="a_traiter">
            À traiter
            {badges.dashboardATraiter.total > 0 && (
              <Badge
                variant={badges.dashboardATraiter.variant ?? "secondary"}
                className="ml-1.5 h-5 px-1.5 text-xs"
              >
                {badges.dashboardATraiter.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            Anomalies
            {badges.dashboardAnomalies.total > 0 && (
              <Badge
                variant={badges.dashboardAnomalies.variant ?? "secondary"}
                className="ml-1.5 h-5 px-1.5 text-xs"
              >
                {badges.dashboardAnomalies.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="genere">
            Générés
            {badges.dashboardGenere.total > 0 && (
              <Badge
                variant={badges.dashboardGenere.variant ?? "secondary"}
                className="ml-1.5 h-5 px-1.5 text-xs"
              >
                {badges.dashboardGenere.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cloture">
            Clôturés
            {badges.dashboardCloture.total > 0 && (
              <Badge
                variant={badges.dashboardCloture.variant ?? "secondary"}
                className="ml-1.5 h-5 px-1.5 text-xs"
              >
                {badges.dashboardCloture.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <DossierFilters
            filters={filters}
            clients={clients}
            produits={produits}
            onFilterChange={setFilter}
            onReset={clearFilters}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="a_traiter" className="mt-4">
              <ATraiterTable
                mainData={filteredATraiter}
                anomaliesData={filteredAnomalies}
                anomaliesCount={badges.dashboardAnomalies.total}
                activeSubTab={aTraiterSubTab}
                onSubTabChange={setATraiterSubTab}
                onRowClick={handleRowClick}
              />
            </TabsContent>

            <TabsContent value="anomalies" className="mt-4">
              <ATraiterTable
                mainData={[]}
                anomaliesData={filteredAnomalies}
                anomaliesCount={badges.dashboardAnomalies.total}
                activeSubTab="anomalies"
                onSubTabChange={setATraiterSubTab}
                onRowClick={handleRowClick}
              />
            </TabsContent>

            <TabsContent value="genere" className="mt-4">
              <GenereTable data={filteredGenere} onRowClick={handleRowClick} />
            </TabsContent>

            <TabsContent value="cloture" className="mt-4">
              <ClotureTable data={filteredCloture} onRowClick={handleRowClick} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
