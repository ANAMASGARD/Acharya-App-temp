import { apiFetch } from "@/lib/api-client";
import type { VoiceOutputStatus } from "@/types/chat";
import { useAuth } from "@clerk/expo";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useRef, useState } from "react";

type TtsResponse = Readonly<{
  audioBase64: string;
  mimeType: string;
}>;

type UseVoiceOutputResult = Readonly<{
  status: VoiceOutputStatus;
  error: string | null;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  clearError: () => void;
}>;

export function useVoiceOutput(): UseVoiceOutputResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const [status, setStatus] = useState<VoiceOutputStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback((): void => {
    playerRef.current?.pause();
    playerRef.current?.remove();
    playerRef.current = null;
    setStatus("idle");
  }, []);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();

      if (!trimmed) {
        return;
      }

      stop();
      setError(null);
      setStatus("loading");

      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });

        const token = await getTokenRef.current();
        const response = await apiFetch<TtsResponse>("/api/sarvam/tts", {
          method: "POST",
          token,
          body: { text: trimmed },
        });

        const fileUri = `${FileSystem.cacheDirectory}acharya-chat-tts-${Date.now()}.wav`;
        await FileSystem.writeAsStringAsync(fileUri, response.audioBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const player = createAudioPlayer({ uri: fileUri });
        playerRef.current = player;
        setStatus("speaking");
        player.play();

        const poll = setInterval(() => {
          if (!player.playing) {
            clearInterval(poll);
            stop();
            void FileSystem.deleteAsync(fileUri, { idempotent: true });
          }
        }, 250);
      } catch (ttsError) {
        const message =
          ttsError instanceof Error ? ttsError.message : "Read aloud failed";
        setError(message);
        setStatus("idle");
      }
    },
    [stop],
  );

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    status,
    error,
    speak,
    stop,
    clearError,
  };
}
