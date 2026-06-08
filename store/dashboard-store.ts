import { apiFetch } from "@/lib/api-client";
import type { DashboardResponse } from "@/types/community";
import type { AsyncStatus, FetchOptions, GetToken } from "@/types/async-resource";
import { isStale } from "@/types/async-resource";
import { create } from "zustand";

type DashboardState = Readonly<{
  dashboard: DashboardResponse | null;
  status: AsyncStatus;
  error: string | null;
  lastFetchedAt: number | null;
  fetchPromise: Promise<void> | null;
  fetch: (getToken: GetToken, options?: FetchOptions) => Promise<void>;
  reset: () => void;
}>;

const INITIAL_STATE = {
  dashboard: null,
  status: "idle" as AsyncStatus,
  error: null,
  lastFetchedAt: null,
  fetchPromise: null,
};

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  ...INITIAL_STATE,
  fetch: async (getToken, options = {}) => {
    const { silent = false, force = false } = options;
    const state = get();

    if (
      !force &&
      state.dashboard &&
      state.lastFetchedAt &&
      !isStale(state.lastFetchedAt)
    ) {
      return;
    }

    if (state.fetchPromise) {
      return state.fetchPromise;
    }

    const hasData = state.dashboard !== null;

    const promise = (async (): Promise<void> => {
      if (!silent && !hasData) {
        set({ status: "loading" });
      }

      set({ error: null });

      try {
        const token = await getToken();
        const response = await apiFetch<DashboardResponse>(
          "/api/dashboard?activityLimit=2",
          { token },
        );

        set({
          dashboard: response,
          status: "success",
          lastFetchedAt: Date.now(),
        });
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load dashboard";

        set({
          error: message,
          status: hasData ? "success" : "error",
        });
      } finally {
        set({ fetchPromise: null });
      }
    })();

    set({ fetchPromise: promise });
    return promise;
  },
  reset: () => set({ ...INITIAL_STATE }),
}));
