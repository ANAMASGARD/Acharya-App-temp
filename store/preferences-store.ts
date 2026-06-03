import { preferencesPersistStorage } from "@/lib/preferences-persist-storage";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const PREFERENCES_PERSIST_KEY = "acharya-preferences";

type PreferencesState = {
  selectedLanguageId: string | null;
  hasHydrated: boolean;
  setSelectedLanguage: (id: string) => void;
  clearLanguagePreference: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      selectedLanguageId: null,
      hasHydrated: false,
      setSelectedLanguage: (id) => set({ selectedLanguageId: id }),
      clearLanguagePreference: () => set({ selectedLanguageId: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: PREFERENCES_PERSIST_KEY,
      storage: createJSONStorage(() => preferencesPersistStorage),
      partialize: (state) => ({
        selectedLanguageId: state.selectedLanguageId,
      }),
      onRehydrateStorage: () => () => {
        usePreferencesStore.getState().setHasHydrated(true);
      },
    },
  ),
);

export async function clearPreferencesStorage(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PREFERENCES_PERSIST_KEY);
  } catch (error) {
    console.warn("Failed to clear preferences storage", error);
  }
}
