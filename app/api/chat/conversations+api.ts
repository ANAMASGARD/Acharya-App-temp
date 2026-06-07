import { requireAuth } from "@/lib/api-auth";
import {
  createConversation,
  deleteConversationForTeacher,
  getConversationForTeacher,
  getLatestConversationForTeacher,
  listConversationsForTeacher,
  listMessages,
} from "@/lib/graph/chat";

export async function GET(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const url = new URL(request.url);

    if (url.searchParams.get("list") === "1") {
      const conversations = await listConversationsForTeacher(userId);
      return Response.json({ conversations });
    }

    const conversationId = url.searchParams.get("conversationId");

    const conversation = conversationId?.trim()
      ? await getConversationForTeacher(userId, conversationId.trim())
      : await getLatestConversationForTeacher(userId);

    if (!conversation) {
      return Response.json({
        conversation: null,
        messages: [],
      });
    }

    const messages = await listMessages(
      userId,
      conversation.conversationId,
      50,
    );

    return Response.json({
      conversation,
      messages,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load conversation";
    const status = message.includes("Authorization") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId")?.trim();

    if (!conversationId) {
      return Response.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    const deleted = await deleteConversationForTeacher(userId, conversationId);

    if (!deleted) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete conversation";
    const status = message.includes("Authorization") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const conversation = await createConversation(userId);

    return Response.json({
      conversation,
      messages: [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create conversation";
    const status = message.includes("Authorization") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
