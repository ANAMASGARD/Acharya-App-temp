import { mergeChunkTranscripts } from "@/lib/recording/transcript-merge";
import type { RecorderChunk } from "@/types/recorder";

export function rebuildMergedTranscript(chunks: readonly RecorderChunk[]): string {
  const ordered = [...chunks]
    .filter((chunk) => chunk.sttStatus === "done" || chunk.sttStatus === "empty")
    .sort((a, b) => a.index - b.index);

  const segments = ordered.map((chunk) => {
    if (chunk.sttStatus === "empty" || !chunk.text.trim()) {
      return "[inaudible]";
    }

    return chunk.text.trim();
  });

  return mergeChunkTranscripts(segments);
}

export function countPendingChunks(chunks: readonly RecorderChunk[]): number {
  return chunks.filter(
    (chunk) =>
      chunk.uploadStatus === "pending" ||
      chunk.uploadStatus === "uploading" ||
      (chunk.sttStatus !== "done" &&
        chunk.sttStatus !== "empty" &&
        chunk.sttStatus !== "failed"),
  ).length;
}

export function hasFailedChunks(chunks: readonly RecorderChunk[]): boolean {
  return chunks.some(
    (chunk) => chunk.uploadStatus === "failed" || chunk.sttStatus === "failed",
  );
}

export function isTranscriptComplete(chunks: readonly RecorderChunk[]): boolean {
  if (chunks.length === 0) {
    return false;
  }

  return chunks.every(
    (chunk) =>
      chunk.sttStatus === "done" ||
      chunk.sttStatus === "empty" ||
      chunk.sttStatus === "failed",
  );
}
