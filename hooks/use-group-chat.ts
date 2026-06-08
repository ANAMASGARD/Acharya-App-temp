import { apiFetch } from "@/lib/api-client";
import type { CreateGroupMessageInput, GroupMessage } from "@/types/community";
import { useAuth } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

type MessagesResponse = Readonly<{
  messages: readonly GroupMessage[];
}>;

type UseGroupChatResult = Readonly<{
  messages: readonly GroupMessage[];
  isLoading: boolean;
  hasFetched: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  sendMessage: (input: CreateGroupMessageInput) => Promise<void>;
}>;

const POLL_INTERVAL_MS = 5000;

export function useGroupChat(groupId: string): UseGroupChatResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (!groupId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getTokenRef.current();
      const response = await apiFetch<MessagesResponse>(
        `/api/community/groups/${groupId}/messages`,
        { token },
      );
      setMessages([...response.messages]);
      setHasFetched(true);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load messages";
      setError(message);
      setHasFetched(true);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      void refresh();

      return () => {
        setIsFocused(false);
      };
    }, [refresh]),
  );

  useEffect(() => {
    if (!isFocused || !groupId) {
      return;
    }

    const interval = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [groupId, isFocused, refresh]);

  const sendMessage = useCallback(
    async (input: CreateGroupMessageInput): Promise<void> => {
      const token = await getTokenRef.current();
      await apiFetch(`/api/community/groups/${groupId}/messages`, {
        method: "POST",
        token,
        body: input,
      });
      await refresh();
    },
    [groupId, refresh],
  );

  return {
    messages,
    isLoading,
    hasFetched,
    error,
    refresh,
    sendMessage,
  };
}
