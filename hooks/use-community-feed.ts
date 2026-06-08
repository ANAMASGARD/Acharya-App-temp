import { apiFetch } from "@/lib/api-client";
import {
  makeFeedCacheKey,
  useCommunityFeedStore,
} from "@/store/community-feed-store";
import type { CommunityPost, PostsFeedResponse, VoteValue } from "@/types/community";
import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef, useState } from "react";

type UseCommunityFeedOptions = Readonly<{
  limit?: number;
  groupId?: string | null;
  autoFetch?: boolean;
}>;

type UseCommunityFeedResult = Readonly<{
  posts: readonly CommunityPost[];
  isLoading: boolean;
  hasFetched: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  votePost: (postId: string, value: VoteValue) => Promise<void>;
  removeVote: (postId: string) => Promise<void>;
  toggleSave: (postId: string, save: boolean) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
}>;

export function useCommunityFeed(
  options: UseCommunityFeedOptions = {},
): UseCommunityFeedResult {
  const limit = options.limit ?? 5;
  const groupId = options.groupId ?? null;
  const autoFetch = options.autoFetch !== false;
  const useStore = limit === 2 && groupId === null;

  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const cacheKey = makeFeedCacheKey(limit, groupId);
  const storeEntry = useCommunityFeedStore((state) =>
    useStore ? (state.entries[cacheKey] ?? null) : null,
  );
  const fetchFeed = useCommunityFeedStore((state) => state.fetch);
  const updateStorePosts = useCommunityFeedStore((state) => state.updatePosts);

  const [localPosts, setLocalPosts] = useState<CommunityPost[]>([]);
  const [localIsLoading, setLocalIsLoading] = useState(false);
  const [localHasFetched, setLocalHasFetched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const posts = useStore ? (storeEntry?.posts ?? []) : localPosts;
  const isLoading = useStore
    ? storeEntry?.status === "loading" && posts.length === 0
    : localIsLoading;
  const hasFetched = useStore
    ? (storeEntry?.status ?? "idle") !== "idle"
    : localHasFetched;
  const error = useStore ? (storeEntry?.error ?? null) : localError;

  const refresh = useCallback(async (): Promise<void> => {
    if (useStore) {
      await fetchFeed(() => getTokenRef.current(), {
        limit,
        groupId,
        force: true,
      });
      return;
    }

    setLocalIsLoading(true);
    setLocalError(null);

    try {
      const token = await getTokenRef.current();
      const query = new URLSearchParams({ limit: String(limit) });

      if (groupId) {
        query.set("groupId", groupId);
      }

      const response = await apiFetch<PostsFeedResponse>(
        `/api/community/posts?${query.toString()}`,
        { token },
      );

      setLocalPosts([...response.posts]);
      setLocalHasFetched(true);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Failed to load feed";
      setLocalError(message);
      setLocalHasFetched(true);
    } finally {
      setLocalIsLoading(false);
    }
  }, [fetchFeed, groupId, limit, useStore]);

  useEffect(() => {
    if (!autoFetch) {
      return;
    }

    if (useStore) {
      void fetchFeed(() => getTokenRef.current(), {
        limit,
        groupId,
        silent: (storeEntry?.posts.length ?? 0) > 0,
      });
      return;
    }

    void refresh();
  }, [autoFetch, fetchFeed, groupId, limit, refresh, storeEntry?.posts.length, useStore]);

  const updatePost = useCallback(
    (postId: string, patch: Partial<CommunityPost>): void => {
      if (useStore) {
        updateStorePosts(cacheKey, (current) =>
          current.map((post) =>
            post.postId === postId ? { ...post, ...patch } : post,
          ),
        );
        return;
      }

      setLocalPosts((current) =>
        current.map((post) =>
          post.postId === postId ? { ...post, ...patch } : post,
        ),
      );
    },
    [cacheKey, updateStorePosts, useStore],
  );

  const votePost = useCallback(
    async (postId: string, value: VoteValue): Promise<void> => {
      const token = await getTokenRef.current();
      const current = posts.find((post) => post.postId === postId);

      if (!current) {
        return;
      }

      const oldVote = current.viewerVote;
      let optimisticScore = current.score;

      if (oldVote === value) {
        return;
      }

      if (oldVote === null) {
        optimisticScore += value;
      } else if (oldVote === 1 && value === -1) {
        optimisticScore -= 2;
      } else if (oldVote === -1 && value === 1) {
        optimisticScore += 2;
      }

      updatePost(postId, { score: optimisticScore, viewerVote: value });

      try {
        const response = await apiFetch<{ score: number; viewerVote: VoteValue | null }>(
          `/api/community/posts/${postId}/vote`,
          { method: "POST", token, body: { value } },
        );
        updatePost(postId, {
          score: response.score,
          viewerVote: response.viewerVote,
        });
      } catch (voteError) {
        updatePost(postId, {
          score: current.score,
          viewerVote: current.viewerVote,
        });
        console.warn(
          "Failed to update vote",
          voteError instanceof Error ? voteError.message : voteError,
        );
      }
    },
    [posts, updatePost],
  );

  const removeVote = useCallback(
    async (postId: string): Promise<void> => {
      const token = await getTokenRef.current();
      const current = posts.find((post) => post.postId === postId);

      if (!current || current.viewerVote === null) {
        return;
      }

      const optimisticScore =
        current.viewerVote === 1 ? current.score - 1 : current.score + 1;

      updatePost(postId, { score: optimisticScore, viewerVote: null });

      try {
        const response = await apiFetch<{ score: number; viewerVote: VoteValue | null }>(
          `/api/community/posts/${postId}/vote`,
          { method: "DELETE", token },
        );
        updatePost(postId, {
          score: response.score,
          viewerVote: response.viewerVote,
        });
      } catch (removeError) {
        updatePost(postId, {
          score: current.score,
          viewerVote: current.viewerVote,
        });
        console.warn(
          "Failed to remove vote",
          removeError instanceof Error ? removeError.message : removeError,
        );
      }
    },
    [posts, updatePost],
  );

  const deletePost = useCallback(
    async (postId: string): Promise<void> => {
      const token = await getTokenRef.current();

      await apiFetch(`/api/community/posts/${encodeURIComponent(postId)}`, {
        method: "DELETE",
        token,
      });

      if (useStore) {
        updateStorePosts(cacheKey, (current) =>
          current.filter((post) => post.postId !== postId),
        );
        return;
      }

      setLocalPosts((current) => current.filter((post) => post.postId !== postId));
    },
    [cacheKey, updateStorePosts, useStore],
  );

  const toggleSave = useCallback(
    async (postId: string, save: boolean): Promise<void> => {
      const token = await getTokenRef.current();
      const current = posts.find((post) => post.postId === postId);

      if (!current) {
        return;
      }

      updatePost(postId, { viewerSaved: save });

      try {
        await apiFetch<{ viewerSaved: boolean }>(
          `/api/community/posts/${postId}/save`,
          { method: save ? "POST" : "DELETE", token },
        );
      } catch (saveError) {
        updatePost(postId, { viewerSaved: current.viewerSaved });
        console.warn(
          "Failed to update save",
          saveError instanceof Error ? saveError.message : saveError,
        );
      }
    },
    [posts, updatePost],
  );

  return {
    posts,
    isLoading,
    hasFetched,
    error,
    refresh,
    votePost,
    removeVote,
    toggleSave,
    deletePost,
  };
}
