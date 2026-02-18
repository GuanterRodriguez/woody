import { create } from "zustand";
import { load, type Store } from "@tauri-apps/plugin-store";
import { WoodyError } from "@/types/errors";

export type N8nAuthType = "none" | "apiKey" | "bearer";

export interface AppSettings {
  n8nWebhookUrl: string;
  n8nTestUrl: string;
  n8nAuthType: N8nAuthType;
  n8nAuthValue: string;
  n8nTimeoutMinutes: number;
  n8nRetryCount: number;

  fabricGraphqlEndpoint: string;
  fabricClientId: string;
  fabricTenantId: string;
  fabricClientSecret: string;
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
  n8nWebhookUrl: "",
  n8nTestUrl: "",
  n8nAuthType: "none",
  n8nAuthValue: "",
  n8nTimeoutMinutes: 5,
  n8nRetryCount: 0,

  fabricGraphqlEndpoint: "",
  fabricClientId: "",
  fabricTenantId: "",
  fabricClientSecret: "",
  fabricLastSyncAt: "",
  fabricLastSyncCount: 0,
};

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (storeInstance) return storeInstance;
  storeInstance = await load("settings.json", {
    defaults: {
      n8nWebhookUrl: "",
      n8nTestUrl: "",
      n8nAuthType: "none",
      n8nAuthValue: "",
      n8nTimeoutMinutes: 5,
      n8nRetryCount: 0,

      fabricGraphqlEndpoint: "",
      fabricClientId: "",
      fabricTenantId: "",
      fabricClientSecret: "",
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
      const n8nWebhookUrl =
        (await store.get<string>("n8nWebhookUrl")) ?? "";
      const n8nTestUrl =
        (await store.get<string>("n8nTestUrl")) ?? "";
      const n8nAuthType =
        (await store.get<N8nAuthType>("n8nAuthType")) ?? "none";
      const n8nAuthValue =
        (await store.get<string>("n8nAuthValue")) ?? "";
      const n8nTimeoutMinutes =
        (await store.get<number>("n8nTimeoutMinutes")) ?? 5;
      const n8nRetryCount =
        (await store.get<number>("n8nRetryCount")) ?? 0;

      const fabricGraphqlEndpoint =
        (await store.get<string>("fabricGraphqlEndpoint")) ?? "";
      const fabricClientId =
        (await store.get<string>("fabricClientId")) ?? "";
      const fabricTenantId =
        (await store.get<string>("fabricTenantId")) ?? "";
      const fabricClientSecret =
        (await store.get<string>("fabricClientSecret")) ?? "";
      const fabricLastSyncAt =
        (await store.get<string>("fabricLastSyncAt")) ?? "";
      const fabricLastSyncCount =
        (await store.get<number>("fabricLastSyncCount")) ?? 0;
      set({
        settings: {
          n8nWebhookUrl,
          n8nTestUrl,
          n8nAuthType,
          n8nAuthValue,
          n8nTimeoutMinutes,
          n8nRetryCount,

          fabricGraphqlEndpoint,
          fabricClientId,
          fabricTenantId,
          fabricClientSecret,
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
      await store.set("n8nWebhookUrl", settings.n8nWebhookUrl);
      await store.set("n8nTestUrl", settings.n8nTestUrl);
      await store.set("n8nAuthType", settings.n8nAuthType);
      await store.set("n8nAuthValue", settings.n8nAuthValue);
      await store.set("n8nTimeoutMinutes", settings.n8nTimeoutMinutes);
      await store.set("n8nRetryCount", settings.n8nRetryCount);

      await store.set("fabricGraphqlEndpoint", settings.fabricGraphqlEndpoint);
      await store.set("fabricClientId", settings.fabricClientId);
      await store.set("fabricTenantId", settings.fabricTenantId);
      await store.set("fabricClientSecret", settings.fabricClientSecret);
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
