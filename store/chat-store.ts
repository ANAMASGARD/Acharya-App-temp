import { preferencesPersistStorage } from "@/lib/preferences-persist-storage";
import type { ChatMessage } from "@/types/chat";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const CHAT_CONVERSATION_PERSIST_KEY = "acharya-chat-conversation-id";

type ChatState = {
  conversationId: string | null;
  messages: ChatMessage[];
  draftText: string;
  isLoadingHistory: boolean;
  isStreaming: boolean;
  error: string | null;
  setConversationId: (conversationId: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
  updateMessageContent: (messageId: string, content: string) => void;
  setDraftText: (value: string) => void;
  setIsLoadingHistory: (value: boolean) => void;
  setIsStreaming: (value: boolean) => void;
  setError: (value: string | null) => void;
  resetConversation: () => void;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      conversationId: null,
      messages: [],
      draftText: "",
      isLoadingHistory: false,
      isStreaming: false,
      error: null,
      setConversationId: (conversationId) => set({ conversationId }),
      setMessages: (messages) => set({ messages }),
      appendMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      updateMessageContent: (messageId, content) =>
        set((state) => ({
          messages: state.messages.map((message) =>
            message.messageId === messageId
              ? { ...message, content }
              : message,
          ),
        })),
      setDraftText: (draftText) => set({ draftText }),
      setIsLoadingHistory: (isLoadingHistory) => set({ isLoadingHistory }),
      setIsStreaming: (isStreaming) => set({ isStreaming }),
      setError: (error) => set({ error }),
      resetConversation: () =>
        set({
          conversationId: null,
          messages: [],
          draftText: "",
          error: null,
          isStreaming: false,
        }),
    }),
    {
      name: CHAT_CONVERSATION_PERSIST_KEY,
      storage: createJSONStorage(() => preferencesPersistStorage),
      partialize: (state) => ({
        conversationId: state.conversationId,
      }),
    },
  ),
);
