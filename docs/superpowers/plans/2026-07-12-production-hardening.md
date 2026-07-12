# Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate recorder data-loss paths, make AuraDB authoritative for transcripts, harden Sarvam API boundaries, correct scoped RAG retrieval, and deliver real incremental chat streaming.

**Architecture:** The recorder owns durable local queue state while Aura owns the canonical ordered transcript. API routes validate all runtime data with Zod, and server services retain the graph access and provider calls. Scoped RAG uses exact cosine ranking after graph pre-filtering; the global vector index remains for unscoped chat retrieval.

**Tech Stack:** Expo SDK 54, TypeScript strict, Zustand, AsyncStorage, Zod, Vitest, Sarvam AI SDK, Neo4j Aura driver, Expo Router API routes.

---

### Task 1: Add a deterministic test foundation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Install Vitest as a development dependency**

Run: `npm install --save-dev vitest@^4.0.0`

Expected: `package.json` and `package-lock.json` list Vitest under `devDependencies`.

- [ ] **Step 2: Configure path aliases and a node test environment**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: { environment: "node", setupFiles: ["./tests/setup.ts"] },
});
```

- [ ] **Step 3: Add test scripts**

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Run the empty test command and static checks**

Run: `npm test && npm run lint && npx tsc --noEmit`

Expected: all commands exit successfully.

### Task 2: Make recorder queue recovery durable

**Files:**
- Modify: `lib/recording/queue-persistence.ts`
- Modify: `lib/recording/chunk-upload-queue.ts`
- Modify: `hooks/use-recorder.ts`
- Create: `tests/recording/chunk-upload-queue.test.ts`

- [ ] **Step 1: Write queue persistence regression tests**

```ts
it("keeps a retrying chunk persisted until a successful acknowledgement", async () => {
  // enqueue, reject once, advance the retry timer, then assert stored queue item remains.
});

it("does not delete a local file after a permanent upload failure", async () => {
  // mock FileSystem; assert deleteAsync was not called for a failed chunk.
});
```

- [ ] **Step 2: Extend persisted queue items with retry metadata**

```ts
type PersistedQueueItem = Readonly<{
  sessionId: string;
  index: number;
  uri: string;
  attempt: number;
  nextAttemptAt: number | null;
}>;
```

- [ ] **Step 3: Requeue before releasing queue state**

```ts
this.pending.push({ ...chunk, attempt, nextAttemptAt: Date.now() + delay });
await this.persist();
```

- [ ] **Step 4: Restore persisted work when the recorder hook initializes**

```ts
const saved = await loadPersistedQueue();
if (saved) {
  await queue.restorePending(saved.sessionId);
}
```

The implementation must hydrate recorder metadata from `GET /api/sessions?sessionId=...` before exposing recovery state.

- [ ] **Step 5: Run queue tests**

Run: `npm test -- tests/recording/chunk-upload-queue.test.ts`

Expected: the new recovery and failure-retention tests pass.

### Task 3: Remove recorder start race and define complete session metadata

**Files:**
- Modify: `hooks/use-recorder.ts`
- Modify: `lib/recording/chunk-recorder.ts`
- Modify: `app/api/sessions+api.ts`
- Modify: `lib/graph/recorder.ts`
- Modify: `types/graph.ts`
- Create: `tests/recording/recorder-session.test.ts`

- [ ] **Step 1: Write lifecycle tests for session-before-audio ordering**

```ts
it("does not call recorder.record before the session API resolves", async () => {
  // defer the session promise and assert AudioRecorder.record has not run.
});
```

- [ ] **Step 2: Create the session before starting `ChunkRecorderSession`**

```ts
const response = await apiFetch<{ session: SessionNode }>("/api/sessions", { method: "POST", token, body });
useRecorderStore.getState().startSession(response.session.sessionId);
await session.start(recorder, onChunkReady, () => recordingActiveRef.current);
```

- [ ] **Step 3: Remove only the explicit artificial segment delay**

```ts
await ensureRecorderPrepared(recorder);
recorder.record();
```

Do not claim gap-free capture; retain a comment describing the Expo Audio lifecycle constraint.

- [ ] **Step 4: Persist expected chunk count on stop**

```ts
await apiFetch("/api/sessions", {
  method: "PATCH",
  token,
  body: { sessionId, durationSeconds, expectedChunkCount: chunks.length },
});
```

- [ ] **Step 5: Run recorder lifecycle tests**

Run: `npm test -- tests/recording/recorder-session.test.ts`

Expected: recording starts only after a valid session ID and stop writes expected chunk count.

### Task 4: Make server-side transcript merging authoritative

**Files:**
- Modify: `lib/graph/recorder.ts`
- Modify: `app/api/recorder/analyze+api.ts`
- Modify: `lib/recording/recorder-api.ts`
- Modify: `hooks/use-recorder.ts`
- Create: `tests/graph/recorder-transcript.test.ts`

- [ ] **Step 1: Write server transcript assembly tests**

```ts
it("returns chunks in index order and rejects an incomplete non-partial session", async () => {
  // use mocked graph rows indexed 1 then 0; expect merged text 0 then 1 and a 409 for missing index.
});
```

- [ ] **Step 2: Add a graph read that returns canonical session metadata and ordered chunks**

```cypher
MATCH (:Teacher {clerkId: $clerkId})-[:TAUGHT]->(s:Session {sessionId: $sessionId})
OPTIONAL MATCH (s)-[:HAS_CHUNK]->(chunk:AudioChunk)
RETURN s.expectedChunkCount AS expectedChunkCount,
       collect(chunk { .index, .text, .sttStatus }) AS chunks
