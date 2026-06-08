import { apiFetch } from "@/lib/api-client";
import { isSameDay, toDateKey } from "@/lib/calendar/date-utils";
import { useCalendarSessionsStore } from "@/store/calendar-sessions-store";
import type { CalendarSession, SessionDetail } from "@/types/calendar";
import { isStale } from "@/types/async-resource";
import { useAuth } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";

type SessionDetailResponse = SessionDetail &
  Readonly<{
    message?: string;
  }>;

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

  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(
    null,
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

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

  const openSessionDetail = useCallback(async (sessionId: string): Promise<void> => {
    setDetailSessionId(sessionId);
    setSessionDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);

    try {
      const token = await getTokenRef.current();
      const response = await apiFetch<SessionDetailResponse>(
        `/api/sessions?sessionId=${encodeURIComponent(sessionId)}`,
        { token },
      );

      setSessionDetail({
        session: response.session,
        report: response.report,
        transcriptPreview: response.transcriptPreview,
      });
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load session details";
      setDetailError(message);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const closeSessionDetail = useCallback((): void => {
    setDetailSessionId(null);
    setSessionDetail(null);
    setDetailError(null);
    setIsDetailLoading(false);
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
