import { isSameDay, toDateKey } from "@/lib/calendar/date-utils";
import { useCalendarSessionDetailStore } from "@/store/calendar-session-detail-store";
import { useCalendarSessionsStore } from "@/store/calendar-sessions-store";
import type { CalendarSession, SessionDetail } from "@/types/calendar";
import { isStale } from "@/types/async-resource";
import { useAuth } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseCalendarSessionsResult = Readonly<{
  sessions: CalendarSession[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  sessionsForSelectedDate: CalendarSession[];
  markedDateKeys: ReadonlySet<string>;
  hasFetched: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  detailSessionId: string | null;
  sessionDetail: SessionDetail | null;
  isDetailLoading: boolean;
  detailError: string | null;
  openSessionDetail: (sessionId: string) => Promise<void>;
  closeSessionDetail: () => void;
}>;

export function useCalendarSessions(): UseCalendarSessionsResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const sessions = useCalendarSessionsStore((state) => state.sessions);
  const status = useCalendarSessionsStore((state) => state.status);
  const error = useCalendarSessionsStore((state) => state.error);
  const lastFetchedAt = useCalendarSessionsStore((state) => state.lastFetchedAt);
  const fetchSessions = useCalendarSessionsStore((state) => state.fetch);

  const fetchDetail = useCalendarSessionDetailStore((state) => state.fetchDetail);
  const prefetchDetails = useCalendarSessionDetailStore(
    (state) => state.prefetchDetails,
  );

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);

  const detailEntry = useCalendarSessionDetailStore((state) =>
    detailSessionId ? (state.entries[detailSessionId] ?? null) : null,
  );

  const sessionDetail = detailEntry?.detail ?? null;
  const detailError = detailEntry?.error ?? null;
  const isDetailLoading =
    detailSessionId !== null &&
    detailEntry?.status === "loading" &&
    sessionDetail === null;

  const refresh = useCallback(async (): Promise<void> => {
    await fetchSessions(() => getTokenRef.current(), { force: true });
  }, [fetchSessions]);

  useFocusEffect(
    useCallback(() => {
      if (isStale(lastFetchedAt)) {
        void fetchSessions(() => getTokenRef.current(), { silent: true });
      }
    }, [fetchSessions, lastFetchedAt]),
  );

  const markedDateKeys = useMemo(() => {
    const keys = new Set<string>();

    for (const session of sessions) {
      const recorded = new Date(session.recordedAt);
      if (!Number.isNaN(recorded.getTime())) {
        keys.add(toDateKey(recorded));
      }
    }

    return keys;
  }, [sessions]);

  const sessionsForSelectedDate = useMemo(() => {
    return sessions
      .filter((session) => {
        const recorded = new Date(session.recordedAt);
        return (
          !Number.isNaN(recorded.getTime()) &&
          isSameDay(recorded, selectedDate)
        );
      })
      .sort(
        (a, b) =>
          new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
      );
  }, [sessions, selectedDate]);

  useEffect(() => {
    if (sessionsForSelectedDate.length === 0) {
      return;
    }

    void prefetchDetails(
      () => getTokenRef.current(),
      sessionsForSelectedDate.map((session) => session.sessionId),
      { silent: true },
    );
  }, [prefetchDetails, sessionsForSelectedDate]);

  const openSessionDetail = useCallback(
    async (sessionId: string): Promise<void> => {
      setDetailSessionId(sessionId);

      const cached = useCalendarSessionDetailStore.getState().getDetail(sessionId);
      const hasCachedDetail = cached?.detail !== null;

      await fetchDetail(() => getTokenRef.current(), sessionId, {
        silent: hasCachedDetail,
        force: !hasCachedDetail,
      });
    },
    [fetchDetail],
  );

  const closeSessionDetail = useCallback((): void => {
    setDetailSessionId(null);
  }, []);

  return {
    sessions,
    selectedDate,
    setSelectedDate,
    sessionsForSelectedDate,
    markedDateKeys,
    hasFetched: status !== "idle",
    error,
    refresh,
    detailSessionId,
    sessionDetail,
    isDetailLoading,
    detailError,
    openSessionDetail,
    closeSessionDetail,
  };
}
