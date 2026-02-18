import { create } from "zustand";
import type { CdvSession } from "@/types/cdv.types";
import type { FabricCvEncoursRow } from "@/types/fabric.types";
import type {
  DashboardTab,
  ATraiterSubTab,
  DashboardFilters,
  DashboardTabCounts,
} from "@/types/dashboard.types";
import {
  listCdvSessions,
  getUnmatchedFabricCvEncours,
} from "@/services/database.service";
import { syncAllFabricData } from "@/services/fabric.service";
import { WoodyError } from "@/types/errors";

const DEFAULT_FILTERS: DashboardFilters = {
  client: null,
  produit: null,
  search: "",
  periode: "all",
};

interface DashboardState {
  activeTab: DashboardTab;
  aTraiterSubTab: ATraiterSubTab;

  nonTraiteData: FabricCvEncoursRow[];
  aTraiterData: CdvSession[];
  anomaliesData: CdvSession[];
  genereData: CdvSession[];
  clotureData: CdvSession[];

  tabCounts: DashboardTabCounts;
  isLoading: boolean;
  isSyncingFabric: boolean;
  syncProgress: string | null;
  loadError: string | null;
  filters: DashboardFilters;

  setActiveTab: (tab: DashboardTab) => void;
  setATraiterSubTab: (sub: ATraiterSubTab) => void;
  loadDashboardData: () => Promise<void>;
  syncFabricAndReload: () => Promise<{ encoursRows: number; clotureRows: number; autoClosed: number }>;
  setFilter: <K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K],
  ) => void;
  clearFilters: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  activeTab: "non_traite",
  aTraiterSubTab: "main",

  nonTraiteData: [],
  aTraiterData: [],
  anomaliesData: [],
  genereData: [],
  clotureData: [],

  tabCounts: {
    nonTraite: 0,
    aTraiter: 0,
    anomalies: 0,
    genere: 0,
    cloture: 0,
  },
  isLoading: false,
  isSyncingFabric: false,
  syncProgress: null,
  loadError: null,
  filters: { ...DEFAULT_FILTERS },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setATraiterSubTab: (sub) => {
    set({ aTraiterSubTab: sub });
  },

  loadDashboardData: async () => {
    set({ isLoading: true, loadError: null });
    try {
      const allSessions = await listCdvSessions();

      const aTraiterMain = allSessions.filter(
        (s) =>
          (s.statut === "a_corriger" || s.statut === "valide") &&
          s.fabricMatched,
      );
      const anomalies = allSessions.filter(
        (s) =>
          (s.statut === "a_corriger" || s.statut === "valide") &&
          !s.fabricMatched,
      );
      const genere = allSessions.filter((s) => s.statut === "genere");
      const cloture = allSessions.filter((s) => s.statut === "cloture");

      let nonTraite: FabricCvEncoursRow[] = [];
      try {
        nonTraite = await getUnmatchedFabricCvEncours();
      } catch {
        // Fabric cache may be empty — not a critical error
      }

      set({
        nonTraiteData: nonTraite,
        aTraiterData: aTraiterMain,
        anomaliesData: anomalies,
        genereData: genere,
        clotureData: cloture,
        tabCounts: {
          nonTraite: nonTraite.length,
          aTraiter: aTraiterMain.length,
          anomalies: anomalies.length,
          genere: genere.length,
          cloture: cloture.length,
        },
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof WoodyError
          ? error.message
          : "Erreur lors du chargement des dossiers";
      set({ isLoading: false, loadError: message });
    }
  },

  syncFabricAndReload: async () => {
    set({ isSyncingFabric: true, syncProgress: null });
    try {
      const result = await syncAllFabricData((_step, detail) => {
        set({ syncProgress: detail });
      });
      await get().loadDashboardData();
      return result;
    } finally {
      set({ isSyncingFabric: false, syncProgress: null });
    }
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }));
  },

  clearFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },
}));
