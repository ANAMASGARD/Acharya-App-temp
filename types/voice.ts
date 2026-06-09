export type VoiceAgentStatus =
  | "idle"
  | "connecting"
  | "active"
  | "disconnecting"
  | "error";

export type VoiceAgentPhase = "listening" | "thinking" | "speaking" | "connecting";

export type VoiceTransportKind = "websocket" | "livekit";

export type VoiceSessionResponse = Readonly<{
  transport: VoiceTransportKind;
  voiceSessionId: string;
  conversationId: string;
  sessionToken: string;
  wssUrl?: string;
  livekitUrl?: string;
  livekitToken?: string;
  roomName?: string;
}>;

export type VoiceTranscriptMessage = Readonly<{
  role: "user" | "assistant";
  content: string;
}>;

export type VoiceTranscriptBatchBody = Readonly<{
  voiceSessionId: string;
  conversationId: string;
  clerkId: string;
  messages: VoiceTranscriptMessage[];
}>;

export type VoiceClientMessage =
  | Readonly<{ type: "auth"; sessionToken: string }>
  | Readonly<{ type: "audio"; data: string; mimeType: string }>
  | Readonly<{ type: "end_turn" }>
  | Readonly<{ type: "hangup" }>;

export type VoiceServerMessage =
  | Readonly<{ type: "ready" }>
  | Readonly<{ type: "agent_state"; state: VoiceAgentPhase }>
  | Readonly<{ type: "audio"; data: string; mimeType: string }>
  | Readonly<{ type: "error"; message: string }>
  | Readonly<{ type: "transcript"; role: "user" | "assistant"; content: string }>;
