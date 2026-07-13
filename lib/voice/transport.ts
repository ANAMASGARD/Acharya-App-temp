import { isExpoGo } from "@/lib/voice/config";
import type { VoiceAgentPhase, VoiceSessionResponse, VoiceTransportKind } from "@/types/voice";
import type { useAudioRecorder } from "expo-audio";

export type VoiceTranscriptRole = "user" | "assistant";

export type VoiceTransportCallbacks = Readonly<{
  onPhase: (phase: VoiceAgentPhase) => void;
  onError: (message: string) => void;
  onTranscript?: (role: VoiceTranscriptRole, content: string) => void;
  onConnectionLost?: () => void;
}>;

export type VoiceTransport = Readonly<{
  connect: (
    session: VoiceSessionResponse,
    callbacks: VoiceTransportCallbacks,
  ) => Promise<void>;
  disconnect: () => void | Promise<void>;
}>;

type CreateVoiceTransportOptions = Readonly<{
  recorder: ReturnType<typeof useAudioRecorder>;
}>;

export function resolveVoiceTransportKind(): VoiceTransportKind {
  if (isExpoGo()) {
    return "websocket";
  }

  return "livekit";
}

export async function createVoiceTransport(
  kind: VoiceTransportKind,
  options: CreateVoiceTransportOptions,
): Promise<VoiceTransport> {
  if (kind === "livekit") {
    const { createLiveKitTransport } = await import(
      "@/lib/voice/transports/livekit-transport"
    );
    return createLiveKitTransport();
  }

  const { createWebSocketTransport } = await import(
    "@/lib/voice/transports/websocket-transport"
  );
  return createWebSocketTransport({ recorder: options.recorder });
}
