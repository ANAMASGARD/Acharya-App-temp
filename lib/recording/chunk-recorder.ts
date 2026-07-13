import type { AudioRecorder } from "expo-audio";
import { CHUNK_DURATION_SEC } from "@/lib/recording/constants";
import { ensureRecorderPrepared } from "@/lib/recording/recorder-prepare";

export type ChunkReadyEvent = Readonly<{
  index: number;
  uri: string;
  durationMs: number;
}>;

type ChunkReadyHandler = (event: ChunkReadyEvent) => void;

/**
 * Records until the teacher taps stop. Rotates segments every CHUNK_DURATION_SEC
 * for long classes, and always flushes the final partial segment on stop.
 */
export class ChunkRecorderSession {
  private segmentIndex = 0;

  private rotateTimer: ReturnType<typeof setInterval> | null = null;

  private rotating = false;

  private onChunkReady: ChunkReadyHandler | null = null;

  private shouldContinue: (() => boolean) | null = null;

  async start(
    recorder: AudioRecorder,
    onChunkReady: ChunkReadyHandler,
    shouldContinue: () => boolean,
  ): Promise<void> {
    this.onChunkReady = onChunkReady;
    this.shouldContinue = shouldContinue;
    this.segmentIndex = 0;

    await ensureRecorderPrepared(recorder);
    recorder.record();

    this.rotateTimer = setInterval(() => {
      void this.rotateSegment(recorder);
    }, CHUNK_DURATION_SEC * 1000);
  }

  async stop(recorder: AudioRecorder): Promise<void> {
    if (this.rotateTimer) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }

    await this.flushSegment(recorder, true);
  }

  private async rotateSegment(recorder: AudioRecorder): Promise<void> {
    if (!this.shouldContinue?.()) {
      return;
    }

    await this.flushSegment(recorder, false);

    if (!this.shouldContinue?.()) {
      return;
    }

    // Expo Audio exposes stop/prepare/record rather than gap-free segment rotation.
    // Do not add an artificial pause here; the unavoidable native transition is minimal.
    await ensureRecorderPrepared(recorder);
    recorder.record();
  }

  private async flushSegment(
    recorder: AudioRecorder,
    isFinal: boolean,
  ): Promise<void> {
    if (this.rotating) {
      return;
    }

    this.rotating = true;

    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }

      const uri = recorder.uri;

      if (!uri || !this.onChunkReady) {
        return;
      }

      this.onChunkReady({
        index: this.segmentIndex,
        uri,
        durationMs: Math.max(
          1,
          Math.round(recorder.currentTime * 1000) ||
            (isFinal ? 1000 : CHUNK_DURATION_SEC * 1000),
        ),
      });

      this.segmentIndex += 1;
    } finally {
      this.rotating = false;
    }
  }
}

export async function stopActiveSegment(recorder: AudioRecorder): Promise<void> {
  if (recorder.isRecording) {
    await recorder.stop();
  }
}
