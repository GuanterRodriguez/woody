import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { CdvSession, LigneVente } from "@/types/cdv.types";
import {
  getCdvSession,
  getLignesVente,
  updateCdvSession,
  saveLignesVenteWithIds,
  getFabricCvEncoursCount,
} from "@/services/database.service";
import { matchDeclaration } from "@/services/fabric.service";
import {
  mapFabricToCdvSession,
  type FabricCvEncours,
} from "@/types/fabric.types";
import { ENV } from "@/lib/env";
import { WoodyError } from "@/types/errors";

interface EditorState {
  sessionId: string | null;
  session: CdvSession | null;
  lignes: LigneVente[];
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
  activePdfTab: "cdv" | "fiche_lot";

  // Fabric enrichment state
  fabricLoading: boolean;
  fabricError: string | null;
  fabricDeclarations: FabricCvEncours[];
  showFabricSelector: boolean;

  loadSession: (sessionId: string) => Promise<void>;
  updateSessionField: (partial: Partial<CdvSession>) => void;
  updateLigne: (ligneId: string, partial: Partial<LigneVente>) => void;
  addLigne: () => void;
  removeLigne: (ligneId: string) => void;
  save: () => Promise<void>;
  validate: () => Promise<void>;
  setActivePdfTab: (tab: "cdv" | "fiche_lot") => void;
  enrichFromFabric: () => Promise<void>;
  applyFabricDeclaration: (declaration: FabricCvEncours) => void;
  closeFabricSelector: () => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  sessionId: null,
  session: null,
  lignes: [],
  isLoading: false,
  isSaving: false,
  isDirty: false,
  lastSavedAt: null,
  saveError: null,
  activePdfTab: "cdv",
  fabricLoading: false,
  fabricError: null,
  fabricDeclarations: [],
  showFabricSelector: false,

  loadSession: async (sessionId: string) => {
    set({ isLoading: true, saveError: null });
    try {
      const session = await getCdvSession(sessionId);
      if (!session) {
        throw new WoodyError(
          "Dossier introuvable",
          "EDITOR_SESSION_NOT_FOUND",
        );
      }
      const lignes = await getLignesVente(sessionId);
      set({
        sessionId,
        session,
        lignes,
        isLoading: false,
        isDirty: false,
        lastSavedAt: null,
        saveError: null,
      });
    } catch (error) {
      set({ isLoading: false });
      if (error instanceof WoodyError) throw error;
      throw new WoodyError(
        "Impossible de charger le dossier",
        "EDITOR_LOAD_FAILED",
        error,
      );
    }
  },

  updateSessionField: (partial: Partial<CdvSession>) => {
    const { session } = get();
    if (!session) return;
    set({
      session: { ...session, ...partial },
      isDirty: true,
    });
  },

  updateLigne: (ligneId: string, partial: Partial<LigneVente>) => {
    set((state) => ({
      lignes: state.lignes.map((l) =>
        l.id === ligneId ? { ...l, ...partial } : l,
      ),
      isDirty: true,
    }));
  },

  addLigne: () => {
    const { session, lignes } = get();
    if (!session) return;
    const maxOrdre = lignes.reduce(
      (max, l) => Math.max(max, l.ordre),
      0,
    );
    const newLigne: LigneVente = {
      id: uuidv4(),
      cdvSessionId: session.id,
      client: "",
      produit: session.produit,
      colis: 0,
      poidsBrut: 0,
      poidsNet: 0,
      prixUnitaireNet: 0,
      ordre: maxOrdre + 1,
    };
    set((state) => ({
      lignes: [...state.lignes, newLigne],
      isDirty: true,
    }));
  },

  removeLigne: (ligneId: string) => {
    set((state) => ({
      lignes: state.lignes.filter((l) => l.id !== ligneId),
      isDirty: true,
    }));
  },

