import { create } from "zustand";
import type {
  ImportedDocument,
  ImportViewMode,
} from "@/types/import.types";

interface ImportState {
  documents: ImportedDocument[];
  activeDocumentId: string | null;
  viewMode: ImportViewMode;
  viewerPage: number;
  viewerZoom: number;
  splitPoints: number[];
  isImporting: boolean;
  isSplitting: boolean;


  addDocument: (doc: ImportedDocument) => void;
  removeDocument: (id: string) => void;
  setActiveDocument: (id: string | null) => void;
  setViewMode: (mode: ImportViewMode) => void;
  setViewerPage: (page: number) => void;
  setViewerZoom: (zoom: number) => void;
  toggleSplitPoint: (afterPage: number) => void;
  clearSplitPoints: () => void;
  setAllSplitPoints: (totalPages: number) => void;
  setIsImporting: (v: boolean) => void;
  setIsSplitting: (v: boolean) => void;
  setDocumentType: (id: string, type: "cdv" | "fiche_lot" | null) => void;
  setDocumentCdvSessionId: (id: string, sessionId: string) => void;
  clearDocumentCdvSessionId: (id: string) => void;
  getAvailableDocuments: (type?: "cdv" | "fiche_lot") => ImportedDocument[];
}

export const useImportStore = create<ImportState>((set, get) => ({
  documents: [],
  activeDocumentId: null,
  viewMode: "list",
  viewerPage: 1,
  viewerZoom: 100,
  splitPoints: [],
  isImporting: false,
  isSplitting: false,


  addDocument: (doc) => {
    set((state) => ({ documents: [...state.documents, doc] }));
  },

  removeDocument: (id) => {
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      activeDocumentId:
        state.activeDocumentId === id ? null : state.activeDocumentId,
    }));
  },

  setActiveDocument: (id) => {
    set({ activeDocumentId: id, viewerPage: 1 });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  setViewerPage: (page) => {
    set({ viewerPage: page });
  },

  setViewerZoom: (zoom) => {
    const clamped = Math.max(50, Math.min(200, zoom));
    set({ viewerZoom: clamped });
  },

  toggleSplitPoint: (afterPage) => {
    set((state) => {
      const exists = state.splitPoints.includes(afterPage);
      return {
        splitPoints: exists
          ? state.splitPoints.filter((p) => p !== afterPage)
          : [...state.splitPoints, afterPage].sort((a, b) => a - b),
      };
    });
  },

  clearSplitPoints: () => {
    set({ splitPoints: [] });
  },

  setAllSplitPoints: (totalPages) => {
    const all = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);
    set({ splitPoints: all });
  },

  setIsImporting: (v) => {
    set({ isImporting: v });
  },

  setIsSplitting: (v) => {
    set({ isSplitting: v });
  },

  setDocumentType: (id, type) => {
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, type } : d,
      ),
    }));
  },

  setDocumentCdvSessionId: (id, sessionId) => {
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, cdvSessionId: sessionId } : d,
      ),
    }));
  },

  clearDocumentCdvSessionId: (id) => {
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, cdvSessionId: null } : d,
      ),
    }));
  },

  getAvailableDocuments: (type?) => {
    const { documents } = get();
    return documents.filter(
      (d) => d.cdvSessionId === null && (type ? d.type === type : true),
    );
  },


}));
