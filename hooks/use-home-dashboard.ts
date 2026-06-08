import { apiFetch } from "@/lib/api-client";
import { formatTimeAgo } from "@/lib/community/time-ago";
import type { DashboardResponse } from "@/types/community";
import type { RecentActivityItem } from "@/types/home-dashboard";
import { useAuth } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

type UseHomeDashboardResult = Readonly<{
  dashboard: DashboardResponse | null;
  recentActivity: readonly RecentActivityItem[];
  isLoading: boolean;
  hasFetched: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}>;

function mapActivityItems(
  dashboard: DashboardResponse | null,
): RecentActivityItem[] {
  if (!dashboard) {
    return [];
  }

  return dashboard.recentActivity.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    timeAgo: formatTimeAgo(item.occurredAt),
    avatarKind: item.kind === "session" ? "letter" : "icon",
    avatarLetter: item.title.charAt(0).toUpperCase(),
    deepLink: item.deepLink,
  }));
}

export function useHomeDashboard(): UseHomeDashboardResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getTokenRef.current();
      const response = await apiFetch<DashboardResponse>(
        "/api/dashboard?activityLimit=2",
        { token },
      );
      setDashboard(response);
      setHasFetched(true);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load dashboard";
      setError(message);
      setHasFetched(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    dashboard,
    recentActivity: mapActivityItems(dashboard),
    isLoading,
    hasFetched,
    error,
    refresh,
  };
}
