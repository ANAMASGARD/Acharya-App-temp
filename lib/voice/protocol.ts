import type { VoiceClientMessage, VoiceServerMessage } from "@/types/voice";

export function encodeClientMessage(message: VoiceClientMessage): string {
  return JSON.stringify(message);
}

export function parseServerMessage(raw: string): VoiceServerMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) {
      return null;
    }

    return parsed as VoiceServerMessage;
  } catch {
    return null;
  }
}
