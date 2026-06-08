import { preferencesPersistStorage } from "@/lib/preferences-persist-storage";
import type { ChatMessage, ChatReplyPhase } from "@/types/chat";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const CHAT_CONVERSATION_PERSIST_KEY = "acharya-chat-conversation-id";

type MessageCache = Readonly<Record<string, ChatMessage[]>>;

type ChatState = {
  conversationId: string | null;
  messages: ChatMessage[];
  messageCache: MessageCache;
  draftText: string;
  isLoadingHistory: boolean;
  isStreaming: boolean;
  replyPhase: ChatReplyPhase;
  error: string | null;
  setConversationId: (conversationId: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
  updateMessageContent: (messageId: string, content: string) => void;
  setDraftText: (value: string) => void;
  setIsLoadingHistory: (value: boolean) => void;
  setIsStreaming: (value: boolean) => void;
  setReplyPhase: (phase: ChatReplyPhase) => void;
  setError: (value: string | null) => void;
  resetConversation: () => void;
  hydrateConversationFromCache: (conversationId: string) => boolean;
};

function withMessageCache(
  state: ChatState,
  conversationId: string | null,
  messages: ChatMessage[],
): Pick<ChatState, "messages" | "messageCache"> {
  if (!conversationId) {
    return { messages, messageCache: state.messageCache };
  }

  return {
    messages,
    messageCache: {
      ...state.messageCache,
      [conversationId]: messages,
    },
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversationId: null,
      messages: [],
      messageCache: {},
      draftText: "",
      isLoadingHistory: false,
      isStreaming: false,
      replyPhase: "idle",
      error: null,
      setConversationId: (conversationId) => set({ conversationId }),
      setMessages: (messages) =>
        set((state) =>
          withMessageCache(state, state.conversationId, messages),
        ),
      appendMessage: (message) =>
        set((state) => {
          const messages = [...state.messages, message];
          return withMessageCache(state, state.conversationId, messages);
        }),
      updateMessageContent: (messageId, content) =>
        set((state) => {
          const messages = state.messages.map((message) =>
            message.messageId === messageId
              ? { ...message, content }
              : message,
          );
          return withMessageCache(state, state.conversationId, messages);
        }),
      setDraftText: (draftText) => set({ draftText }),
      setIsLoadingHistory: (isLoadingHistory) => set({ isLoadingHistory }),
      setIsStreaming: (isStreaming) => set({ isStreaming }),
      setReplyPhase: (replyPhase) => set({ replyPhase }),
      setError: (error) => set({ error }),
      resetConversation: () =>
        set({
          conversationId: null,
          messages: [],
          draftText: "",
          error: null,
          isStreaming: false,
          replyPhase: "idle",
        }),
      hydrateConversationFromCache: (conversationId) => {
        const cached = get().messageCache[conversationId];

        if (!cached || cached.length === 0) {
          return false;
        }

        set({
          conversationId,
          messages: cached,
        });
        return true;
      },
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
