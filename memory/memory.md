# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§4 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, notes verification) |
| **Phase** | **Phase 7 — Chat Acharya** ✅ **committed** (`9d2aca5`) |
| **Previous phases** | Phase 6b analyze + calendar (`d692ea9`) |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — recorder + calendar + chat verified; see **§10 Dev workflow** |
| **Default tab on launch** | **Recorder** (`/(tabs)/recorder`) — cold start, login, language pick |

### What works today (if `.env` is configured)

**Auth (needs `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` only)**

- Onboarding, Sign Up / Sign In, OTP, OAuth — unchanged from prior phases
- Language gate + SecureStore prefs — unchanged

**Tab navigation (`app/(tabs)/`)**

- Home, Profile — implemented
- **Recorder tab** — default entry point on app start / restart / post-login
- **Calendar tab** — full teaching calendar with analyzed sessions only
- **Recorder tab** — full live pipeline with Class Reflection after Send
- **Chat tab** — **Chat Acharya** minimalist Neo-Brutal coach UI

**Teaching Calendar (`/(tabs)/calendar` — Phase 6 + 6b) ✅**

- Neo-Brutal month picker with session dots on recorded days
- **Only sessions with `HAS_REPORT`** in Aura (no ghost 0-min cards)
- Date-filtered session cards: subject/class pills, time, duration, **score badge**
- `useFocusEffect` refresh when tab focused + pull-to-refresh
- Session detail modal — **yellow header**, colored Class Reflection sections
- Empty states → Go to Recorder
- **Bookmark toggle** per session (SecureStore via `calendar-store`)

**Recorder (`/(tabs)/recorder` — Phase 5b + 6b) ✅**

End-to-end flow verified in Expo Go (foreground):

1. Teacher fills **topic / subject / class** → taps yellow **Record**
2. Mic goes live → timer runs → **Stop**
3. **Class Transcribe** card shows Sarvam transcript
4. **Send** → OpenRouter teaching coach → **Class Reflection** panel
5. Session appears on Calendar after analysis (score + report in Aura)

**Sarvam STT — working**

- Per-chunk REST STT via `POST /api/sarvam/stt` (recorder)
- Chat dictation via `POST /api/chat/stt` (no Session/AudioChunk)
- Model from env: `SARVAM_STT_MODEL` via `lib/ai-config.ts`

**OpenRouter analysis — working (env-driven)**

- Model from env: `OPENROUTER_MODEL` only — **no hardcoded model IDs**
- Recorder: `POST /api/recorder/analyze` → structured JSON + `overallScore`
- Chat: `POST /api/chat/completions` → NDJSON streaming coach (buffered server response)

**AuraDB (needs full `.env`)**

- Calendar: `listSessionsByTeacher` filters `HAS_REPORT` only
- Chat graph: `(Teacher)-[:HAS_CONVERSATION]->(ChatConversation)-[:HAS_MESSAGE]->(ChatMessage)`
- Chat history list + delete via `DELETE /api/chat/conversations?conversationId=…`
- CLI scripts: `verify:neo4j`, `neo4j:test`, `neo4j:test-api`

**Validation (last run — 2026-06-06):**

- `npm run lint` — pass
- `npx tsc --noEmit` — pass

### Chat Acharya (`/(tabs)/chat` — Phase 7) ✅

**Backend**

- `lib/prompts/chat-coach.ts` — teacher coach prompt (distinct from recorder analyze)
- `lib/graph/chat.ts` — create/list/load/delete conversations + messages; `contextSnapshot` once per conversation
- `lib/openrouter.ts` — `streamChatCompletion()` for OpenRouter SSE
- `lib/chat-stream.ts` — client NDJSON parser
- API routes:
  - `POST /api/chat/completions` — NDJSON proxy + Aura persist (buffered body for expo-server)
  - `GET/POST/DELETE /api/chat/conversations` — load, list history, new chat, delete
  - `POST /api/chat/stt` — chat dictation (no session graph)
  - `POST /api/sarvam/tts` — Bulbul TTS (throws on missing Sarvam key)
- `neo4j/schema.cypher` — ChatConversation / ChatMessage constraints + indexes

**Frontend**

- Minimalist Neo-Brutal UI: yellow header (large mascot logo + red Upload pill → `/notes/upload`)
- **Chat history drawer** — spring slide-in from left, full-bleed top, `expo-blur` backdrop with fade in/out
- Neo-Brutal history cards (yellow, delete button, demo fallback when list empty)
- **Composer** — docked above tab bar; Android keyboard lift (composer stays above keyboard)
- Toolbar layout: **Voice** (left, animated wave bars) | **Mic** (STT dictation) | **Send** (pink circle, arrow-up)
- STT on **mic** (record → transcribe → auto-send); **Voice** reserved for future Sarvam voice agent
- `store/chat-store.ts` persists `conversationId` only; messages from Aura on focus
- `hooks/use-chat.ts`, `use-chat-history.ts`, `use-voice-input.ts`, `use-voice-output.ts`

### Not built yet

- Notes verification (RAG) — `/notes/upload` is placeholder
- Live Home data from Aura
- Chat **Voice** button → Sarvam conversational voice agent
- Background / screen-off recording polish (dev build milestone)

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
Phase 6b Analyze + reflect  ✅ committed   `d692ea9` — OpenRouter coach, score, Class Reflection UI
Phase 7  Chat Acharya       ✅ committed   `9d2aca5` — NDJSON coach, voice STT/TTS, Aura chat graph, drawer UI
Phase 7b Core product       ⬜ planned     notes RAG, Home from Aura, voice agent
```

---

## 3. Architecture Snapshot

### Chat flow (Phase 7)

```
Chat tab
  hooks/use-chat.ts
    ├── GET /api/chat/conversations (load / list / new)
    ├── POST /api/chat/completions (NDJSON stream)
    └── hooks/use-voice-input.ts → POST /api/chat/stt

