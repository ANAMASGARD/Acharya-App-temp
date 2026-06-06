# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§4 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, notes verification) |
| **Phase** | **Phase 5b — Recorder pipeline** ✅ **complete (uncommitted, ready to commit)** |
| **Previous phases** | Phase 0–3.6 → Phase 4 Home (`849c971`) → Phase 4b Profile (`8da15e7`) → Phase 5 Recorder UI (`58e1274`) |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — foreground recorder + STT verified; see **§10 Dev workflow** |
| **Last committed feature** | Phase 5 recorder UI only (`58e1274`) — simulated state |
| **Latest work (uncommitted)** | **Phase 5b** — live `expo-audio`, Sarvam STT (`saaras:v3`), OpenRouter coach, Aura persistence |

### What works today (if `.env` is configured)

**Auth (needs `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` only)**

- Onboarding, Sign Up / Sign In, OTP, OAuth — unchanged from prior phases
- Language gate + SecureStore prefs — unchanged

**Tab navigation (`app/(tabs)/`)**

- Home, Profile — implemented; Calendar / Chat — placeholders
- **Recorder tab** — **full live pipeline** (not simulated)

**Recorder (`/(tabs)/recorder` — Phase 5b) ✅**

End-to-end flow verified in Expo Go (foreground):

1. Teacher fills **topic / subject / class** → taps yellow **Record**
2. Status shows **Starting** with animated dots (`recorder-starting-label.tsx`)
3. Mic goes live → button turns **red**, timer runs
4. Teacher taps **Stop** → **Class Transcribe** card shows Sarvam transcript
5. **Send** → OpenRouter teaching coach report → **Report** panel

**Sarvam STT (`saaras:v3`) — working**

- Per-chunk REST STT via `POST /api/sarvam/stt` (chunks ≤22s)
- **Auto language detection** — omit fixed `language_code`; Hindi/English/Marathi/etc. transcribed in spoken script
- Client uploads audio as **base64 JSON** (reliable in Expo Go vs multipart FormData)
- Backend: `lib/sarvam.ts` → Sarvam SDK; Aura `AudioChunk` nodes via `lib/graph/recorder.ts`

**OpenRouter analysis — working**

- Model: `google/gemma-4-26b-a4b-it:free` (env `OPENROUTER_MODEL`)
- `POST /api/recorder/analyze` → structured 4-section coach JSON → Aura `Transcript` + `Report` nodes

**AuraDB (needs full `.env`)**

- `AudioChunk` constraint in `neo4j/schema.cypher`
- Session create `POST /api/sessions`, duration `PATCH /api/sessions`
- CLI scripts still pass: `verify:neo4j`, `neo4j:test`, `neo4j:test-api`

**Validation (last run — 2026-06-06):**

- `npm run lint` — pass
- `npx tsc --noEmit` — pass
- Neo4j integration scripts — pass (prior session)
- `npx expo export --platform web` — pass (prior session)

### Not built yet

- Calendar session list from Aura, chat coach, notes verification (RAG)
- Live Home data from Aura (dashboard still static)
- Background / screen-off recording polish (dev build milestone)
- True **system audio** capture (requires custom native build; Expo Go uses mic + `mixWithOthers` for classroom media)

---

## 2. Project Phase Map

```
Phase 0  Bootstrap          ✅ committed   Expo 54 shell, AGENTS.md
Phase 1  Design system      ✅ committed   theme/, global.css, fonts
Phase 2  Onboarding         ✅ committed   /onboarding
Phase 3  Auth + AuraDB      ✅ committed   Clerk, API routes, Neo4j graph
Phase 3.5 Language pick     ✅ committed   `/language`, SecureStore prefs
Phase 3.6 Tab navigation    ✅ committed   custom bar, Lottie mic + settings
Phase 4  Home dashboard     ✅ committed   `849c971`
Phase 4b Profile/Settings   ✅ committed   `8da15e7`
Phase 5  Recorder UI        ✅ committed   `58e1274` — UI shell (was simulated)
Phase 5b Recorder pipeline  ✅ DONE        expo-audio, Sarvam STT, OpenRouter → Aura
Phase 6  Core product       ⬜ planned     calendar UI, chat, notes RAG on Aura
```

---

## 3. Architecture Snapshot

### Recorder pipeline — code map (Phase 5b)

