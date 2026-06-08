import type { ChatConversationSummary } from "@/types/chat";
import { create } from "zustand";

type ChatHistoryState = {
  conversations: ChatConversationSummary[];
  setConversations: (conversations: ChatConversationSummary[]) => void;
  removeConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, title: string) => void;
  touchConversation: (
    conversationId: string,
    preview: string,
    messageCountDelta?: number,
  ) => void;
};

export const useChatHistoryStore = create<ChatHistoryState>()((set) => ({
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  removeConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter(
        (item) => item.conversationId !== conversationId,
      ),
    })),
  renameConversation: (conversationId, title) =>
    set((state) => ({
      conversations: state.conversations.map((item) =>
        item.conversationId === conversationId ? { ...item, title } : item,
      ),
    })),
  touchConversation: (conversationId, preview, messageCountDelta = 2) =>
    set((state) => {
      const existing = state.conversations.find(
        (item) => item.conversationId === conversationId,
      );

      if (!existing) {
        return state;
      }

      return {
        conversations: state.conversations.map((item) =>
          item.conversationId === conversationId
            ? {
                ...item,
                preview,
                messageCount: item.messageCount + messageCountDelta,
              }
            : item,
        ),
      };
    }),
}));
