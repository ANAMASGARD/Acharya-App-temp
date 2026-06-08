import { apiFetch } from "@/lib/api-client";
import type { SessionDetail } from "@/types/calendar";
import type { AsyncStatus, FetchOptions, GetToken } from "@/types/async-resource";
import { isStale } from "@/types/async-resource";
import { create } from "zustand";

type SessionDetailResponse = SessionDetail &
  Readonly<{
    message?: string;
  }>;

type DetailEntry = Readonly<{
  detail: SessionDetail | null;
  status: AsyncStatus;
  error: string | null;
  lastFetchedAt: number | null;
  fetchPromise: Promise<void> | null;
}>;

type CalendarSessionDetailState = Readonly<{
  entries: Record<string, DetailEntry>;
  fetchDetail: (
    getToken: GetToken,
    sessionId: string,
    options?: FetchOptions,
  ) => Promise<void>;
  prefetchDetails: (
    getToken: GetToken,
    sessionIds: readonly string[],
    options?: FetchOptions,
  ) => Promise<void>;
  getDetail: (sessionId: string) => DetailEntry | null;
  reset: () => void;
}>;

const EMPTY_ENTRY: DetailEntry = {
  detail: null,
  status: "idle",
  error: null,
  lastFetchedAt: null,
  fetchPromise: null,
};

function getEntry(
  entries: Record<string, DetailEntry>,
  sessionId: string,
): DetailEntry {
  return entries[sessionId] ?? EMPTY_ENTRY;
}

export const useCalendarSessionDetailStore = create<CalendarSessionDetailState>()(
  (set, get) => ({
    entries: {},
    getDetail: (sessionId) => getEntry(get().entries, sessionId),
    fetchDetail: async (getToken, sessionId, options = {}) => {
      const { silent = false, force = false } = options;
      const state = get();
      const entry = getEntry(state.entries, sessionId);

      if (
        !force &&
        entry.detail &&
        entry.lastFetchedAt &&
        !isStale(entry.lastFetchedAt)
      ) {
        return;
      }

      if (entry.fetchPromise) {
        return entry.fetchPromise;
      }

      const hasData = entry.detail !== null;

      const promise = (async (): Promise<void> => {
        if (!silent && !hasData) {
          set((current) => ({
            entries: {
              ...current.entries,
              [sessionId]: {
                ...getEntry(current.entries, sessionId),
                status: "loading",
                error: null,
              },
            },
          }));
        }

        try {
          const token = await getToken();
          const response = await apiFetch<SessionDetailResponse>(
            `/api/sessions?sessionId=${encodeURIComponent(sessionId)}`,
            { token },
          );

          set((current) => ({
            entries: {
              ...current.entries,
              [sessionId]: {
                detail: {
                  session: response.session,
                  report: response.report,
                  transcriptPreview: response.transcriptPreview,
                  classNotes: response.classNotes ?? null,
                },
                status: "success",
                error: null,
                lastFetchedAt: Date.now(),
                fetchPromise: null,
              },
            },
          }));
        } catch (fetchError) {
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load session details";

          set((current) => {
            const currentEntry = getEntry(current.entries, sessionId);
            return {
              entries: {
                ...current.entries,
                [sessionId]: {
                  ...currentEntry,
                  error: message,
                  status: hasData ? "success" : "error",
                  fetchPromise: null,
                },
              },
            };
          });
        }
      })();

      set((current) => ({
        entries: {
          ...current.entries,
          [sessionId]: {
            ...getEntry(current.entries, sessionId),
            fetchPromise: promise,
          },
        },
      }));

      return promise;
    },
    prefetchDetails: async (getToken, sessionIds, options = {}) => {
      const uniqueIds = [...new Set(sessionIds)].filter(Boolean);

      if (uniqueIds.length === 0) {
        return;
      }

      await Promise.allSettled(
        uniqueIds.map((sessionId) =>
          get().fetchDetail(getToken, sessionId, {
            silent: true,
            ...options,
          }),
        ),
      );
    },
    reset: () => set({ entries: {} }),
  }),
);
