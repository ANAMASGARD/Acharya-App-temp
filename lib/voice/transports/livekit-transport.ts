import { FIRST_AUDIO_TIMEOUT_MS } from "@/lib/voice/constants";
import type { VoiceTransport, VoiceTransportCallbacks } from "@/lib/voice/transport";
import type { VoiceSessionResponse } from "@/types/voice";
import { AudioSession } from "@livekit/react-native";
import { ConnectionState, ParticipantKind, Room, RoomEvent, Track } from "livekit-client";

function waitForAgentReady(room: Room, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Voice coach unavailable. Try again."));
    }, timeoutMs);

    const cleanup = (): void => {
      clearTimeout(timer);
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.off(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);
    };

    const tryResolve = (): void => {
      const hasAgentAudio = Array.from(room.remoteParticipants.values()).some(
        (participant) =>
          participant.kind === ParticipantKind.AGENT &&
          Array.from(participant.audioTrackPublications.values()).some(
            (publication) => publication.track,
          ),
      );

      if (hasAgentAudio) {
        cleanup();
        resolve();
      }
    };

    const onParticipantConnected = (): void => {
      tryResolve();
    };

    const onTrackSubscribed = (
      track: Track,
      _publication: unknown,
      participant: { kind: ParticipantKind },
    ): void => {
      if (
        participant.kind === ParticipantKind.AGENT &&
        track.kind === Track.Kind.Audio
      ) {
        cleanup();
        resolve();
      }
    };

    const onConnectionStateChanged = (state: ConnectionState): void => {
      if (state === ConnectionState.Disconnected) {
        cleanup();
        reject(new Error("Voice connection failed."));
      }
    };

    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);
    tryResolve();
  });
}

export function createLiveKitTransport(): VoiceTransport {
  let room: Room | null = null;
  let callbacks: VoiceTransportCallbacks | null = null;

  return {
    async connect(session: VoiceSessionResponse, nextCallbacks) {
      if (!session.livekitUrl || !session.livekitToken) {
        throw new Error("LiveKit credentials are missing.");
      }

      callbacks = nextCallbacks;
      callbacks.onPhase("connecting");

      await AudioSession.startAudioSession();

      const nextRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      room = nextRoom;

      nextRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const agentSpeaking = speakers.some(
          (speaker) => speaker.kind === ParticipantKind.AGENT,
        );
        callbacks?.onPhase(agentSpeaking ? "speaking" : "listening");
      });

      nextRoom.on(RoomEvent.Disconnected, () => {
        callbacks?.onError("Voice session ended.");
      });

      await nextRoom.connect(session.livekitUrl, session.livekitToken);
      await nextRoom.localParticipant.setMicrophoneEnabled(true);
      await waitForAgentReady(nextRoom, FIRST_AUDIO_TIMEOUT_MS);
      callbacks.onPhase("listening");
    },

    disconnect() {
      room?.disconnect();
      room = null;
      void AudioSession.stopAudioSession();
      callbacks = null;
    },
  };
}
