# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§4 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, notes verification) |
| **Phase** | **Phase 6b — Record → Analyze → Calendar** ✅ **complete (`8a512d2` on `dev`)** |
| **Previous phases** | Phase 6 calendar (`9284a51`), Phase 5b recorder (`bbeb082`) |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — recorder + calendar verified; see **§10 Dev workflow** |
| **Last committed feature** | OpenRouter class analysis, Aura report persistence, Neo-Brutal Class Reflection UI, env-driven AI config |

### What works today (if `.env` is configured)

**Auth (needs `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` only)**

- Onboarding, Sign Up / Sign In, OTP, OAuth — unchanged from prior phases
- Language gate + SecureStore prefs — unchanged

**Tab navigation (`app/(tabs)/`)**

- Home, Profile — implemented
- **Calendar tab** — **full teaching calendar** with analyzed sessions only
- **Recorder tab** — **full live pipeline** with Class Reflection after Send
- Chat — placeholder

**Teaching Calendar (`/(tabs)/calendar` — Phase 6 + 6b) ✅**

- Neo-Brutal month picker with session dots on recorded days
- **Only sessions with `HAS_REPORT`** in Aura (no ghost 0-min cards)
- Date-filtered session cards: subject/class pills, time, duration, **score badge**
- `useFocusEffect` refresh when tab focused + pull-to-refresh
- Session detail modal — **yellow header**, colored Class Reflection sections (matches design ref)
- Empty states: no sessions ever / no sessions on selected day → Go to Recorder
- **Bookmark toggle** per session (SecureStore via `calendar-store`)

**Recorder (`/(tabs)/recorder` — Phase 5b + 6b) ✅**

End-to-end flow verified in Expo Go (foreground):

1. Teacher fills **topic / subject / class** → taps yellow **Record**
2. Mic goes live → timer runs → **Stop**
3. **Class Transcribe** card shows Sarvam transcript
4. **Send** → OpenRouter teaching coach → **Class Reflection** panel (shared UI component)
5. Session appears on Calendar after analysis (score + report in Aura)

**Sarvam STT — working**

- Per-chunk REST STT via `POST /api/sarvam/stt`
- Model from env: `SARVAM_STT_MODEL` (e.g. `saaras:v3`) via `lib/ai-config.ts`
- Auto language detection — Hindi/English/Marathi/etc.

**OpenRouter analysis — working (env-driven)**

- Model from env: `OPENROUTER_MODEL` only — **no hardcoded model IDs in app code**
- `lib/ai-config.ts` — single source for `OPENROUTER_*` and `SARVAM_*` env
- `POST /api/recorder/analyze` → truth-seeking coach prompt → structured JSON + `overallScore`
- Persists `(Session)-[:HAS_TRANSCRIPT]->(Transcript)` and `(Session)-[:HAS_REPORT]->(Report)` + `s.score`
- Short-transcript guard (min 50 chars); no silent mock when API key missing
- Free models may return HTTP 429 rate limit from OpenRouter upstream — not a code bug

**AuraDB (needs full `.env`)**

- Calendar list: `listSessionsByTeacher` filters `HAS_REPORT` only
- Session detail: `getSessionDetail` with report + transcript preview
- CLI scripts: `verify:neo4j`, `neo4j:test`, `neo4j:test-api`

**Validation (last run — 2026-06-06):**

- `npm run lint` — pass
- `npx tsc --noEmit` — pass

### Not built yet

- Chat Acharya, notes verification (RAG)
- Live Home data from Aura (dashboard static placeholders cleared; streak/activity empty)
- Background / screen-off recording polish (dev build milestone)
- True **system audio** capture (requires custom native build)

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
Phase 5  Recorder UI        ✅ committed   `58e1274`
Phase 5b Recorder pipeline  ✅ committed   `bbeb082` — Sarvam STT, OpenRouter → Aura
Phase 6  Teaching calendar  ✅ committed   `9284a51` — Aura session history, bookmarks
Phase 6b Analyze + reflect  ✅ this commit OpenRouter coach, score, Class Reflection UI
Phase 7  Core product       ⬜ planned     chat, notes RAG, Home from Aura
```

---

## 3. Architecture Snapshot

### Record → Analyze → Calendar flow (Phase 6b)

```
Recorder tab
  hooks/use-recorder.ts
    ├── POST /api/sessions (create Session)
    ├── POST /api/sarvam/stt (per-chunk STT)
    └── POST /api/recorder/analyze (Send)
          ├── lib/ai-config.ts → OPENROUTER_MODEL from .env
          ├── lib/prompts/teaching-analysis.ts (coach prompt)
          ├── lib/openrouter.ts (json_schema + one retry)
          └── lib/graph/recorder.ts → saveTranscriptAndReport + s.score

Calendar tab
  hooks/use-calendar-sessions.ts (useFocusEffect refresh)
    └── GET /api/sessions
          └── lib/graph/session.ts → HAS_REPORT filter only
```

### Calendar — code map

```
Teacher UI
  app/(tabs)/calendar.tsx
    └── components/calendar/calendar-screen.tsx
          ├── TeachingCalendar
          ├── SessionCard (score badge, bookmark, View Details)
          ├── SessionDetailModal (yellow header, ClassReflectionSections)
          └── class-reflection-sections.tsx (shared with recorder report)

Data
  hooks/use-calendar-sessions.ts
  store/calendar-store.ts (bookmarks)

