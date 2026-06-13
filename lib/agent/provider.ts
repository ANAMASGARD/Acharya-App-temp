import { getOpenRouterChatboxConfig } from "@/lib/ai-config";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

/**
 * Vercel AI SDK language model for the Chat Acharya agent, backed by OpenRouter
 * (OPENROUTER_CHATBOX_MODEL). Server-side only — the API key never leaves here.
 */
export function getChatAgentModel(): LanguageModel {
  const { apiKey, model } = getOpenRouterChatboxConfig();
  const openrouter = createOpenRouter({ apiKey });
  return openrouter.chat(model);
}
