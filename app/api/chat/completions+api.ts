import { requireAuth } from "@/lib/api-auth";
import { buildChatSystemContent } from "@/lib/prompts/chat-coach";
import {
  appendMessage,
  getOrCreateConversation,
  listMessages,
} from "@/lib/graph/chat";
import {
  getOpenRouterMappedError,
  streamChatCompletion,
  type OpenRouterChatMessage,
} from "@/lib/openrouter";

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
    const openRouterMessages: OpenRouterChatMessage[] = [
      {
        role: "system",
        content: buildChatSystemContent(conversation.contextSnapshot),
      },
      ...history
        .filter((entry) => entry.role === "user" || entry.role === "assistant")
        .map((entry) => ({
          role: entry.role as "user" | "assistant",
          content: entry.content,
        })),
    ];

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
      accumulated = await streamChatCompletion({
        messages: openRouterMessages,
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
