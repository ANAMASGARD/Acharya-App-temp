import { apiFetch } from "@/lib/api-client";
import type { ChatConversationSummary } from "@/types/chat";
import { useAuth } from "@clerk/expo";
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
}>;

export function useChatHistory(): UseChatHistoryResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversationSummary[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getTokenRef.current();
      const response = await apiFetch<ConversationListResponse>(
        "/api/chat/conversations?list=1",
        { token },
      );
      setConversations(response.conversations);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load chat history";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openDrawer = useCallback(async (): Promise<void> => {
    setIsOpen(true);
    await loadConversations();
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
        setConversations((current) =>
          current.filter((item) => item.conversationId !== conversationId),
        );
      } catch (deleteError) {
        const message =
          deleteError instanceof Error
            ? deleteError.message
            : "Failed to delete chat";
        setError(message);
      }
    },
    [],
  );

  return {
    isOpen,
    conversations,
    isLoading,
    error,
    openDrawer,
    closeDrawer,
    deleteConversation,
  };
}
