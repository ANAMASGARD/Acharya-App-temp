import { isRagDebugEnabled } from "@/lib/ai-config";
import { requireAuth } from "@/lib/api-auth";
import { runChatAgent } from "@/lib/agent/run-chat-agent";
import { AGENT_TOOLS_GUIDANCE, buildChatSystemContent } from "@/lib/prompts/chat-coach";
import {
  appendMessage,
  getOrCreateConversation,
  listMessages,
} from "@/lib/graph/chat";
import {
  extractAndStoreMemories,
  formatMemoriesForPrompt,
  recallMemories,
} from "@/lib/graph/memory";
import { getOpenRouterMappedError } from "@/lib/openrouter";
import type { ModelMessage } from "ai";

type CompletionsBody = Readonly<{
  conversationId?: string;
  message?: string;
}>;

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const body = (await request.json()) as CompletionsBody;
    const message = body.message?.trim() ?? "";

    if (!message) {
      return Response.json({ error: "Message cannot be empty" }, { status: 422 });
    }

    const conversation = await getOrCreateConversation(
      userId,
      body.conversationId,
    );

    const userMessage = await appendMessage(
      userId,
      conversation.conversationId,
      "user",
      message,
    );

    const history = await listMessages(userId, conversation.conversationId, 50);

    // Recall durable long-term memory for this teacher (best-effort).
    const memories = await recallMemories(userId, message, 6).catch((error) => {
      if (isRagDebugEnabled()) {
        console.warn("[memory] recall failed:", error);
      }
      return [];
    });

    const systemContent = `${buildChatSystemContent(
      conversation.contextSnapshot,
      formatMemoriesForPrompt(memories),
    )}\n\n${AGENT_TOOLS_GUIDANCE}`;

    const agentMessages: ModelMessage[] = history
      .filter((entry) => entry.role === "user" || entry.role === "assistant")
      .map((entry) => ({
        role: entry.role as "user" | "assistant",
        content: entry.content,
      }));

    const upstreamAbort = new AbortController();

    if (request.signal.aborted) {
      upstreamAbort.abort();
    } else {
      request.signal.addEventListener(
        "abort",
        () => {
          upstreamAbort.abort();
        },
        { once: true },
      );
    }

    const ndjsonLines: string[] = [];
    let accumulated = "";

    try {
      accumulated = await runChatAgent({
        system: systemContent,
        messages: agentMessages,
        clerkId: userId,
        onDelta: (chunk) => {
          ndjsonLines.push(JSON.stringify({ type: "delta", content: chunk }));
        },
        signal: upstreamAbort.signal,
      });

      if (upstreamAbort.signal.aborted) {
        return new Response("", { status: 499 });
      }

      const assistantMessage = await appendMessage(
        userId,
        conversation.conversationId,
        "assistant",
        accumulated,
      );

      // Extract durable memory from this exchange. Best-effort and off the
      // response path — this runs on a long-lived Node server, so we do not
      // await it (and swallow failures) to avoid adding latency to the reply.
      void extractAndStoreMemories({
        clerkId: userId,
        conversationId: conversation.conversationId,
        userMessage: message,
        assistantMessage: accumulated,
      }).catch((error) => {
        if (isRagDebugEnabled()) {
          console.warn("[memory] extract failed:", error);
        }
      });

      ndjsonLines.push(
        JSON.stringify({
          type: "done",
          conversationId: conversation.conversationId,
          messageId: assistantMessage.messageId,
          userMessageId: userMessage.messageId,
        }),
      );
    } catch (error) {
      if (isAbortError(error) || upstreamAbort.signal.aborted) {
        return new Response("", { status: 499 });
      }

      const mapped = getOpenRouterMappedError(error);
      return Response.json({ error: mapped.userMessage }, { status: mapped.httpStatus });
    }

    return new Response(`${ndjsonLines.join("\n")}\n`, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    const status = message.includes("Authorization") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
