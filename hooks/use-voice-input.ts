import { apiFetch } from "@/lib/api-client";
import { ensureRecorderPrepared } from "@/lib/recording/recorder-prepare";
import { CLASSROOM_RECORDING_PRESET } from "@/lib/recording/recording-preset";
import type { VoiceInputStatus } from "@/types/chat";
import { useAuth } from "@clerk/expo";
import {
  AudioModule,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useRef, useState } from "react";

type SttResponse = Readonly<{
  transcript: string;
  languageCode?: string;
}>;

type UseVoiceInputResult = Readonly<{
  status: VoiceInputStatus;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  clearError: () => void;
}>;

export function useVoiceInput(): UseVoiceInputResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const recorder = useAudioRecorder(CLASSROOM_RECORDING_PRESET);
  const [status, setStatus] = useState<VoiceInputStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const ensurePermissions = useCallback(async (): Promise<boolean> => {
    const permission = await AudioModule.requestRecordingPermissionsAsync();

    if (!permission.granted) {
      setError("Microphone permission is required for voice input.");
      return false;
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    return true;
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    if (status !== "idle") {
      return;
    }

    setError(null);

    const allowed = await ensurePermissions();

    if (!allowed) {
      return;
    }

    try {
      await ensureRecorderPrepared(recorder);
      recorder.record();
      setStatus("recording");
    } catch (recordError) {
      const message =
        recordError instanceof Error
          ? recordError.message
          : "Could not start recording";
      setError(message);
      setStatus("idle");
    }
  }, [ensurePermissions, recorder, status]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (status !== "recording") {
      return null;
    }

    setStatus("transcribing");

    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        throw new Error("Recording file was not found.");
      }

      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const token = await getTokenRef.current();
      const response = await apiFetch<SttResponse>("/api/chat/stt", {
        method: "POST",
        token,
        body: {
          audioBase64,
          mimeType: "audio/mp4",
        },
      });

      setStatus("idle");
      return response.transcript;
    } catch (sttError) {
      const message =
        sttError instanceof Error ? sttError.message : "Voice input failed";
      setError(message);
      setStatus("idle");
      return null;
    }
  }, [recorder, status]);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    status,
    error,
    startRecording,
    stopRecording,
    clearError,
  };
}
