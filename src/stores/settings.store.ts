import { create } from "zustand";
import { load, type Store } from "@tauri-apps/plugin-store";
import { WoodyError } from "@/types/errors";

export interface AppSettings {
  fabricLastSyncAt: string;
  fabricLastSyncCount: number;
}

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
  isSaving: boolean;
  updateSettings: (partial: Partial<AppSettings>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  fabricLastSyncAt: "",
  fabricLastSyncCount: 0,
};

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (storeInstance) return storeInstance;
  storeInstance = await load("settings.json", {
    defaults: {
      fabricLastSyncAt: "",
      fabricLastSyncCount: 0,
    },
    autoSave: false,
  });
  return storeInstance;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  isLoaded: false,
  isSaving: false,

  updateSettings: (partial) => {
    set((state) => ({
      settings: { ...state.settings, ...partial },
    }));
  },

  loadSettings: async () => {
    try {
      const store = await getStore();
      const fabricLastSyncAt =
        (await store.get<string>("fabricLastSyncAt")) ?? "";
      const fabricLastSyncCount =
        (await store.get<number>("fabricLastSyncCount")) ?? 0;
      set({
        settings: {
          fabricLastSyncAt,
          fabricLastSyncCount,
        },
        isLoaded: true,
      });
    } catch (error) {
      throw new WoodyError(
        "Impossible de charger les parametres",
        "SETTINGS_LOAD_FAILED",
        error,
      );
    }
  },

  saveSettings: async () => {
    set({ isSaving: true });
    try {
      const store = await getStore();
      const { settings } = get();
      await store.set("fabricLastSyncAt", settings.fabricLastSyncAt);
      await store.set("fabricLastSyncCount", settings.fabricLastSyncCount);
      await store.save();
    } catch (error) {
      throw new WoodyError(
        "Impossible de sauvegarder les parametres",
        "SETTINGS_SAVE_FAILED",
        error,
      );
    } finally {
      set({ isSaving: false });
    }
  },
}));
