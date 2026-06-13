import { ensureRecorderPrepared, safeStopRecorder } from "@/lib/recording/recorder-prepare";
import { CLASSROOM_RECORDING_PRESET } from "@/lib/recording/recording-preset";
import { FIRST_AUDIO_TIMEOUT_MS, VOICE_CHUNK_RECORD_MS } from "@/lib/voice/constants";
import { encodeClientMessage, parseServerMessage } from "@/lib/voice/protocol";
import type { VoiceTransport, VoiceTransportCallbacks } from "@/lib/voice/transport";
import type { VoiceSessionResponse } from "@/types/voice";
import { createAudioPlayer, useAudioRecorder } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";

type WebSocketTransportDeps = Readonly<{
  recorder: ReturnType<typeof useAudioRecorder>;
}>;

export function createWebSocketTransport(
  deps: WebSocketTransportDeps,
): VoiceTransport {
  const { recorder } = deps;
  let socket: WebSocket | null = null;
  let player: ReturnType<typeof createAudioPlayer> | null = null;
  let listenLoop = false;
  let isSpeaking = false;
  let playbackGeneration = 0;
  let recordInFlight: Promise<void> | null = null;
  let callbacks: VoiceTransportCallbacks | null = null;

  const stopPlayer = (): void => {
    playbackGeneration += 1;
    player?.pause();
    player?.remove();
    player = null;
    isSpeaking = false;
  };

  const playAudioBase64 = async (
    audioBase64: string,
    mimeType: string,
  ): Promise<void> => {
    stopPlayer();
    const generation = playbackGeneration;
    isSpeaking = true;
    callbacks?.onPhase("speaking");

    const extension = mimeType.includes("wav") ? "wav" : "mp3";
    const fileUri = `${FileSystem.cacheDirectory}acharya-voice-${Date.now()}.${extension}`;

    await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const nextPlayer = createAudioPlayer({ uri: fileUri });
    player = nextPlayer;
    nextPlayer.play();

    await new Promise<void>((resolve) => {
      const poll = setInterval(() => {
        if (generation !== playbackGeneration || !nextPlayer.playing) {
          clearInterval(poll);
          void FileSystem.deleteAsync(fileUri, { idempotent: true });
          resolve();
        }
      }, 200);
    });

    if (generation === playbackGeneration) {
      isSpeaking = false;
      callbacks?.onPhase("listening");
    }
  };

  const recordAndSendTurn = async (): Promise<void> => {
    if (!socket || socket.readyState !== WebSocket.OPEN || isSpeaking) {
      return;
    }

    let startedRecording = false;

    try {
      await ensureRecorderPrepared(recorder);
      recorder.record();
      startedRecording = true;

      await new Promise((resolve) => {
        setTimeout(resolve, VOICE_CHUNK_RECORD_MS);
      });

      if (!listenLoop) {
        return;
      }

      await safeStopRecorder(recorder);
      startedRecording = false;

      const uri = recorder.uri;

      if (!uri || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      socket.send(
        encodeClientMessage({
          type: "audio",
          data: audioBase64,
          mimeType: "audio/x-m4a",
        }),
      );
      callbacks?.onPhase("listening");
    } catch {
      // keep loop alive unless disconnected
    } finally {
      if (startedRecording) {
        await safeStopRecorder(recorder);
      }
    }
  };

  const runListenLoop = async (): Promise<void> => {
    while (listenLoop) {
      if (!isSpeaking && socket?.readyState === WebSocket.OPEN) {
        const slice = recordAndSendTurn();
        recordInFlight = slice;
        await slice;
        if (recordInFlight === slice) {
          recordInFlight = null;
        }
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 400);
      });
    }
  };

  const teardown = async (): Promise<void> => {
    listenLoop = false;
    stopPlayer();

    if (recordInFlight) {
      await recordInFlight.catch(() => undefined);
      recordInFlight = null;
    }

    await safeStopRecorder(recorder);

    if (socket) {
      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(encodeClientMessage({ type: "hangup" }));
        }
        socket.close();
      } catch {
        // ignore close errors during cleanup
      }
      socket = null;
    }

    callbacks = null;
  };

  return {
    async connect(session: VoiceSessionResponse, nextCallbacks) {
      if (!session.wssUrl) {
        throw new Error("WebSocket voice URL is missing.");
      }

      callbacks = nextCallbacks;
      callbacks.onPhase("connecting");

      let isReady = false;

      await new Promise<void>((resolve, reject) => {
        const nextSocket = new WebSocket(session.wssUrl!);
        socket = nextSocket;

        const failTimer = setTimeout(() => {
          reject(new Error("Voice coach unavailable. Try again."));
        }, FIRST_AUDIO_TIMEOUT_MS);

        nextSocket.onopen = () => {
          nextSocket.send(
            encodeClientMessage({
              type: "auth",
              sessionToken: session.sessionToken,
            }),
          );
        };

        nextSocket.onmessage = (event) => {
          const message = parseServerMessage(String(event.data));

          if (!message) {
            return;
          }

          if (message.type === "ready") {
            isReady = true;
            clearTimeout(failTimer);
            resolve();
            return;
          }

          if (message.type === "error") {
            if (!isReady) {
              clearTimeout(failTimer);
              reject(new Error(message.message));
              return;
            }

            callbacks?.onError(message.message);
            callbacks?.onPhase("listening");
            return;
          }

          if (message.type === "agent_state") {
            callbacks?.onPhase(message.state);
          }

          if (message.type === "transcript") {
            callbacks?.onTranscript?.(message.role, message.content);
          }

          if (message.type === "audio") {
            playAudioBase64(message.data, message.mimeType).catch(() => {
              // Playback failed (file write / player error): reset phase so the
              // session does not get stuck showing "speaking" forever.
              isSpeaking = false;
              callbacks?.onError("Could not play the coach's reply.");
              callbacks?.onPhase("listening");
            });
          }
        };

        nextSocket.onerror = () => {
          clearTimeout(failTimer);
          reject(new Error("Voice connection failed."));
        };

        nextSocket.onclose = () => {
          listenLoop = false;

          if (!isReady) {
            clearTimeout(failTimer);
            reject(new Error("Voice coach unavailable. Try again."));
            return;
          }

          callbacks?.onConnectionLost?.();
        };
      });

      listenLoop = true;
      callbacks.onPhase("listening");
      void runListenLoop();
    },

    disconnect() {
      void teardown();
    },
  };
}
