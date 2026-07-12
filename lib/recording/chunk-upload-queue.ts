import { CHUNK_RETRY_DELAYS_MS, STT_AUTO_DETECT } from "@/lib/recording/constants";
import {
  clearPersistedQueue,
  loadPersistedQueue,
  savePersistedQueue,
  type PersistedQueueItem,
} from "@/lib/recording/queue-persistence";
import { apiUploadSttChunk } from "@/lib/recording/recorder-api";
import type { SttChunkResponse } from "@/types/recorder";
import * as FileSystem from "expo-file-system/legacy";

export type QueueChunk = Readonly<{
  sessionId: string;
  index: number;
  localUri: string;
  languageCode?: string;
  attempt?: number;
  nextAttemptAt?: number | null;
}>;

export type QueueCallbacks = Readonly<{
  getToken: () => Promise<string | null>;
  onChunkProcessing: (index: number) => void;
  onChunkSuccess: (response: SttChunkResponse, localUri: string) => void;
  onChunkFailed: (index: number, message: string, permanent: boolean) => void;
  onQueueIdle: () => void;
}>;

export class ChunkUploadQueue {
  private readonly pending: QueueChunk[] = [];

  private readonly retryCounts = new Map<number, number>();

  private processing = false;

  private activeSessionId: string | null = null;

  constructor(private readonly callbacks: QueueCallbacks) {}

  async restorePending(sessionId: string): Promise<void> {
    const saved = await loadPersistedQueue();

    if (!saved || saved.sessionId !== sessionId) {
      return;
    }

    for (const item of saved.items) {
      this.pending.push({
        sessionId: item.sessionId,
        index: item.index,
        localUri: item.uri,
        languageCode: STT_AUTO_DETECT,
        attempt: item.attempt ?? 0,
        nextAttemptAt: item.nextAttemptAt ?? null,
      });
    }

    void this.pump();
  }

  enqueue(chunk: QueueChunk): void {
    this.activeSessionId = chunk.sessionId;
    this.pending.push(chunk);
    void this.persist();
    void this.pump();
  }

  async drain(): Promise<void> {
    while (this.pending.length > 0 || this.processing) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  get depth(): number {
    return this.pending.length + (this.processing ? 1 : 0);
  }

  private async pump(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.pending.length > 0) {
      const next = this.pending[0];

      if (next?.nextAttemptAt && next.nextAttemptAt > Date.now()) {
        this.processing = false;
        await this.persist();
        setTimeout(() => void this.pump(), next.nextAttemptAt - Date.now());
        return;
      }

      const chunk = this.pending.shift();

      if (!chunk) {
        break;
      }

      await this.processChunk(chunk);
      await this.persist();
    }

    this.processing = false;
    this.callbacks.onQueueIdle();
  }

  private async processChunk(chunk: QueueChunk): Promise<void> {
    this.callbacks.onChunkProcessing(chunk.index);

    const token = await this.callbacks.getToken();

    if (!token) {
      await this.requeue(chunk, "Not authenticated", false);
      return;
    }

    try {
      const fileInfo = await FileSystem.getInfoAsync(chunk.localUri);

      if (!fileInfo.exists) {
        this.callbacks.onChunkFailed(
          chunk.index,
          "Local audio file missing",
          true,
        );
        return;
      }

      const audioBase64 = await FileSystem.readAsStringAsync(chunk.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await apiUploadSttChunk(token, {
        sessionId: chunk.sessionId,
        chunkIndex: chunk.index,
        languageCode: chunk.languageCode,
        audioBase64,
        mimeType: "audio/mp4",
      });

      this.callbacks.onChunkSuccess(response, chunk.localUri);
      this.retryCounts.delete(chunk.index);
      await this.deleteLocalFileIfAcked(chunk.localUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      await this.requeue(chunk, message, false);
    }
  }

  private async requeue(chunk: QueueChunk, message: string, permanent: boolean): Promise<void> {
    const attempts = Math.max(this.retryCounts.get(chunk.index) ?? 0, chunk.attempt ?? 0) + 1;
    this.retryCounts.set(chunk.index, attempts);

    if (permanent || attempts > CHUNK_RETRY_DELAYS_MS.length) {
      this.callbacks.onChunkFailed(chunk.index, message, true);
      return;
    }

    const delay = CHUNK_RETRY_DELAYS_MS[attempts - 1] ?? 16000;

    this.pending.push({ ...chunk, attempt: attempts, nextAttemptAt: Date.now() + delay });
    await this.persist();
  }

  private async deleteLocalFileIfAcked(uri: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(uri);

      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch {
      // Keep file if deletion fails — orphan sweep handles later.
    }
  }

  private async persist(): Promise<void> {
    if (!this.activeSessionId) {
      return;
    }

    const items: PersistedQueueItem[] = this.pending.map((chunk) => ({
      sessionId: chunk.sessionId,
      index: chunk.index,
      uri: chunk.localUri,
      attempt: chunk.attempt ?? 0,
      nextAttemptAt: chunk.nextAttemptAt ?? null,
    }));

    await savePersistedQueue({ sessionId: this.activeSessionId, items });
  }

  async clearSession(sessionId: string): Promise<void> {
    if (this.activeSessionId === sessionId) {
      this.pending.length = 0;
      await clearPersistedQueue();
    }
  }
}
