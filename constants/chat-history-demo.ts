import type { ChatConversationSummary } from "@/types/chat";

export const DEMO_CHAT_HISTORY: ChatConversationSummary[] = [
  {
    conversationId: "demo-teacher-support",
    createdAt: new Date().toISOString(),
    title: "Teacher Support Chat",
    preview: "How can I improve classroom engagement?",
    messageCount: 0,
    isDemo: true,
  },
];
