# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§4 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, notes verification) |
| **Phase** | **Phase 6 — Teaching Calendar** ✅ **complete (committed on `dev`)** |
| **Previous phases** | Phase 0–5b → Recorder pipeline (`bbeb082`) |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — recorder + calendar verified; see **§10 Dev workflow** |
| **Last committed feature** | Phase 6 teaching calendar — Aura session history, Neo-Brutal UI, bookmarks |

### What works today (if `.env` is configured)

**Auth (needs `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` only)**

- Onboarding, Sign Up / Sign In, OTP, OAuth — unchanged from prior phases
- Language gate + SecureStore prefs — unchanged

**Tab navigation (`app/(tabs)/`)**

- Home, Profile — implemented
- **Calendar tab** — **full teaching calendar** (Phase 6)
- **Recorder tab** — **full live pipeline** (Phase 5b)
- Chat — placeholder

**Teaching Calendar (`/(tabs)/calendar` — Phase 6) ✅**

- Neo-Brutal month picker with session dots on recorded days
- Date-filtered session cards from live Aura `(Teacher)-[:TAUGHT]->(Session)` query
- Subject/class color pills, period labels, time + duration, View Details
- Session detail modal — transcript preview + coach report when available
- Empty states: no sessions ever / no sessions on selected day → Go to Recorder
- **Bookmark toggle** per session (yellow when active, persisted in SecureStore via `calendar-store`)

**Recorder (`/(tabs)/recorder` — Phase 5b) ✅**

End-to-end flow verified in Expo Go (foreground):

1. Teacher fills **topic / subject / class** → taps yellow **Record**
2. Status shows **Starting** with animated dots
3. Mic goes live → button turns **red**, timer runs
4. Teacher taps **Stop** → **Class Transcribe** card shows Sarvam transcript
5. **Send** → OpenRouter teaching coach report → **Report** panel

**Sarvam STT (`saaras:v3`) — working**

- Per-chunk REST STT via `POST /api/sarvam/stt`
- Auto language detection — Hindi/English/Marathi/etc. in spoken script
- Client uploads audio as base64 JSON
- Backend: `lib/sarvam.ts` → Aura `AudioChunk` nodes

**OpenRouter analysis — working**

- Model: `google/gemma-4-26b-a4b-it:free` (env `OPENROUTER_MODEL`)
- `POST /api/recorder/analyze` → structured coach JSON → Aura Transcript/Report

**AuraDB (needs full `.env`)**

- Session list + detail for calendar via `GET /api/sessions` and `?sessionId=`
- `neo4j.int()` for LIMIT in Cypher (fixes Aura integer validation)
- CLI scripts pass: `verify:neo4j`, `neo4j:test`, `neo4j:test-api`

**Validation (last run — 2026-06-06):**

- `npm run lint` — pass
- `npx tsc --noEmit` — pass
- `npm run verify:neo4j` — pass (37 nodes, 36 rels)
- `npm run neo4j:test` — pass (8 integration tests)
- `npm run neo4j:test-api` — pass

### Not built yet

- Chat Acharya, notes verification (RAG)
- Live Home data from Aura (dashboard still static)
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
Phase 6  Teaching calendar  ✅ committed   Aura session history, cards, bookmarks
Phase 7  Core product       ⬜ planned     chat, notes RAG, Home from Aura
```

---

## 3. Architecture Snapshot

### Calendar — code map (Phase 6)

```
Teacher UI
  app/(tabs)/calendar.tsx
    └── components/calendar/calendar-screen.tsx
          ├── TeachingCalendar (month grid, dots, selection)
          ├── SessionCard (period, subject/class pills, bookmark, View Details)
          └── SessionDetailModal (report + transcript preview)

Data
  hooks/use-calendar-sessions.ts
    ├── GET /api/sessions (once on mount, getToken via ref — no refetch loop)
    └── GET /api/sessions?sessionId=… (detail modal)

State
  store/calendar-store.ts   bookmarkedSessionIds (SecureStore persist)

Display helpers
  lib/calendar/date-utils.ts       month matrix, formatters
  lib/calendar/session-display.ts  subject/class colors + labels from recorder options

Reusable UI
  components/ui/neo-card.tsx
  components/ui/neo-button.tsx

Backend
  lib/graph/session.ts
    ├── listSessionsByTeacher (neo4j.int limit)
    └── getSessionDetail (Session + HAS_REPORT + HAS_TRANSCRIPT)
  app/api/sessions+api.ts
    ├── GET list (limit default 100)
    └── GET ?sessionId= detail