```

- [ ] **Step 3: Merge server chunks and enforce completion**

```ts
const transcript = mergeChunkTranscripts(readyChunks.map((chunk) => chunk.text));
if (!allowPartial && !hasEveryExpectedReadyChunk) {
  return Response.json({ error: { code: "transcript_processing", message: "Transcription is still finishing." } }, { status: 409 });
}
```

- [ ] **Step 4: Remove `transcript`, `isComplete`, and `chunkCount` from the mobile analysis contract**

```ts
type AnalyzeRequest = Readonly<{ sessionId: string; allowPartial?: boolean }>;
```

- [ ] **Step 5: Run transcript tests**

Run: `npm test -- tests/graph/recorder-transcript.test.ts`

Expected: reports can only be generated from Aura-owned ordered chunks.

### Task 5: Harden Sarvam and API inputs

**Files:**
- Modify: `lib/ai-config.ts`
- Modify: `lib/sarvam.ts`
- Modify: `app/api/sarvam/stt+api.ts`
- Modify: `app/api/chat/stt+api.ts`
- Modify: `app/api/sarvam/tts+api.ts`
- Modify: `app/api/recorder/analyze+api.ts`
- Create: `lib/api-schemas.ts`
- Create: `tests/api/api-schemas.test.ts`

- [ ] **Step 1: Write validation and configuration tests**

```ts
it("uses saaras:v3 and bulbul:v3 as server defaults", () => {
  expect(getSarvamConfig()).toMatchObject({ sttModel: "saaras:v3", ttsModel: "bulbul:v3" });
});

it("rejects invalid base64 payloads and oversized audio before provider calls", () => {
  expect(parseSttRequest({ audioBase64: "not base64" })).toThrow();
});
```

- [ ] **Step 2: Define shared Zod schemas and byte limits**

```ts
export const sttRequestSchema = z.object({
  sessionId: z.string().uuid(),
  chunkIndex: z.number().int().nonnegative(),
  audioBase64: z.string().min(4).max(MAX_AUDIO_BASE64_CHARS),
  mimeType: z.enum(["audio/mp4", "audio/m4a", "audio/wav", "audio/webm"]),
  languageCode: z.string().max(16).optional(),
});
```

- [ ] **Step 3: Parse schema results in every affected route and return 400 or 413 without calling Sarvam**

- [ ] **Step 4: Remove the production mock-transcript fallback and return an `AiConfigError` when Sarvam is absent**

- [ ] **Step 5: Run API boundary tests**

Run: `npm test -- tests/api/api-schemas.test.ts`

Expected: invalid provider input never reaches Sarvam and no route accepts an unvalidated cast.

### Task 6: Guarantee selected-book RAG coverage

**Files:**
- Modify: `lib/rag/retrieve.ts`
- Create: `tests/rag/retrieve.test.ts`

- [ ] **Step 1: Write a retrieval test where the globally best vector results are out of scope**

```ts
it("ranks selected-book chunks even when unrelated chunks would dominate global ANN", async () => {
  // mock a scoped graph result and assert the final match bookIds equal the selected input.
});
```

- [ ] **Step 2: Replace global ANN then post-filter with graph pre-filter plus exact cosine ranking**

```cypher
MATCH (book:CurriculumBook)<-[:PART_OF]-(chapter:Chapter)<-[:IN_CHAPTER]-(chunk:Chunk)
WHERE book.bookId IN $bookIds
  AND book.classLevel = $classLevel
  AND toLower(book.subject) = toLower($subject)
WITH chunk, chapter, book, vector.similarity.cosine(chunk.embedding, $embedding) AS score
WHERE score IS NOT NULL
RETURN chunk { .* } AS chunk, chapter { .* } AS chapter, book { .* } AS book, score
ORDER BY score DESC, chunk.chunkId ASC
LIMIT $limit
```

- [ ] **Step 3: Run retrieval tests**

Run: `npm test -- tests/rag/retrieve.test.ts`

Expected: a selected curriculum scope cannot be discarded by unrelated global candidates.

### Task 7: Return real incremental chat NDJSON

**Files:**
- Modify: `app/api/chat/completions+api.ts`
- Modify: `lib/chat-stream.ts`
- Create: `tests/chat/ndjson-stream.test.ts`

- [ ] **Step 1: Write an incremental response test**

```ts
it("writes a delta before the agent completes and ends with one done event", async () => {
  // deferred agent promise emits a delta; assert first reader.read resolves before completion.
});
```

- [ ] **Step 2: Replace the in-memory `ndjsonLines` array with a `ReadableStream`**

```ts
const stream = new ReadableStream<Uint8Array>({
  async start(controller) {
    const write = (event: NdjsonStreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
    // run agent; write each delta; append message; write done; close.
  },
});
return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache, no-transform" } });
```

- [ ] **Step 3: Handle a stream-side `error` event in the client before final completion**

- [ ] **Step 4: Run streaming tests**

Run: `npm test -- tests/chat/ndjson-stream.test.ts`

Expected: the first delta reaches the client without waiting for the full agent response.

### Task 8: Validate the complete hardening pass

**Files:**
- Modify: `README.md` only if a test command is currently documented there; otherwise no documentation change.

- [ ] **Step 1: Run the full deterministic suite**

Run: `npm test`

Expected: all Vitest suites pass.

- [ ] **Step 2: Run static verification**

Run: `npm run lint && npx tsc --noEmit`

Expected: both commands exit successfully.

- [ ] **Step 3: Run the Expo web export smoke check**

Run: `npx expo export --platform web`

Expected: server output builds without route or type errors. Do not deploy or run live Aura/Sarvam mutation scripts.

- [ ] **Step 4: Commit the hardening changes**

```bash
git add package.json package-lock.json vitest.config.ts tests lib app hooks types docs
git commit -m "fix: harden recorder and AI pipelines"
```
