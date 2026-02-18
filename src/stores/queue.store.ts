import { create } from "zustand";
import type { QueueItem, QueueItemStatus } from "@/types/queue.types";

interface QueueState {
  items: QueueItem[];
  isProcessing: boolean;
  isPaused: boolean;
  shouldStop: boolean;
  processedCount: number;
  totalCount: number;

  addToQueue: (item: QueueItem) => void;
  removeFromQueue: (sessionId: string) => void;
  startProcessing: () => void;
  pauseProcessing: () => void;
  resumeProcessing: () => void;
  cancelProcessing: () => void;
  updateItemStatus: (
    sessionId: string,
    status: QueueItemStatus,
    error?: string | null,
    currentStep?: string | null,
  ) => void;
  incrementProcessed: () => void;
  clearQueue: () => void;
  reset: () => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  items: [],
  isProcessing: false,
  isPaused: false,
  shouldStop: false,
  processedCount: 0,
  totalCount: 0,

  addToQueue: (item) => {
    set((state) => ({
      items: [...state.items, item],
      totalCount: state.totalCount + 1,
    }));
  },

  removeFromQueue: (sessionId) => {
    set((state) => ({
      items: state.items.filter((i) => i.dossierSessionId !== sessionId),
      totalCount: Math.max(0, state.totalCount - 1),
    }));
  },

  startProcessing: () => {
    set({ isProcessing: true, isPaused: false, shouldStop: false });
  },

  pauseProcessing: () => {
    set({ isPaused: true });
  },

  resumeProcessing: () => {
    set({ isPaused: false });
  },

  cancelProcessing: () => {
    set({ shouldStop: true });
  },

  updateItemStatus: (sessionId, status, error = null, currentStep = null) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.dossierSessionId === sessionId
          ? { ...item, status, error, currentStep }
          : item,
      ),
    }));
  },

  incrementProcessed: () => {
    set((state) => ({ processedCount: state.processedCount + 1 }));
  },

  clearQueue: () => {
    set({
      items: [],
      isProcessing: false,
      isPaused: false,
      shouldStop: false,
      processedCount: 0,
      totalCount: 0,
    });
  },

  reset: () => {
    set({
      items: [],
      isProcessing: false,
      isPaused: false,
      shouldStop: false,
      processedCount: 0,
      totalCount: 0,
    });
  },
}));
