import { apiFetch } from "@/lib/api-client";
import { CLASSROOM_RECORDING_PRESET } from "@/lib/recording/recording-preset";
import { SESSION_API_TIMEOUT_MS } from "@/lib/voice/constants";
import {
  createVoiceTransport,
  resolveVoiceTransportKind,
  type VoiceTransport,
  type VoiceTranscriptRole,
} from "@/lib/voice/transport";
import { useChatStore } from "@/store/chat-store";
import type {
  VoiceAgentPhase,
  VoiceAgentStatus,
  VoiceSessionResponse,
} from "@/types/voice";
import { useAuth } from "@clerk/expo";
import { AudioModule, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useCallback, useRef, useState } from "react";

type UseVoiceAgentResult = Readonly<{
  status: VoiceAgentStatus;
  phase: VoiceAgentPhase;
  error: string | null;
  isActive: boolean;
  connect: (conversationId?: string | null) => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}>;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((reason: unknown) => {
        clearTimeout(timer);
        reject(reason);
      });
  });
}

function appendVoiceTranscript(role: VoiceTranscriptRole, content: string): void {
  const trimmed = content.trim();

  if (!trimmed) {
    return;
  }

  useChatStore.getState().appendMessage({
    messageId: `voice-${Date.now()}-${role}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content: trimmed,
    createdAt: new Date().toISOString(),
  });
}

export function useVoiceAgent(
  onSessionEnd?: () => void,
): UseVoiceAgentResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const recorder = useAudioRecorder(CLASSROOM_RECORDING_PRESET);
  const transportRef = useRef<VoiceTransport | null>(null);
  const connectGenerationRef = useRef(0);
  const sessionEndedRef = useRef<(() => void) | undefined>(onSessionEnd);
  sessionEndedRef.current = onSessionEnd;

  const [status, setStatus] = useState<VoiceAgentStatus>("idle");
  const [phase, setPhase] = useState<VoiceAgentPhase>("connecting");
  const [error, setError] = useState<string | null>(null);

  const cleanupConnection = useCallback(async (): Promise<void> => {
    const transport = transportRef.current;
    transportRef.current = null;

    if (transport) {
      await transport.disconnect();
    }

    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch {
      // ignore audio mode reset errors
    }
  }, []);

  const disconnect = useCallback((): void => {
    connectGenerationRef.current += 1;
    setError(null);
    setStatus("disconnecting");

    void (async () => {
      await cleanupConnection();
      setStatus("idle");
      setPhase("connecting");
      sessionEndedRef.current?.();
    })();
  }, [cleanupConnection]);

  const connect = useCallback(
    async (conversationId?: string | null): Promise<void> => {
      if (
        status === "connecting" ||
        status === "active" ||
        status === "disconnecting"
      ) {
        return;
      }

      setError(null);
      setStatus("connecting");
      setPhase("connecting");
      const connectGeneration = connectGenerationRef.current + 1;
      connectGenerationRef.current = connectGeneration;

      try {
        const permission = await AudioModule.requestRecordingPermissionsAsync();

        if (!permission.granted) {
          throw new Error("Microphone permission is required for voice chat.");
        }

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        const token = await getTokenRef.current();

        if (!token) {
          throw new Error("Not authenticated");
        }

        const transportKind = resolveVoiceTransportKind();

        const session = await withTimeout(
          apiFetch<VoiceSessionResponse>("/api/voice/session", {
            method: "POST",
            token,
            body: {
              conversationId: conversationId ?? undefined,
              transport: transportKind,
            },
          }),
          SESSION_API_TIMEOUT_MS,
          "Voice session",
        );

        useChatStore.getState().setConversationId(session.conversationId);

        transportRef.current = await createVoiceTransport(session.transport, {
          recorder,
        });

        await transportRef.current.connect(session, {
          onPhase: setPhase,
          onError: setError,
          onTranscript: appendVoiceTranscript,
          onConnectionLost: () => {
            if (connectGenerationRef.current !== connectGeneration) {
              return;
            }

            void (async () => {
              await cleanupConnection();
              setStatus("idle");
              setPhase("connecting");
              sessionEndedRef.current?.();
            })();
          },
        });

        if (connectGenerationRef.current !== connectGeneration) {
          return;
        }

        setStatus("active");
        setPhase("listening");
      } catch (connectError) {
        await cleanupConnection();
        const message =
          connectError instanceof Error
            ? connectError.message
            : "Voice coach unavailable. Try again.";
        setError(message);
        setStatus("error");
        setPhase("connecting");
      }
    },
    [cleanupConnection, recorder, status],
  );

  const clearError = useCallback((): void => {
    setError(null);

    if (status === "error") {
      setStatus("idle");
    }
  }, [status]);

  return {
    status,
    phase,
    error,
    isActive:
      status === "active" ||
      status === "connecting" ||
      status === "disconnecting",
    connect,
    disconnect,
    clearError,
  };
}
