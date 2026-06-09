import { requireLiveKitConfig } from "@/lib/voice/config";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";

type LiveKitVoiceRoom = Readonly<{
  livekitUrl: string;
  livekitToken: string;
  roomName: string;
}>;

function toHttpUrl(wssUrl: string): string {
  return wssUrl.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
}

export async function createLiveKitVoiceRoom(
  voiceSessionId: string,
  clerkId: string,
  metadata: Readonly<{
    conversationId: string;
  }>,
): Promise<LiveKitVoiceRoom> {
  const config = requireLiveKitConfig();
  const roomName = `acharya-voice-${voiceSessionId}`;

  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: clerkId,
    name: "teacher",
    ttl: "10m",
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const livekitToken = await token.toJwt();
  const dispatchClient = new AgentDispatchClient(
    toHttpUrl(config.url),
    config.apiKey,
    config.apiSecret,
  );

  await dispatchClient.createDispatch(roomName, config.agentName, {
    metadata: JSON.stringify({
      voiceSessionId,
      conversationId: metadata.conversationId,
      clerkId,
    }),
  });

  return {
    livekitUrl: config.url,
    livekitToken,
    roomName,
  };
}
