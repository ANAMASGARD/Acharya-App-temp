import { buildAgentTools } from "@/lib/agent/tools";
import { getChatAgentModel } from "@/lib/agent/provider";
import { type ModelMessage, stepCountIs, streamText } from "ai";

/**
 * Run the Chat Acharya agent: a tool-calling loop (curriculum search, teacher
 * memory/history, live web search + page reading) that streams the final reply
 * text. Text deltas are forwarded via onDelta so the existing NDJSON chat route
 * contract is unchanged. Returns the full assistant message.
 */
export async function runChatAgent(input: {
  system: string;
  messages: readonly ModelMessage[];
  clerkId: string;
  onDelta: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const result = streamText({
    model: getChatAgentModel(),
    system: input.system,
    messages: [...input.messages],
    tools: buildAgentTools({ clerkId: input.clerkId }),
    stopWhen: stepCountIs(5),
    abortSignal: input.signal,
  });

  let full = "";

  for await (const delta of result.textStream) {
    full += delta;
    input.onDelta(delta);
  }

  return full;
}
