import { apiFetch } from "@/lib/api-client";
import type { CommunityGroup, CreateGroupInput } from "@/types/community";
import { useAuth } from "@clerk/expo";
import { useCallback, useRef, useState } from "react";

type GroupsResponse = Readonly<{
  groups: readonly CommunityGroup[];
}>;

type UseCommunityGroupsResult = Readonly<{
  groups: readonly CommunityGroup[];
  isLoading: boolean;
  hasFetched: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createGroup: (input: CreateGroupInput) => Promise<CommunityGroup>;
  joinGroup: (joinCode: string, displayName: string) => Promise<CommunityGroup>;
}>;

export function useCommunityGroups(): UseCommunityGroupsResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getTokenRef.current();
      const response = await apiFetch<GroupsResponse>("/api/community/groups", {
        token,
      });
      setGroups([...response.groups]);
      setHasFetched(true);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load groups";
      setError(message);
      setHasFetched(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createGroup = useCallback(
    async (input: CreateGroupInput): Promise<CommunityGroup> => {
      const token = await getTokenRef.current();
      const response = await apiFetch<{ group: CommunityGroup }>(
        "/api/community/groups",
        { method: "POST", token, body: input },
      );
      await refresh();
      return response.group;
    },
    [refresh],
  );

  const joinGroup = useCallback(
    async (joinCode: string, displayName: string): Promise<CommunityGroup> => {
      const token = await getTokenRef.current();
      const response = await apiFetch<{ group: CommunityGroup }>(
        "/api/community/groups/join",
        {
          method: "POST",
          token,
          body: { joinCode, displayName },
        },
      );
      await refresh();
      return response.group;
    },
    [refresh],
  );

  return {
    groups,
    isLoading,
    hasFetched,
    error,
    refresh,
    createGroup,
    joinGroup,
  };
}
