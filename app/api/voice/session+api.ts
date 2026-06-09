import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { AiConfigError } from "@/lib/ai-config";
import { createVoiceSession } from "@/lib/voice/session-token";

import type { VoiceTransportKind } from "@/types/voice";

type SessionBody = Readonly<{
  conversationId?: string;
  transport?: VoiceTransportKind;
}>;

function getLocalGatewayWssUrl(request: Request): string {
  const requestUrl = new URL(request.url);
  return `ws://${requestUrl.hostname}:8080/voice`;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const body = (await request.json().catch(() => ({}))) as SessionBody;
    const transport = body.transport === "livekit" ? "livekit" : "websocket";
    const session = await createVoiceSession(
      userId,
      body.conversationId,
      transport,
      transport === "websocket" ? getLocalGatewayWssUrl(request) : undefined,
    );

    return Response.json(session);
  } catch (error) {
    if (error instanceof AiConfigError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    return authErrorResponse(error);
  }
}