Types
  types/calendar.ts   CalendarSession, SessionDetail
```

### Recorder pipeline — code map (Phase 5b)

```
Teacher UI
  app/(tabs)/recorder.tsx
    └── components/recording/recorder-screen.tsx

Orchestration: hooks/use-recorder.ts
State: store/recorder-store.ts
Audio: lib/recording/*
Backend STT: app/api/sarvam/stt+api.ts
Backend analyze: app/api/recorder/analyze+api.ts
Backend sessions: app/api/sessions+api.ts
```

### Routes (Expo Router)

| Route | File | Notes |
|-------|------|-------|
| `/(tabs)/calendar` | `app/(tabs)/calendar.tsx` | Teaching calendar + session cards |
| `/(tabs)/recorder` | `app/(tabs)/recorder.tsx` | Live recorder pipeline |
| `/api/sessions` | `app/api/sessions+api.ts` | List, detail, create, PATCH duration |
| `/api/sarvam/stt` | `app/api/sarvam/stt+api.ts` | Per-chunk Sarvam STT |
| `/api/recorder/analyze` | `app/api/recorder/analyze+api.ts` | OpenRouter coach report |

---

## 4. Current State (working tree)

> **Status:** Phase 6 calendar committed on `dev`. Working tree clean after push.

### Phase 6 calendar decisions

| Topic | Implementation |
|-------|----------------|
| No refetch loop | `getToken` stored in ref; fetch once on mount |
| No pull-to-refresh spinner | Removed RefreshControl; silent background fetch |
| Empty UX | Friendly cards only — never raw API errors for empty days |
| Neo4j LIMIT | `neo4j.int(safeLimit)` — Aura rejects plain JS numbers |
| Subject/class labels | Resolved from `data/recorder-options.ts` |
| Bookmarks | Zustand + SecureStore; yellow filled icon when active |

---

## 5. Stack (installed)

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54, Expo Router, React 19 |
| Styling | NativeWind v5 + StyleSheet |
| Auth | Clerk `@clerk/expo` + `@clerk/backend` |
| State | Zustand — `preferences-store`, `recorder-store`, **`calendar-store`** |
| Recording | `expo-audio`, `expo-file-system` |
| STT | Sarvam `saaras:v3` (server only) |
| Analysis | OpenRouter — Gemma 4 26B free |
| Database | Neo4j AuraDB — Session, AudioChunk, Transcript, Report |

---

## 6. Commit Log (oldest → newest)

### `58e1274` — feat: core recorder screen UI with simulated record state (Phase 5)

### `2608fe9` — docs: mark Phase 5 recorder UI committed in project memory

### `bbeb082` — feat: live recorder pipeline with Sarvam STT and OpenRouter coach reports

### `9284a51` — feat: teaching calendar with Aura session history and bookmarked cards

- Neo-Brutal calendar grid + date-filtered session cards from Aura
- Subject/class color pills, period labels, session detail modal
- Bookmark toggle persisted in SecureStore
- `getSessionDetail` Cypher + `neo4j.int()` LIMIT fix on session list

---

## 7. Next Work (recommended order)

1. **Wire Home to Aura** — replace static `data/home-dashboard.ts`
2. **Chat Acharya** — in-app coach (Sarvam voice + backend LLM)
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
| `prompt_material/06-teaching-calendar.png` | Calendar — **implemented** (Phase 6) |
| `prompt_material/05-core-recorder.png` | Recorder — implemented (Phase 5b) |
| `prompt_material/04-home-dashboard.png` | Home — implemented |
| `prompt_material/09-notes-verify.png` | Notes verification — planned |

---

## 10. Dev workflow (Expo Go on Android)

### Calendar test checklist

1. `npm run start:go -- --clear`
2. Sign in; open **Calendar** tab
3. Days with recordings show dots; tap a day to see session cards
4. Tap bookmark → turns yellow; persists after reload
5. Tap **View Details** → modal with session info + report if analyzed
6. Empty day → "No sessions on this day" + Go to Recorder

### Recorder test checklist

1. Record 15–30s on Recorder tab → Stop → Send
2. Return to Calendar — session appears on today's date

### Commands

| Scenario | Command |
|----------|---------|
| Expo Go | `npm run start:go -- --clear` |
| Lint + types | `npm run lint && npx tsc --noEmit` |
| Aura health | `npm run verify:neo4j && npm run neo4j:test && npm run neo4j:test-api` |
| Apply schema | `npm run neo4j:apply-schema` |

---

*Last updated: 2026-06-06 — Phase 6 teaching calendar complete on `dev`.*
