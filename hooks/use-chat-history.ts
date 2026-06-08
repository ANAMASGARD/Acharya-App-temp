import { apiFetch } from "@/lib/api-client";
import { useChatHistoryStore } from "@/store/chat-history-store";
import type { ChatConversationSummary } from "@/types/chat";
import { useAuth } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

type ConversationListResponse = Readonly<{
  conversations: ChatConversationSummary[];
}>;

type UseChatHistoryResult = Readonly<{
  isOpen: boolean;
  conversations: ChatConversationSummary[];
  isLoading: boolean;
  error: string | null;
  openDrawer: () => Promise<void>;
  closeDrawer: () => void;
  deleteConversation: (conversationId: string) => Promise<void>;
  renameConversation: (conversationId: string, title: string) => Promise<void>;
}>;

export function useChatHistory(): UseChatHistoryResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversations = useChatHistoryStore((state) => state.conversations);
  const setConversations = useChatHistoryStore((state) => state.setConversations);
  const removeConversation = useChatHistoryStore(
    (state) => state.removeConversation,
  );
  const renameConversationInStore = useChatHistoryStore(
    (state) => state.renameConversation,
  );

  const loadConversations = useCallback(
    async (options?: Readonly<{ silent?: boolean }>): Promise<void> => {
      const hasCachedList = useChatHistoryStore.getState().conversations.length > 0;

      if (!options?.silent || !hasCachedList) {
        setIsLoading(!hasCachedList);
      }

      setError(null);

      try {
        const token = await getTokenRef.current();
        const response = await apiFetch<ConversationListResponse>(
          "/api/chat/conversations?list=1",
          { token },
        );
        setConversations(response.conversations);
      } catch (fetchError) {
        if (!hasCachedList) {
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load chat history";
          setError(message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [setConversations],
  );

  useFocusEffect(
    useCallback(() => {
      void loadConversations({ silent: true });
    }, [loadConversations]),
  );

  const openDrawer = useCallback(async (): Promise<void> => {
    setIsOpen(true);
    await loadConversations({ silent: true });
  }, [loadConversations]);

  const closeDrawer = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const deleteConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      try {
        const token = await getTokenRef.current();
        await apiFetch<{ ok: boolean }>(
          `/api/chat/conversations?conversationId=${encodeURIComponent(conversationId)}`,
          {
            method: "DELETE",
            token,
          },
        );
        removeConversation(conversationId);
      } catch (deleteError) {
        const message =
          deleteError instanceof Error
            ? deleteError.message
            : "Failed to delete chat";
        setError(message);
      }
    },
    [removeConversation],
  );

  const renameConversation = useCallback(
    async (conversationId: string, title: string): Promise<void> => {
      const token = await getTokenRef.current();
      const response = await apiFetch<{ ok: boolean; title: string }>(
        "/api/chat/conversations",
        {
          method: "PATCH",
          token,
          body: { conversationId, title },
        },
      );
      renameConversationInStore(conversationId, response.title);
    },
    [renameConversationInStore],
  );

  return {
    isOpen,
    conversations,
    isLoading,
    error,
    openDrawer,
    closeDrawer,
    deleteConversation,
    renameConversation,
  };
}