```
Teacher UI
  app/(tabs)/recorder.tsx
    └── components/recording/recorder-screen.tsx
          ├── RecorderSessionCard (form, timer, button, status)
          ├── RecorderTranscriptPanel (Class Transcribe + Send)
          └── RecorderReportPanel (coach report after Send)

Orchestration
  hooks/use-recorder.ts
    ├── start: status "starting" → parallel mic + POST /api/sessions
    ├── stop: flush final chunk → drain STT queue → status "ready"
    └── send: POST /api/recorder/analyze

State
  store/recorder-store.ts
    └── idle → starting → recording → stopping → draining → ready → analyzing → completed | failed

Audio capture
  lib/recording/chunk-recorder.ts     22s segment rotation + final flush on stop
  lib/recording/recorder-prepare.ts   ensureRecorderPrepared() — no double-prepare
  lib/recording/recording-preset.ts   mono 16 kHz m4a; Android unprocessed mic
  lib/recording/constants.ts          CHUNK_DURATION_SEC=22, STT_AUTO_DETECT="auto"

Upload + merge (client)
  lib/recording/chunk-upload-queue.ts   base64 STT upload, retries, file cleanup
  lib/recording/recorder-api.ts           apiUploadSttChunk, apiAnalyzeTranscript
  lib/recording/transcript-merge.ts       ordered merge + seam dedup
  lib/recording/transcript-state.ts       mergedTranscript, pending counts
  lib/recording/queue-persistence.ts      AsyncStorage queue recovery

Backend — STT
  app/api/sarvam/stt+api.ts
    └── lib/sarvam.ts (saaras:v3, auto-detect when language omitted)
    └── lib/graph/recorder.ts → upsertAudioChunk

Backend — analysis
  app/api/recorder/analyze+api.ts
    └── lib/openrouter.ts (strict JSON schema coach report)
    └── lib/graph/recorder.ts → saveTranscriptAndReport

Backend — sessions
  app/api/sessions+api.ts   GET list, POST create, PATCH duration

Types
  types/recorder.ts   RecorderPipelineStatus, chunks, TeachingReport, SttChunkResponse
```

### Routes (Expo Router)

| Route | File | Notes |
|-------|------|-------|
| `/(tabs)/recorder` | `app/(tabs)/recorder.tsx` | Live recorder pipeline |
| `/api/sarvam/stt` | `app/api/sarvam/stt+api.ts` | Per-chunk Sarvam STT + Aura chunk |
| `/api/recorder/analyze` | `app/api/recorder/analyze+api.ts` | OpenRouter coach + Aura transcript/report |
| `/api/sessions` | `app/api/sessions+api.ts` | Session CRUD + duration |

### Key UI components (`components/recording/`)

| File | Role |
|------|------|
| `recorder-screen.tsx` | Composes session card, transcript, report |
| `recorder-session-card.tsx` | Form + timer + `RecordingButton` + status |
| `recorder-starting-label.tsx` | Animated "Starting..." dots while mic/API init |
| `recorder-status-label.tsx` | Status text, errors, partial-send prompt |
| `recorder-transcript-panel.tsx` | Class Transcribe card + Send |
| `recorder-report-panel.tsx` | 4-section coach report after analysis |
| `recording-button.tsx` | Yellow play → red stop |

### Removed / replaced

| Old | New |
|-----|-----|
| `hooks/use-recorder-ui.ts` (simulated timer) | **deleted** → `hooks/use-recorder.ts` |

### Env vars (`.env.example` updated)

```
SARVAM_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
```

Plus existing Clerk + Neo4j Aura vars.

---

## 4. Current State (working tree)

> **Status:** Phase 5b complete — **ready to commit and open PR**. User will push manually.

### Uncommitted changes (Phase 5b)

**New files**

- `hooks/use-recorder.ts`
- `store/recorder-store.ts`
- `types/recorder.ts`
- `lib/sarvam.ts`, `lib/openrouter.ts`, `lib/graph/recorder.ts`
- `lib/recording/*` (chunk-recorder, upload queue, merge, prepare, api, constants, preset, persistence)
- `app/api/sarvam/stt+api.ts`
- `app/api/recorder/analyze+api.ts`
- `components/recording/recorder-report-panel.tsx`
- `components/recording/recorder-starting-label.tsx`

**Modified**

- `app.json` — expo-audio plugin, mic permission, background recording
- `package.json` — `expo-audio`, `expo-file-system`, `@openrouter/sdk`, `sarvamai`
- `app/api/sessions+api.ts` — PATCH duration
- `neo4j/schema.cypher` — `AudioChunk` uniqueness
- Recorder UI components wired to real store
- `.env.example`, `lib/api-client.ts`, `data/languages.ts`

