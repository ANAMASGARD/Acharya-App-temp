import { apiFetch } from "@/lib/api-client";
import type { CalendarSession } from "@/types/calendar";
import type { SessionNode } from "@/types/graph";
import type { AsyncStatus, FetchOptions, GetToken } from "@/types/async-resource";
import { isStale } from "@/types/async-resource";
import { create } from "zustand";

type SessionsResponse = Readonly<{
  sessions: SessionNode[];
}>;

type CalendarSessionsState = Readonly<{
  sessions: CalendarSession[];
  status: AsyncStatus;
  error: string | null;
  lastFetchedAt: number | null;
  fetchPromise: Promise<void> | null;
  fetch: (getToken: GetToken, options?: FetchOptions) => Promise<void>;
  reset: () => void;
}>;

const INITIAL_STATE = {
  sessions: [] as CalendarSession[],
  status: "idle" as AsyncStatus,
  error: null,
  lastFetchedAt: null,
  fetchPromise: null,
};

function sortSessions(sessions: SessionNode[]): CalendarSession[] {
  return [...sessions].sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
}

export const useCalendarSessionsStore = create<CalendarSessionsState>()(
  (set, get) => ({
    ...INITIAL_STATE,
    fetch: async (getToken, options = {}) => {
      const { silent = false, force = false } = options;
      const state = get();

      if (
        !force &&
        state.status === "success" &&
        state.lastFetchedAt &&
        !isStale(state.lastFetchedAt)
      ) {
        return;
      }

      if (state.fetchPromise) {
        return state.fetchPromise;
      }

      const hasData = state.sessions.length > 0;

      const promise = (async (): Promise<void> => {
        if (!silent && !hasData) {
          set({ status: "loading" });
        }

        set({ error: null });

        try {
          const token = await getToken();
          const response = await apiFetch<SessionsResponse>("/api/sessions", {
            token,
          });

          set({
            sessions: sortSessions(response.sessions),
            status: "success",
            lastFetchedAt: Date.now(),
          });
        } catch (fetchError) {
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load sessions";

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
  }),
);
