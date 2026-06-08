import { apiFetch } from "@/lib/api-client";
import type { CommunityPost, PostsFeedResponse } from "@/types/community";
import type { AsyncStatus, FetchOptions, GetToken } from "@/types/async-resource";
import { isStale } from "@/types/async-resource";
import { create } from "zustand";

export type FeedCacheKey = string;

type FeedEntry = Readonly<{
  posts: CommunityPost[];
  status: AsyncStatus;
  error: string | null;
  lastFetchedAt: number | null;
  fetchPromise: Promise<void> | null;
}>;

type FetchFeedOptions = FetchOptions &
  Readonly<{
    limit: number;
    groupId?: string | null;
  }>;

type CommunityFeedState = Readonly<{
  entries: Record<FeedCacheKey, FeedEntry>;
  fetch: (getToken: GetToken, options: FetchFeedOptions) => Promise<void>;
  updatePosts: (
    key: FeedCacheKey,
    updater: (posts: CommunityPost[]) => CommunityPost[],
  ) => void;
  reset: () => void;
}>;

export function makeFeedCacheKey(
  limit: number,
  groupId?: string | null,
): FeedCacheKey {
  return groupId ? `${limit}:${groupId}` : String(limit);
}

const EMPTY_ENTRY: FeedEntry = {
  posts: [],
  status: "idle",
  error: null,
  lastFetchedAt: null,
  fetchPromise: null,
};

function getOrCreateEntry(
  entries: Record<FeedCacheKey, FeedEntry>,
  key: FeedCacheKey,
): FeedEntry {
  return entries[key] ?? EMPTY_ENTRY;
}

export const useCommunityFeedStore = create<CommunityFeedState>()((set, get) => ({
  entries: {},
  fetch: async (getToken, options) => {
    const { limit, groupId = null, silent = false, force = false } = options;
    const key = makeFeedCacheKey(limit, groupId);
    const state = get();
    const entry = getOrCreateEntry(state.entries, key);

    if (
      !force &&
      entry.status === "success" &&
      entry.lastFetchedAt &&
      !isStale(entry.lastFetchedAt)
    ) {
      return;
    }

    if (entry.fetchPromise) {
      return entry.fetchPromise;
    }

    const hasData = entry.posts.length > 0;

    const promise = (async (): Promise<void> => {
      const nextStatus: AsyncStatus =
        !silent && !hasData ? "loading" : entry.status;

      set((current) => ({
        entries: {
          ...current.entries,
          [key]: {
            ...getOrCreateEntry(current.entries, key),
            status: nextStatus,
            error: null,
          },
        },
      }));

      try {
        const token = await getToken();
        const query = new URLSearchParams({ limit: String(limit) });

        if (groupId) {
          query.set("groupId", groupId);
        }

        const response = await apiFetch<PostsFeedResponse>(
          `/api/community/posts?${query.toString()}`,
          { token },
        );

        set((current) => ({
          entries: {
            ...current.entries,
            [key]: {
              posts: [...response.posts],
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
            : "Failed to load feed";

        set((current) => {
          const currentEntry = getOrCreateEntry(current.entries, key);
          return {
            entries: {
              ...current.entries,
              [key]: {
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
        [key]: {
          ...getOrCreateEntry(current.entries, key),
          fetchPromise: promise,
        },
      },
    }));

    return promise;
  },
  updatePosts: (key, updater) =>
    set((state) => {
      const entry = getOrCreateEntry(state.entries, key);
      return {
        entries: {
          ...state.entries,
          [key]: {
            ...entry,
            posts: updater(entry.posts),
          },
        },
      };
    }),
  reset: () => set({ entries: {} }),
}));
