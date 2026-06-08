import { formatTimeAgo } from "@/lib/community/time-ago";
import { useDashboardStore } from "@/store/dashboard-store";
import type { DashboardResponse } from "@/types/community";
import type { RecentActivityItem } from "@/types/home-dashboard";
import { isStale } from "@/types/async-resource";
import { useAuth } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

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

  const dashboard = useDashboardStore((state) => state.dashboard);
  const status = useDashboardStore((state) => state.status);
  const error = useDashboardStore((state) => state.error);
  const lastFetchedAt = useDashboardStore((state) => state.lastFetchedAt);
  const fetchDashboard = useDashboardStore((state) => state.fetch);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchDashboard(() => getTokenRef.current(), { force: true });
  }, [fetchDashboard]);

  useFocusEffect(
    useCallback(() => {
      if (isStale(lastFetchedAt)) {
        void fetchDashboard(() => getTokenRef.current(), { silent: true });
      }
    }, [fetchDashboard, lastFetchedAt]),
  );

  return {
    dashboard,
    recentActivity: mapActivityItems(dashboard),
    isLoading: status === "loading" && dashboard === null,
    hasFetched: status !== "idle",
    error,
    refresh,
  };
}
