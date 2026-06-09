import { VOICE_SESSION_TOKEN_TTL_SEC } from "@/lib/voice/constants";
import {
  getVoiceConfig,
  requireVoiceConfig,
  requireVoiceSecrets,
} from "@/lib/voice/config";
import { createLiveKitVoiceRoom } from "@/lib/voice/livekit-token";
import { getOrCreateConversation } from "@/lib/graph/chat";
import type { VoiceSessionResponse, VoiceTransportKind } from "@/types/voice";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

type SessionClaims = Readonly<{
  voiceSessionId: string;
  conversationId: string;
  clerkId: string;
  exp: number;
}>;

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64url")
    .replace(/=+$/u, "");
}

function base64UrlDecode(value: string): string {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded, "base64url").toString("utf8");
}

function signSegment(segment: string, secret: string): string {
  return createHmac("sha256", secret).update(segment).digest("base64url");
}

export function mintVoiceSessionToken(
  claims: Omit<SessionClaims, "exp">,
  secret: string,
  ttlSec = VOICE_SESSION_TOKEN_TTL_SEC,
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      ...claims,
      exp: Math.floor(Date.now() / 1000) + ttlSec,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signature = signSegment(unsigned, secret);
  return `${unsigned}.${signature}`;
}

export function verifyVoiceSessionToken(
  token: string,
  secret: string,
): SessionClaims | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts;
  const unsigned = `${header}.${payload}`;
  const expected = signSegment(unsigned, secret);

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as SessionClaims;

    if (
      typeof parsed.voiceSessionId !== "string" ||
      typeof parsed.conversationId !== "string" ||
      typeof parsed.clerkId !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function createVoiceSession(
  clerkId: string,
  conversationId?: string | null,
  transport: VoiceTransportKind = "websocket",
  gatewayWssUrl?: string,
): Promise<VoiceSessionResponse> {
  const conversation = await getOrCreateConversation(clerkId, conversationId);
  const voiceSessionId = randomUUID();

  if (transport === "livekit") {
    const livekit = await createLiveKitVoiceRoom(voiceSessionId, clerkId, {
      conversationId: conversation.conversationId,
    });
    const config = getVoiceConfig();
    const sessionToken = config
      ? mintVoiceSessionToken(
          {
            voiceSessionId,
            conversationId: conversation.conversationId,
            clerkId,
          },
          config.sessionSigningSecret,
        )
      : "";

    return {
      transport: "livekit",
      voiceSessionId,
      conversationId: conversation.conversationId,
      sessionToken,
      livekitUrl: livekit.livekitUrl,
      livekitToken: livekit.livekitToken,
      roomName: livekit.roomName,
    };
  }

  const secrets = requireVoiceSecrets();
  const config = getVoiceConfig();
  const resolvedGatewayWssUrl =
    gatewayWssUrl ?? config?.gatewayWssUrl ?? requireVoiceConfig().gatewayWssUrl;

  const sessionToken = mintVoiceSessionToken(
    {
      voiceSessionId,
      conversationId: conversation.conversationId,
      clerkId,
    },
    secrets.sessionSigningSecret,
  );

  return {
    transport: "websocket",
    voiceSessionId,
    conversationId: conversation.conversationId,
    wssUrl: resolvedGatewayWssUrl,
    sessionToken,
  };
}
