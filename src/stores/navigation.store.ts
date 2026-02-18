import { create } from "zustand";
import {
  markEntitySeen,
  markAllEntitiesSeen,
  getUnseenCount,
  getTotalCount,
} from "@/services/user-activity.service";
import { getUnmatchedFabricCvEncours } from "@/services/database.service";

export interface NavigationBadge {
  total: number;
  unseen: number;
  variant: "destructive" | "secondary" | null;
}

export interface NavigationBadges {
  importDocuments: NavigationBadge;
  createDossiers: NavigationBadge;
  editDossiers: NavigationBadge;
  dashboard: NavigationBadge;
  dashboardATraiter: NavigationBadge;
  dashboardAnomalies: NavigationBadge;
  dashboardGenere: NavigationBadge;
  dashboardCloture: NavigationBadge;
  declarationsNonTraitees: NavigationBadge;
}

interface NavigationState {
  badges: NavigationBadges;
  isLoading: boolean;

  loadBadges: () => Promise<void>;
  markDossierSeen: (sessionId: string) => Promise<void>;
  markFabricPageSeen: () => Promise<void>;
  markImportPageSeen: () => Promise<void>;
}

const createEmptyBadge = (): NavigationBadge => ({
  total: 0,
  unseen: 0,
  variant: null,
});

const createEmptyBadges = (): NavigationBadges => ({
  importDocuments: createEmptyBadge(),
  createDossiers: createEmptyBadge(),
  editDossiers: createEmptyBadge(),
  dashboard: createEmptyBadge(),
  dashboardATraiter: createEmptyBadge(),
  dashboardAnomalies: createEmptyBadge(),
  dashboardGenere: createEmptyBadge(),
  dashboardCloture: createEmptyBadge(),
  declarationsNonTraitees: createEmptyBadge(),
});

const calculateBadgeVariant = (badge: NavigationBadge): NavigationBadge => ({
  ...badge,
  variant: badge.total === 0 ? null : badge.unseen > 0 ? "destructive" : "secondary",
});

export const useNavigationStore = create<NavigationState>((set, get) => ({
  badges: createEmptyBadges(),
  isLoading: false,

  loadBadges: async () => {
    set({ isLoading: true });

    try {
      const fabricRows = await getUnmatchedFabricCvEncours();

      // Import Documents (not in DB, skip for now - will be handled by import store)
      const importBadge = createEmptyBadge();

      // Create Dossiers (brouillon + ocr_en_cours)
      const createFilter = (row: Record<string, unknown>) => {
        const statut = row["statut"] as string;
        return statut === "brouillon" || statut === "ocr_en_cours";
      };
      const createTotal = await getTotalCount("dossier", createFilter);
      const createUnseen = await getUnseenCount("dossier", createFilter);
      const createBadge = calculateBadgeVariant({
        total: createTotal,
        unseen: createUnseen,
        variant: null,
      });

      // Edit Dossiers (a_corriger + valide)
      const editFilter = (row: Record<string, unknown>) => {
        const statut = row["statut"] as string;
        return statut === "a_corriger" || statut === "valide";
      };
      const editTotal = await getTotalCount("dossier", editFilter);
      const editUnseen = await getUnseenCount("dossier", editFilter);
      const editBadge = calculateBadgeVariant({
        total: editTotal,
        unseen: editUnseen,
        variant: null,
      });

      // Dashboard sub-badges
      // À traiter (a_corriger/valide + fabricMatched = 1)
      const aTraiterFilter = (row: Record<string, unknown>) => {
        const statut = row["statut"] as string;
        const fabricMatched = row["fabric_matched"] as number;
        return (
          (statut === "a_corriger" || statut === "valide") &&
          fabricMatched === 1
        );
      };
      const aTraiterTotal = await getTotalCount("dossier", aTraiterFilter);
      const aTraiterUnseen = await getUnseenCount("dossier", aTraiterFilter);
      const aTraiterBadge = calculateBadgeVariant({
        total: aTraiterTotal,
        unseen: aTraiterUnseen,
        variant: null,
      });

      // Anomalies (a_corriger/valide + fabricMatched = 0)
      const anomaliesFilter = (row: Record<string, unknown>) => {
        const statut = row["statut"] as string;
        const fabricMatched = row["fabric_matched"] as number;
        return (
          (statut === "a_corriger" || statut === "valide") &&
          fabricMatched === 0
        );
      };
      const anomaliesTotal = await getTotalCount("dossier", anomaliesFilter);
      const anomaliesUnseen = await getUnseenCount("dossier", anomaliesFilter);
      const anomaliesBadge = calculateBadgeVariant({
        total: anomaliesTotal,
        unseen: anomaliesUnseen,
        variant: null,
      });

      // Générés (genere)
      const genereFilter = (row: Record<string, unknown>) => {
        const statut = row["statut"] as string;
        return statut === "genere";
      };
      const genereTotal = await getTotalCount("dossier", genereFilter);
      const genereUnseen = await getUnseenCount("dossier", genereFilter);
      const genereBadge = calculateBadgeVariant({
        total: genereTotal,
        unseen: genereUnseen,
        variant: null,
      });

      // Clôturés (cloture)
      const clotureFilter = (row: Record<string, unknown>) => {
        const statut = row["statut"] as string;
        return statut === "cloture";
      };
      const clotureTotal = await getTotalCount("dossier", clotureFilter);
      const clotureUnseen = await getUnseenCount("dossier", clotureFilter);
      const clotureBadge = calculateBadgeVariant({
        total: clotureTotal,
        unseen: clotureUnseen,
        variant: null,
      });

      // Dashboard main badge = sum of all sub-tabs
      const dashboardBadge = calculateBadgeVariant({
        total:
          aTraiterBadge.total +
          anomaliesBadge.total +
          genereBadge.total +
          clotureBadge.total,
        unseen:
          aTraiterBadge.unseen +
          anomaliesBadge.unseen +
          genereBadge.unseen +
          clotureBadge.unseen,
        variant: null,
      });

      // Déclarations non traitées (Fabric rows)
      const fabricTotal = fabricRows.length;
      const fabricUnseen = await getUnseenCount("fabric_encours");
      const declarationsBadge = calculateBadgeVariant({
        total: fabricTotal,
        unseen: fabricUnseen,
        variant: null,
      });

      set({
        badges: {
          importDocuments: importBadge,
          createDossiers: createBadge,
          editDossiers: editBadge,
          dashboard: dashboardBadge,
          dashboardATraiter: aTraiterBadge,
          dashboardAnomalies: anomaliesBadge,
          dashboardGenere: genereBadge,
          dashboardCloture: clotureBadge,
          declarationsNonTraitees: declarationsBadge,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load badges:", error);
      set({ isLoading: false });
    }
  },

  markDossierSeen: async (sessionId: string) => {
    try {
      await markEntitySeen("dossier", sessionId);
      await get().loadBadges();
    } catch (error) {
      console.error("Failed to mark dossier seen:", error);
    }
  },

  markFabricPageSeen: async () => {
    try {
      await markAllEntitiesSeen("fabric_encours");
      await get().loadBadges();
    } catch (error) {
      console.error("Failed to mark Fabric page seen:", error);
    }
  },

  markImportPageSeen: async () => {
    try {
      await markAllEntitiesSeen("imported_doc");
      await get().loadBadges();
    } catch (error) {
      console.error("Failed to mark import page seen:", error);
    }
  },
}));