Aura
  lib/graph/chat.ts
    (Teacher)-[:HAS_CONVERSATION]->(ChatConversation)-[:HAS_MESSAGE]->(ChatMessage)
```

### Record → Analyze → Calendar flow (Phase 6b)

```
Recorder tab → POST /api/sarvam/stt → POST /api/recorder/analyze → Aura
Calendar tab → GET /api/sessions (HAS_REPORT filter)
```

### Routes (Expo Router)

| Route | File | Notes |
|-------|------|-------|
| `/(tabs)/recorder` | `app/(tabs)/recorder.tsx` | **Default tab** on launch |
| `/(tabs)/chat` | `app/(tabs)/chat.tsx` | Chat Acharya coach |
| `/(tabs)/calendar` | `app/(tabs)/calendar.tsx` | Analyzed sessions only |
| `/api/chat/completions` | `app/api/chat/completions+api.ts` | NDJSON streaming coach |
| `/api/chat/conversations` | `app/api/chat/conversations+api.ts` | Load / list / create / delete |
| `/api/chat/stt` | `app/api/chat/stt+api.ts` | Chat voice STT |
| `/api/sarvam/tts` | `app/api/sarvam/tts+api.ts` | Bulbul read-aloud |
| `/notes/upload` | `app/notes/upload.tsx` | Placeholder for notes verification |

---

## 4. Current State

> **Status:** Phase 7 Chat Acharya committed (`9d2aca5`). Next: voice agent, notes RAG.

### Phase 7 decisions

| Topic | Implementation |
|-------|----------------|
| Streaming | NDJSON default; server buffers lines (expo-server pipe fix) |
| Chat STT | Separate route — no Session/AudioChunk reuse |
| Persist client-side | `conversationId` only in AsyncStorage |
| Voice UX split | Mic = dictation STT; Voice pill = future agent |
| History drawer | Reanimated spring + `expo-blur` backdrop; full-bleed top |
| Default tab | `initialRouteName="recorder"` + redirects to `/(tabs)/recorder` |
| Android keyboard | Keyboard listeners lift composer above tab bar + keyboard |
| `softwareKeyboardLayoutMode` | `"resize"` in `app.json` for Android |

---

## 5. Stack (installed)

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54, Expo Router, React 19 |
| Styling | NativeWind v5 + StyleSheet |
| Auth | Clerk `@clerk/expo` + `@clerk/backend` |
| State | Zustand — preferences, recorder, calendar, **chat** stores |
| Recording | `expo-audio`, `expo-file-system` |
| Blur | `expo-blur` (chat history drawer backdrop) |
| STT / TTS | Sarvam via env (server only) |
| Analysis / Chat | OpenRouter via env (server only) |
| Database | Neo4j AuraDB — Session, Report, **ChatConversation**, **ChatMessage** |

---

## 6. Commit Log (oldest → newest)

### `58e1274` — feat: core recorder screen UI with simulated record state (Phase 5)

### `2608fe9` — docs: mark Phase 5 recorder UI committed in project memory

### `bbeb082` — feat: live recorder pipeline with Sarvam STT and OpenRouter coach reports

### `9284a51` — feat: teaching calendar with Aura session history and bookmarked cards

### `31d327d` — docs: record Phase 6 calendar commit hash in project memory

### `d692ea9` — feat: wire OpenRouter class analysis to Aura and calendar Class Reflection UI

### `9d2aca5` — feat: Chat Acharya with Aura graph, voice input, and Neo-Brutal coach UI

- NDJSON chat completions + OpenRouter streaming coach
- Aura ChatConversation / ChatMessage graph + history list/delete
- Sarvam chat STT + TTS API routes
- Minimalist chat UI: drawer with blur, keyboard-aware composer, mic/send/voice toolbar
- Recorder as default tab on app launch
- `expo-blur` for history drawer backdrop

---

## 7. Next Work (recommended order)

1. **Chat voice agent** — wire Voice pill to Sarvam conversational agent
2. **Notes verification UI** — RAG on Aura vector index (`/notes/upload`)
3. **Wire Home to Aura** — live session stats from graph
4. **Dev build** — background recording polish

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
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
SARVAM_API_KEY=...
SARVAM_STT_MODEL=saaras:v3
SARVAM_TTS_MODEL=bulbul:v3
```

Restart after changes: `npx expo start --clear`

### Chat test checklist

1. Open **Chat** tab → composer docked above tab bar
2. Type message → tap pink **send** arrow → streaming reply
3. Tap **mic** → speak → stop → transcript auto-sends
4. Hamburger → history drawer slides in with blur; tap card to load; delete removes from Aura
5. Cold start app → lands on **Recorder** tab

### Commands

| Scenario | Command |
|----------|---------|
| Expo Go | `npm run start:go -- --clear` |
| Lint + types | `npm run lint && npx tsc --noEmit` |
| Aura health | `npm run verify:neo4j && npm run neo4j:test && npm run neo4j:test-api` |
| Apply schema | `npm run neo4j:apply-schema` |

---

*Last updated: 2026-06-06 — Phase 7 Chat Acharya committed (`9d2aca5`).*
