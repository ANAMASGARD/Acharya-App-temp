import { syncVoiceTranscriptBatch } from "@/lib/graph/voice-session";
import { VOICE_WEBHOOK_HEADER } from "@/lib/voice/constants";
import { requireVoiceSecrets } from "@/lib/voice/config";
import type { VoiceTranscriptBatchBody, VoiceTranscriptMessage } from "@/types/voice";

function isTranscriptMessage(value: unknown): value is VoiceTranscriptMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    (record.role === "user" || record.role === "assistant") &&
    typeof record.content === "string"
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const secrets = requireVoiceSecrets();
    const secret = request.headers.get(VOICE_WEBHOOK_HEADER);

    if (!secret || secret !== secrets.agentWebhookSecret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<VoiceTranscriptBatchBody>;

    if (
      typeof body.voiceSessionId !== "string" ||
      typeof body.conversationId !== "string" ||
      typeof body.clerkId !== "string" ||
      !Array.isArray(body.messages)
    ) {
      return Response.json({ error: "Invalid transcript batch" }, { status: 422 });
    }

    const messages = body.messages.filter(isTranscriptMessage);

    const result = await syncVoiceTranscriptBatch({
      voiceSessionId: body.voiceSessionId,
      conversationId: body.conversationId,
      clerkId: body.clerkId,
      messages,
    });

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcript sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