  save: async () => {
    const { session, lignes, sessionId } = get();
    if (!session || !sessionId) return;

    set({ isSaving: true, saveError: null });
    try {
      await updateCdvSession(sessionId, {
        produit: session.produit,
        camion: session.camion,
        dateArrivee: session.dateArrivee,
        client: session.client,
        fournisseur: session.fournisseur,
        dossier: session.dossier,
        numDeclaration: session.numDeclaration,
        fraisTransit: session.fraisTransit,
        fraisCommission: session.fraisCommission,
        autreFrais: session.autreFrais,
        fraisUe: session.fraisUe,
        fraisInt: session.fraisInt,
        dateBae: session.dateBae,
        poidsDeclare: session.poidsDeclare,
        prixDeclareKilo: session.prixDeclareKilo,
        fabricMatched: session.fabricMatched,
      });

      await saveLignesVenteWithIds(sessionId, lignes);

      set({
        isSaving: false,
        isDirty: false,
        lastSavedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof WoodyError
          ? error.message
          : "Erreur de sauvegarde";
      set({ isSaving: false, saveError: message });
    }
  },

  validate: async () => {
    const { save, sessionId } = get();
    if (!sessionId) return;

    await save();

    await updateCdvSession(sessionId, { statut: "valide" });
    set((state) => ({
      session: state.session
        ? { ...state.session, statut: "valide" }
        : null,
    }));
  },

  setActivePdfTab: (tab) => {
    set({ activePdfTab: tab });
  },

  enrichFromFabric: async () => {
    const { session } = get();
    if (!session) return;

    if (!ENV.fabric.graphqlEndpoint) {
      set({
        fabricError:
          "L'endpoint GraphQL Fabric n'est pas configure (variable d'environnement manquante)",
      });
      return;
    }

    // Check local data is available
    const count = await getFabricCvEncoursCount();
    if (count === 0) {
      set({
        fabricError:
          "Aucune donnee Fabric synchronisee. Lancez une synchronisation dans les parametres.",
      });
      return;
    }

    if (!session.camion || !session.dateArrivee || !session.client) {
      set({
        fabricError:
          "Le camion, la date d'arrivee et le client sont requis pour le matching",
      });
      return;
    }

    set({ fabricLoading: true, fabricError: null, fabricDeclarations: [] });

    try {
      const result = await matchDeclaration({
        camion: session.camion,
        dateArrivee: session.dateArrivee,
        client: session.client,
      });

      if (result.matchCount === 0) {
        set({
          fabricLoading: false,
          fabricError: "Aucune declaration trouvee pour ces criteres",
        });
        return;
      }

      if (result.matchCount === 1) {
        const firstDecl = result.declarations[0];
        if (!firstDecl) return;
        const mapped = mapFabricToCdvSession(firstDecl);
        set((state) => ({
          fabricLoading: false,
          fabricDeclarations: result.declarations,
          session: state.session
            ? { ...state.session, ...mapped }
            : null,
          isDirty: true,
        }));
        return;
      }

      // Multiple results: show selector
      set({
        fabricLoading: false,
        fabricDeclarations: result.declarations,
        showFabricSelector: true,
      });
    } catch (error) {
      const message =
        error instanceof WoodyError
          ? error.message
          : "Erreur lors de l'enrichissement Fabric";
      set({ fabricLoading: false, fabricError: message });
    }
  },

  applyFabricDeclaration: (declaration: FabricCvEncours) => {
    const mapped = mapFabricToCdvSession(declaration);
    set((state) => ({
      session: state.session
        ? { ...state.session, ...mapped }
        : null,
      isDirty: true,
      showFabricSelector: false,
      fabricDeclarations: [declaration],
    }));
  },

  closeFabricSelector: () => {
    set({ showFabricSelector: false });
  },

  reset: () => {
    set({
      sessionId: null,
      session: null,
      lignes: [],
      isLoading: false,
      isSaving: false,
      isDirty: false,
      lastSavedAt: null,
      saveError: null,
      activePdfTab: "cdv",
      fabricLoading: false,
      fabricError: null,
      fabricDeclarations: [],
      showFabricSelector: false,
    });
  },
}));
