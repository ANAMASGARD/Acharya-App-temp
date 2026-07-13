import { describe, expect, it } from "vitest";
import { mergeChunkTranscripts } from "@/lib/recording/transcript-merge";

describe("mergeChunkTranscripts", () => {
  it("deduplicates a three-word chunk seam without dropping unique text", () => {
    expect(
      mergeChunkTranscripts([
        "Today we learn about gravity and motion",
        "gravity and motion through simple experiments",
      ]),
    ).toBe("Today we learn about gravity and motion through simple experiments");
  });

  it("omits empty chunk text", () => {
    expect(mergeChunkTranscripts(["  ", "A clear lesson", ""])).toBe("A clear lesson");
  });
});
