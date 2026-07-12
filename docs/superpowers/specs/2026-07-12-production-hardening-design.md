# Production Hardening Design

## Goal

Make the existing Acharya recorder, Sarvam integration, scoped curriculum retrieval, and chat delivery resilient to interruption and malformed input without changing the teacher-facing product flow or exposing server secrets.

## Confirmed constraints

- Keep Expo SDK 54, Expo Router, Zustand, AsyncStorage, Zod, Sarvam, and Neo4j Aura.
- Keep `expo-audio`; do not add native recording dependencies or require a custom build for this pass.
- Continue to use 22-second STT chunks. This is below Sarvam Saaras v3's 30-second synchronous REST limit.
- Sarvam model configuration remains server-only. The supported production defaults are `saaras:v3` for STT and `bulbul:v3` for TTS.
- Preserve the current recorder, report, notes-verification, and chat interfaces. Reliability fixes may improve error messages and progress state, but must not remove capabilities.

## Recorder and transcript integrity

1. Create the Aura session before the microphone starts. The start operation is cancellable until a session identifier is known; it will not create audio that cannot be attached to a session.
2. Retain the current Expo Audio stop-and-reprepare chunking approach, but remove the deliberate 250 ms pause. Expo Audio exposes start/stop/prepare rather than a gap-free segment callback, so a device-dependent transition remains. A genuinely continuous, gap-free segmented capture requires a separate native streaming milestone and is out of scope.
3. Persist every pending or retrying queue item before it can be removed from memory. Persist the retry attempt and next-attempt timestamp, restore the queue on a new app process, and retain local audio after terminal upload failures so it can be recovered instead of silently deleted.
4. Write the expected chunk count when recording stops. The analysis API accepts only a session identifier and an explicit partial-analysis choice. It reads ordered `AudioChunk` nodes owned by the authenticated teacher, verifies contiguous ready chunks for complete analysis, merges them on the server, and saves that exact merged text.
5. Apply Zod request schemas and audio size limits to recorder STT, recorder analysis, chat STT, and TTS routes. Client TypeScript types are not treated as input validation.

## Sarvam integration

- Preserve the secure API-route-only integration and the `apiSubscriptionKey` server configuration.
- Validate configurable model IDs at the server boundary; use `saaras:v3` and `bulbul:v3` as the documented defaults when an optional model variable is not provided.
- Continue automatic STT language detection when no valid language is selected. Keep explicit BCP-47 codes for TTS.
- Treat a missing Sarvam configuration as a clear server configuration error, rather than returning a fabricated transcript in production paths.
- Keep REST TTS requests at or below Bulbul v3's documented 2,500-character request limit.

## Curriculum retrieval

For question-paper verification, use a graph pre-filter over the teacher-selected books, class, and subject, followed by exact cosine similarity within that bounded scope. This is deterministic and cannot discard relevant selected-book chunks before filtering, unlike the current global ANN top-K approach. The existing Aura vector index remains available for the unscoped chat-agent search.

## Chat streaming

Return a `ReadableStream` response immediately and enqueue each NDJSON delta as the agent emits it. On a terminal provider error after the stream has opened, emit a typed NDJSON `error` event. Persist the assistant message before emitting `done`; if persistence fails, emit `error` and do not claim the turn completed.

## Regression protection

Add Vitest as a development-only dependency. Unit tests will cover queue persistence/retry behaviour, ordered server transcript assembly and completion rules, route input schemas, exact scoped retrieval query construction, Sarvam model configuration defaults, and incremental NDJSON writing. Existing lint and strict TypeScript checks remain required. Live Aura and Sarvam scripts are not executed during automated unit tests because they require real credentials and may write external state.

## Non-goals

- No native recorder module, widget, or background service redesign.
- No schema migration that changes existing node identities.
- No use of client-side Neo4j or Sarvam credentials.
- No rewrite of the Neo-Brutal visual design.

## Design review

The design is intentionally incremental: it fixes data loss and data-authority failures at their source, limits changes to known boundaries, and adds tests before implementation. It does not claim that Expo Audio can provide gap-free segmentation when its documented API does not expose that capability.
