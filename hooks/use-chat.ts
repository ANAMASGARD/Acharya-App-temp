import { apiFetch } from "@/lib/api-client";
import { streamChatMessage } from "@/lib/chat-stream";
import { useChatStore } from "@/store/chat-store";
import type { ChatConversation, ChatMessage } from "@/types/chat";
import { useAuth } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

type ConversationResponse = Readonly<{
  conversation: ChatConversation | null;
  messages: ChatMessage[];
}>;

type UseChatResult = Readonly<{
  messages: ChatMessage[];
  draftText: string;
  isLoadingHistory: boolean;
  isStreaming: boolean;
  error: string | null;
  hasMessages: boolean;
  setDraftText: (value: string) => void;
  sendMessage: (text: string) => Promise<void>;
  retryLast: () => Promise<void>;
  startNewChat: () => Promise<void>;
  openConversation: (conversationId: string) => Promise<void>;
}>;

export function useChat(): UseChatResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const abortRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  const messages = useChatStore((state) => state.messages);
  const draftText = useChatStore((state) => state.draftText);
  const isLoadingHistory = useChatStore((state) => state.isLoadingHistory);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const error = useChatStore((state) => state.error);
  const conversationId = useChatStore((state) => state.conversationId);
  const setDraftText = useChatStore((state) => state.setDraftText);

  conversationIdRef.current = conversationId;

  const loadConversation = useCallback(async (): Promise<void> => {
    if (useChatStore.getState().isStreaming) {
      return;
    }

    useChatStore.getState().setIsLoadingHistory(true);
    useChatStore.getState().setError(null);

    try {
      const token = await getTokenRef.current();
      const activeConversationId = conversationIdRef.current;
      const query = activeConversationId
        ? `?conversationId=${encodeURIComponent(activeConversationId)}`
        : "";
      const response = await apiFetch<ConversationResponse>(
        `/api/chat/conversations${query}`,
        { token },
      );

      if (useChatStore.getState().isStreaming) {
        return;
      }

      if (response.conversation) {
        useChatStore
          .getState()
          .setConversationId(response.conversation.conversationId);
        conversationIdRef.current = response.conversation.conversationId;
      }

      useChatStore.getState().setMessages(response.messages);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load chat history";
      useChatStore.getState().setError(message);
    } finally {
      useChatStore.getState().setIsLoadingHistory(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadConversation();

      return () => {
        abortRef.current?.abort();
        abortRef.current = null;
        useChatStore.getState().setIsStreaming(false);
      };
    }, [loadConversation]),
  );

  const sendMessage = useCallback(async (rawText: string): Promise<void> => {
    const text = rawText.trim();

    if (!text || useChatStore.getState().isStreaming) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastUserMessageRef.current = text;

    const optimisticUserId = `local-user-${Date.now()}`;
    const optimisticAssistantId = `local-assistant-${Date.now()}`;
    const createdAt = new Date().toISOString();

    useChatStore.getState().setError(null);
    useChatStore.getState().setDraftText("");
    useChatStore.getState().setIsStreaming(true);
    useChatStore.getState().appendMessage({
      messageId: optimisticUserId,
      role: "user",
      content: text,
      createdAt,
    });
    useChatStore.getState().appendMessage({
      messageId: optimisticAssistantId,
      role: "assistant",
      content: "",
      createdAt,
    });

    try {
      const token = await getTokenRef.current();

      if (!token) {
        throw new Error("Not authenticated");
      }

      let assistantContent = "";

      await streamChatMessage({
        token,
        conversationId: useChatStore.getState().conversationId,
        message: text,
        signal: controller.signal,
        onDelta: (chunk) => {
          assistantContent += chunk;
          useChatStore
            .getState()
            .updateMessageContent(optimisticAssistantId, assistantContent);
        },
        onDone: (event) => {
          useChatStore.getState().setConversationId(event.conversationId);
          conversationIdRef.current = event.conversationId;

          const currentMessages = useChatStore.getState().messages.map((message) => {
            if (message.messageId === optimisticUserId) {
              return { ...message, messageId: event.userMessageId };
            }

            if (message.messageId === optimisticAssistantId) {
              return {
                ...message,
                messageId: event.messageId,
                content: assistantContent,
              };
            }

            return message;
          });

          useChatStore.getState().setMessages(currentMessages);
        },
        onError: (message) => {
          if (controller.signal.aborted) {
            return;
          }

          useChatStore.getState().setError(message);
          useChatStore.setState((state) => ({
            messages: state.messages.filter(
              (message) =>
                message.messageId !== optimisticUserId &&
                message.messageId !== optimisticAssistantId,
            ),
          }));
        },
      });
    } catch (sendError) {
      if (!controller.signal.aborted) {
        const message =
          sendError instanceof Error ? sendError.message : "Failed to send message";
        useChatStore.getState().setError(message);
        useChatStore.setState((state) => ({
          messages: state.messages.filter(
            (message) =>
              message.messageId !== optimisticUserId &&
              message.messageId !== optimisticAssistantId,
          ),
        }));
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }

      useChatStore.getState().setIsStreaming(false);
    }
  }, []);

  const retryLast = useCallback(async (): Promise<void> => {
    const lastMessage = lastUserMessageRef.current;

    if (!lastMessage) {
      return;
    }

    await sendMessage(lastMessage);
  }, [sendMessage]);

  const openConversation = useCallback(async (id: string): Promise<void> => {
    if (useChatStore.getState().isStreaming) {
      return;
    }

    abortRef.current?.abort();
    abortRef.current = null;

    useChatStore.getState().setConversationId(id);
    conversationIdRef.current = id;
    useChatStore.getState().setIsLoadingHistory(true);
    useChatStore.getState().setError(null);

    try {
      const token = await getTokenRef.current();
      const response = await apiFetch<ConversationResponse>(
        `/api/chat/conversations?conversationId=${encodeURIComponent(id)}`,
        { token },
      );

      if (response.conversation) {
        useChatStore
          .getState()
          .setConversationId(response.conversation.conversationId);
        conversationIdRef.current = response.conversation.conversationId;
      }

      useChatStore.getState().setMessages(response.messages);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to open conversation";
      useChatStore.getState().setError(message);
    } finally {
      useChatStore.getState().setIsLoadingHistory(false);
    }
  }, []);

  const startNewChat = useCallback(async (): Promise<void> => {
    abortRef.current?.abort();
    abortRef.current = null;
    useChatStore.getState().resetConversation();

    try {
      const token = await getTokenRef.current();
      const response = await apiFetch<ConversationResponse>(
        "/api/chat/conversations",
        {
          method: "POST",
          token,
          body: {},
        },
      );

      if (response.conversation) {
        useChatStore
          .getState()
          .setConversationId(response.conversation.conversationId);
        conversationIdRef.current = response.conversation.conversationId;
      }
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Failed to start a new chat";
      useChatStore.getState().setError(message);
    }
  }, []);

  return {
    messages,
    draftText,
    isLoadingHistory,
    isStreaming,
    error,
    hasMessages: messages.length > 0,
    setDraftText,
    sendMessage,
    retryLast,
    startNewChat,
    openConversation,
  };
}
