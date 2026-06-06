/**
 * Merge ordered chunk transcripts with simple suffix/prefix seam dedup.
 */
export function mergeChunkTranscripts(segments: readonly string[]): string {
  const cleaned = segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (cleaned.length === 0) {
    return "";
  }

  let merged = cleaned[0] ?? "";

  for (let index = 1; index < cleaned.length; index += 1) {
    const next = cleaned[index] ?? "";
    merged = dedupeSeam(merged, next);
  }

  return merged.trim();
}

function dedupeSeam(previous: string, next: string): string {
  const prevWords = previous.split(/\s+/).filter(Boolean);
  const nextWords = next.split(/\s+/).filter(Boolean);

  if (prevWords.length === 0) {
    return next;
  }

  if (nextWords.length === 0) {
    return previous;
  }

  const maxOverlap = Math.min(prevWords.length, nextWords.length, 8);

  for (let size = maxOverlap; size >= 3; size -= 1) {
    const prevTail = prevWords.slice(-size).join(" ").toLowerCase();
    const nextHead = nextWords.slice(0, size).join(" ").toLowerCase();

    if (prevTail === nextHead) {
      return `${previous} ${nextWords.slice(size).join(" ")}`.trim();
    }
  }

  return `${previous} ${next}`.trim();
}
