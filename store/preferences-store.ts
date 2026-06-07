import { preferencesPersistStorage } from "@/lib/preferences-persist-storage";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const PREFERENCES_PERSIST_KEY = "acharya-preferences";

type PreferencesState = {
  selectedLanguageId: string | null;
  teachingClassIds: string[];
  pushNotificationsEnabled: boolean;
  hasHydrated: boolean;
  setSelectedLanguage: (id: string) => void;
  setTeachingClassIds: (ids: string[]) => void;
  toggleTeachingClass: (classId: string) => void;
  setPushNotificationsEnabled: (enabled: boolean) => void;
  clearLanguagePreference: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      selectedLanguageId: null,
      teachingClassIds: [],
      pushNotificationsEnabled: true,
      hasHydrated: false,
      setSelectedLanguage: (id) => set({ selectedLanguageId: id }),
      setTeachingClassIds: (ids) => set({ teachingClassIds: ids }),
      toggleTeachingClass: (classId) =>
        set((state) => {
          const exists = state.teachingClassIds.includes(classId);

          return {
            teachingClassIds: exists
              ? state.teachingClassIds.filter((id) => id !== classId)
              : [...state.teachingClassIds, classId],
          };
        }),
      setPushNotificationsEnabled: (enabled) =>
        set({ pushNotificationsEnabled: enabled }),
      clearLanguagePreference: () => set({ selectedLanguageId: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: PREFERENCES_PERSIST_KEY,
      storage: createJSONStorage(() => preferencesPersistStorage),
      partialize: (state) => ({
        selectedLanguageId: state.selectedLanguageId,
        teachingClassIds: state.teachingClassIds,
        pushNotificationsEnabled: state.pushNotificationsEnabled,
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