Backend
  lib/graph/session.ts — listSessionsByTeacher (HAS_REPORT), getSessionDetail
  lib/graph/recorder.ts — saveTranscriptAndReport
  app/api/recorder/analyze+api.ts
  app/api/sessions+api.ts
```

### AI config — code map

```
lib/ai-config.ts          ← ONLY place to read model env vars
  OPENROUTER_MODEL        → lib/openrouter.ts
  OPENROUTER_API_KEY
  SARVAM_STT_MODEL        → lib/sarvam.ts
  SARVAM_API_KEY
```

### Routes (Expo Router)

| Route | File | Notes |
|-------|------|-------|
| `/(tabs)/calendar` | `app/(tabs)/calendar.tsx` | Analyzed sessions only |
| `/(tabs)/recorder` | `app/(tabs)/recorder.tsx` | Send → Class Reflection |
| `/api/sessions` | `app/api/sessions+api.ts` | List, detail, create, PATCH duration |
| `/api/sarvam/stt` | `app/api/sarvam/stt+api.ts` | Per-chunk Sarvam STT |
| `/api/recorder/analyze` | `app/api/recorder/analyze+api.ts` | OpenRouter coach report |

---

## 4. Current State (working tree)

> **Status:** Phase 6b committed on `dev` (`8a512d2`). Working tree clean.

### Phase 6b decisions

| Topic | Implementation |
|-------|----------------|
| LLM model source | `OPENROUTER_MODEL` in `.env` only — `lib/ai-config.ts` |
| STT model source | `SARVAM_STT_MODEL` in `.env` only — `lib/ai-config.ts` |
| No silent OpenRouter mock | Missing key → `auth_config` error surfaced in recorder UI |
| Calendar ghost sessions | Cypher filter: `(Session)-[:HAS_REPORT]->(:Report)` |
| Report shape | 4 reflection fields + `overallScore` 0–100 |
| Score on Session | `s.score` written on analyze; badge on session card |
| Shared reflection UI | `class-reflection-sections.tsx` — recorder + calendar modal |
| Calendar refresh | `useFocusEffect` + pull-to-refresh |
| Transcript guard | Min 50 chars before OpenRouter call (422) |

---

## 5. Stack (installed)

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54, Expo Router, React 19 |
| Styling | NativeWind v5 + StyleSheet |
| Auth | Clerk `@clerk/expo` + `@clerk/backend` |
| State | Zustand — `preferences-store`, `recorder-store`, `calendar-store` |
| Recording | `expo-audio`, `expo-file-system` |
| STT | Sarvam via `SARVAM_STT_MODEL` env (server only) |
| Analysis | OpenRouter via `OPENROUTER_MODEL` env (server only) |
| Database | Neo4j AuraDB — Session, AudioChunk, Transcript, Report |

---

## 6. Commit Log (oldest → newest)

### `58e1274` — feat: core recorder screen UI with simulated record state (Phase 5)

### `2608fe9` — docs: mark Phase 5 recorder UI committed in project memory

### `bbeb082` — feat: live recorder pipeline with Sarvam STT and OpenRouter coach reports

### `9284a51` — feat: teaching calendar with Aura session history and bookmarked cards

### `31d327d` — docs: record Phase 6 calendar commit hash in project memory

### `8a512d2` — feat: wire OpenRouter class analysis to Aura and calendar Class Reflection UI

- Port truth-seeking coach prompt from reference web app + `overallScore`
- `lib/ai-config.ts` — env-only model config (no hardcoded LLM/STT model IDs)
- Calendar shows analyzed sessions only; score badge; focus refresh
- Neo-Brutal Class Reflection sections (shared recorder + modal)
- Short-transcript guard; persist score on Session node in Aura

---

## 7. Next Work (recommended order)

1. **Wire Home to Aura** — replace static `data/home-dashboard.ts` with live session stats
2. **Chat Acharya** — in-app coach (Sarvam voice + backend LLM via `ai-config`)
3. **Notes verification UI** — RAG on Aura vector index
4. **Dev build** — background recording + optional system-audio native module

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
| `prompt_material/06-teaching-calendar.png` | Calendar + Class Reflection modal — **implemented** |
| `prompt_material/05-core-recorder.png` | Recorder — implemented |
| `prompt_material/04-home-dashboard.png` | Home — implemented |
| `prompt_material/09-notes-verify.png` | Notes verification — planned |

---

## 10. Dev workflow (Expo Go on Android)

### Required `.env` (server AI)

```env
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free   # change model here only
SARVAM_API_KEY=...
SARVAM_STT_MODEL=saaras:v3
```

Restart after changes: `npx expo start --clear`

### Recorder → Calendar test checklist

1. Record 30–60s → Stop → wait for transcript → **Send**
2. Class Reflection panel appears with 4 colored sections + score
3. Open **Calendar** tab — session on today with score badge
4. **View Details** — yellow header modal with full reflection

### Commands

| Scenario | Command |
|----------|---------|
| Expo Go | `npm run start:go -- --clear` |
| Lint + types | `npm run lint && npx tsc --noEmit` |
| Aura health | `npm run verify:neo4j && npm run neo4j:test && npm run neo4j:test-api` |
| Apply schema | `npm run neo4j:apply-schema` |

---

*Last updated: 2026-06-06 — Phase 6b `8a512d2` on `dev`.*