**Deleted**

- `hooks/use-recorder-ui.ts`

### Phase 5b UX / reliability decisions

| Topic | Implementation |
|-------|----------------|
| Fast perceived start | `starting` status + dots; mic starts parallel with Aura session POST |
| No double-prepare crash | `lib/recording/recorder-prepare.ts` — `ensureRecorderPrepared()` |
| Short recordings (<22s) | Final segment flushed on **Stop** in `chunk-recorder.ts` |
| STT language | `STT_AUTO_DETECT` — Sarvam auto-detect 23 languages |
| Classroom audio | `mixWithOthers` + Android `unprocessed` mic (not internal system tap) |
| Chunk upload | Base64 JSON to `/api/sarvam/stt` |

---

## 5. Stack (installed)

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54, Expo Router, React 19 |
| Styling | NativeWind v5 + StyleSheet (recorder) |
| Auth | Clerk `@clerk/expo` + `@clerk/backend` |
| State | Zustand — `preferences-store`, **`recorder-store`** |
| Recording | **`expo-audio`**, **`expo-file-system`** (legacy API for base64 read) |
| STT | **Sarvam `saaras:v3`** via `sarvamai` SDK (server only) |
| Analysis | **OpenRouter** `@openrouter/sdk` — Gemma 4 26B free |
| Database | **Neo4j AuraDB** — Session, AudioChunk, Transcript, Report |

---

## 6. Commit Log (oldest → newest)

_(Prior commits unchanged — see git log. Next entry after user commits Phase 5b.)_

### `58e1274` — feat: core recorder screen UI with simulated record state (Phase 5)

### `2608fe9` — docs: mark Phase 5 recorder UI committed in project memory

### _(pending)_ — feat: Phase 5b live recorder pipeline with Sarvam STT and OpenRouter coach

- Replace simulated `use-recorder-ui` with `expo-audio` + Zustand pipeline
- Sarvam `saaras:v3` per-chunk STT with auto language detection
- OpenRouter structured teaching report → Aura Transcript/Report
- Starting UX, Class Transcribe card, report panel

---

## 7. Next Work (recommended order)

1. **Calendar** — `(Teacher)-[:TAUGHT]->(Session)` history from Aura
2. **Wire Home to Aura** — replace static `data/home-dashboard.ts`
3. **Chat Acharya** — in-app coach (Sarvam voice + backend LLM)
4. **Notes verification UI** — RAG on Aura vector index
5. **Dev build** — background recording + optional system-audio native module

---

## 8. Agent Maintenance Instructions

When you finish a meaningful commit:

1. Move **§4 Current State** into **§6 Commit Log** with hash + subject.
2. Reset **§4** or note new in-progress work.
3. Update **§1 Quick Read**, **§2 Phase Map**, **§3** if needed.

---

## 9. Design References

| File | Screen |
|------|--------|
| `prompt_material/05-core-recorder.png` | Recorder — **UI + live pipeline** (Phase 5b) |
| `prompt_material/04-home-dashboard.png` | Home — implemented |
| `prompt_material/06-teaching-calendar.png` | Calendar — planned |
| `prompt_material/09-notes-verify.png` | Notes verification — planned |

---

## 10. Dev workflow (Expo Go on Android)

### Recorder test checklist

1. `npm run start:go -- --clear`
2. Sign in; fill topic, subject, class on Recorder tab
3. Record 15–30s speech (try Hindi or English) → Stop
4. Confirm **Class Transcribe** shows text in spoken language
5. Tap **Send** → coach report appears below
6. Ensure `.env` has `SARVAM_API_KEY`, `OPENROUTER_API_KEY`, Neo4j + Clerk vars

### Commands

| Scenario | Command |
|----------|---------|
| Expo Go | `npm run start:go -- --clear` |
| Lint + types | `npm run lint && npx tsc --noEmit` |
| Aura health | `npm run verify:neo4j` |
| Apply schema | `npm run neo4j:apply-schema` |

### Known non-fatal warnings

- Clerk codegen warnings in Expo Go
- `expo-file-system/legacy` deprecation notices (chunk upload queue)
- `expo-doctor`: missing `expo-asset` peer for `expo-audio` (optional install)

---

*Last updated: 2026-06-06 — Phase 5b recorder pipeline complete (Sarvam STT verified). Uncommitted on `dev`.*
