import { useCalendarSessionsStore } from "@/store/calendar-sessions-store";
import { useChatHistoryStore } from "@/store/chat-history-store";
import { useChatStore } from "@/store/chat-store";
import { useCommunityFeedStore } from "@/store/community-feed-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { useAuth } from "@clerk/expo";
import { useEffect, useRef } from "react";

const HOME_FEED_LIMIT = 2;

function resetAllTabStores(): void {
  useDashboardStore.getState().reset();
  useCalendarSessionsStore.getState().reset();
  useCommunityFeedStore.getState().reset();
  useChatHistoryStore.getState().reset();
  useChatStore.getState().resetTabData();
}

export function useTabBootstrap(): void {
  const { isSignedIn, getToken } = useAuth();
  const warmedRef = useRef(false);
  const wasSignedInRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn) {
      if (wasSignedInRef.current) {
        resetAllTabStores();
      }

      warmedRef.current = false;
      wasSignedInRef.current = false;
      return;
    }

    wasSignedInRef.current = true;

    if (warmedRef.current) {
      return;
    }

    warmedRef.current = true;

    const getTokenRef = (): Promise<string | null> => getToken();

    void Promise.allSettled([
      useDashboardStore.getState().fetch(getTokenRef),
      useCalendarSessionsStore.getState().fetch(getTokenRef),
      useChatHistoryStore.getState().fetchConversations(getTokenRef),
      useChatStore.getState().fetchActiveConversation(getTokenRef),
      useCommunityFeedStore.getState().fetch(getTokenRef, {
        limit: HOME_FEED_LIMIT,
      }),
    ]);
  }, [getToken, isSignedIn]);
}
