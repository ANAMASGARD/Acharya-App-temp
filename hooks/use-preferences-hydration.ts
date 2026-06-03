import { usePreferencesStore } from "@/store/preferences-store";
import { useEffect } from "react";

const HYDRATION_SAFETY_MS = 800;

/**
 * Ensures Zustand persist finishes (or times out) so gated screens never spin forever.
 */
export function usePreferencesHydration(): void {
  useEffect(() => {
    const finishHydration = (): void => {
      usePreferencesStore.getState().setHasHydrated(true);
    };

    const unsubFinish =
      usePreferencesStore.persist.onFinishHydration(finishHydration);

    void Promise.resolve(usePreferencesStore.persist.rehydrate()).finally(
      finishHydration,
    );

    const safetyTimer = setTimeout(finishHydration, HYDRATION_SAFETY_MS);

    return () => {
      unsubFinish();
      clearTimeout(safetyTimer);
    };
  }, []);
}
