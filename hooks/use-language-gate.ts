import { getLanguageById } from "@/data/languages";
import { usePreferencesStore } from "@/store/preferences-store";
import type { TeachingLanguage } from "@/types/language";
import { useAuth } from "@clerk/expo";

type LanguageGateResult = {
  isReady: boolean;
  needsLanguageSelection: boolean;
  selectedLanguage: TeachingLanguage | undefined;
};

export function useLanguageGate(): LanguageGateResult {
  const { isLoaded, isSignedIn } = useAuth();
  const selectedLanguageId = usePreferencesStore(
    (state) => state.selectedLanguageId,
  );
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated);

  const isReady = isLoaded && hasHydrated;
  const needsLanguageSelection =
    isReady && isSignedIn === true && selectedLanguageId === null;
  const selectedLanguage = selectedLanguageId
    ? getLanguageById(selectedLanguageId)
    : undefined;

  return {
    isReady,
    needsLanguageSelection,
    selectedLanguage,
  };
}
