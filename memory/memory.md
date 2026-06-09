# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§5 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, question paper verify/generate, teacher community) |
| **Phase** | **Phase 14 — Recorder Sarvam-30B analysis** ✅ reflection + class notes on native Sarvam LLM |
| **Previous phases** | Phase 13 voice agent, Phase 12 glass tab bar (`6b6c374`), Phase 11 tab preload (`f12d5fd`) |
| **Branch** | `main` |
| **Runnable in Expo Go?** | Yes — recorder, calendar, chat (text + **voice**), notes, Home + community |
| **Default tab on launch** | **Recorder** (`/(tabs)/recorder`) |

### What works today

**Chat Acharya voice agent (Phase 13) — ✅ end-to-end on Expo Go**

- **Voice pill** in Chat → live two-way coaching with **Sarvam AI** (Saaras STT → Sarvam-30B → Bulbul TTS)
- **Local dev:** Expo Go + Python **`services/voice-local/`** over WebSocket (`./voice-backend.sh` + `./expo-local.sh`)
- **Production / EAS APK:** **LiveKit Cloud** + **`services/voice-livekit/`** (deploy script: `scripts/deploy-voice-livekit.sh`) — not used in Expo Go
- **Single root `.env`** — no per-service env files; Python loads via `REPO_ROOT`
- **Multilingual:** 22+ Indian languages; explicit switch (e.g. Marathi, Tamil, Hindi) locks reply language until user changes again
- **Voice → chat history:** turn-level transcripts appear in chat UI during call; persisted to Neo4j on End via `/api/voice/transcript-batch`
- **Mic lifecycle:** mic active only during voice session; End stops recorder, closes WebSocket, disables recording mode

**Glass pill tab bar (Phase 12)** — dark frosted dock, yellow indicator, chat composer clearance

**Tab-wide preload (Phase 11)** — background warm on sign-in, 60s stale TTL

**Chat Acharya text (Phase 10)** — dedicated chat LLM, caching, floating composer

**Home + Community (Phase 8)** — dashboard + feed preview

**Recorder pipeline (Phase 14) — post-STT analysis**

- **STT:** Sarvam **Saaras v3** with **`languageCode: auto`** per chunk — no fixed language; Sarvam auto-detects among 23 Indian languages + English
- **LLM (reflection + class notes):** native **Sarvam-30B** via `SARVAM_LLM_MODEL` + `sarvamChatCompletion()` — **not** OpenRouter/Gemma for recorder
- **Reflection:** `analyzeTeachingTranscript()` → strict JSON coach report → Neo4j `Report` node (teaching-analysis prompt unchanged in spirit; JSON-only system prompt added)
- **Class notes:** `generateClassNotes()` → student revision notes → Neo4j `ClassNotes` node; prompt adds subject-aware sections, math/numericals, ASCII diagrams
- **Sarvam LLM fix:** `reasoning_effort: null` + `contentOnly` — default reasoning mode left `content` empty on longer English transcripts; up to 3 retries + flexible JSON key normalization
- **Analyze API:** reflection first, then notes (sequential); new recordings clear stale `classNotes` in store

**Validation (last run — 2026-06-09):**

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ pass |
| `npx tsc --noEmit` | ✅ pass |
| `npm run verify:neo4j` | ✅ pass |
| `npm run neo4j:test` | ✅ pass |
| `npm run neo4j:test-api` | ✅ pass |
| Voice (manual, Expo Go) | ✅ hear, understand, multilingual reply, chat history, End clean |

**Env (server `.env` — voice minimum):**

```env
SARVAM_API_KEY=...
VOICE_SESSION_SIGNING_SECRET=...
VOICE_AGENT_WEBHOOK_SECRET=...
# EAS/APK + LiveKit only:
# LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_AGENT_NAME, ACHARYA_API_BASE_URL
```

---

## 2. Project Phase Map

```
Phase 0–7c   … prior phases (see §6 Commit Log)
Phase 8      Home Dashboard + Teacher Community
Phase 9      Swipeable tab navigation + live-only chat history drawer
Phase 10     Chat Acharya — caching, multilingual prompt, dedicated model, composer UX
Phase 11     Tab-wide async preload — Zustand bootstrap + stale-while-revalidate
Phase 12     Glass pill tab bar — dark frosted dock, icon alignment, chat clearance
Phase 13     Chat Acharya voice agent — Sarvam pipeline, Expo Go local gateway, LiveKit for deploy
Phase 14     Recorder analysis — Sarvam-30B reflection + class notes; Saaras v3 auto STT; JSON/reasoning fixes
```

---

## 3. Architecture Snapshot

### Voice agent — two runtimes, one product flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  EXPO GO (local)                    EAS APK / production (deploy)        │
├─────────────────────────────────────────────────────────────────────────┤
│  App (React Native)                 App (dev build / store build)        │
│    → POST /api/voice/session          → POST /api/voice/session          │
│    → WSS ws://<LAN>:8080/voice        → LiveKit room + token             │
│                                       → services/voice-livekit/ agent    │
│  services/voice-local/ (Python)                                          │
│    FastAPI + WebSocket                                                   │
│    Sarvam STT → Sarvam-30B → Bulbul TTS                                  │
│    On hangup → POST /api/voice/transcript-batch → Neo4j Aura             │
└─────────────────────────────────────────────────────────────────────────┘
```

| Layer | Expo Go | EAS / deployed |
|-------|---------|----------------|
| **Transport** | WebSocket (`lib/voice/transports/websocket-transport.ts`) | LiveKit (`lib/voice/transports/livekit-transport.ts`) |
| **Backend** | `services/voice-local/` uvicorn `:8080` | `services/voice-livekit/` on Fly/LiveKit |
| **Session mint** | `app/api/voice/session+api.ts` + `lib/voice/session-token.ts` | same API; returns LiveKit URL/token |
| **Prompt source** | `lib/prompts/voice-agent.ts` → `npm run sync:voice-prompt` | synced copies in both Python services |
| **Secrets** | Root `.env` only | Root `.env` + cloud deploy secrets |

### Local dev commands (two terminals)

```bash
# Terminal 1 — Python voice gateway
./voice-backend.sh

# Terminal 2 — Expo Go
./expo-local.sh   # npx expo start --go --clear
```

`voice-backend.sh` sets `VOICE_GATEWAY_WSS_URL=ws://<LAN-IP>:8080/voice` and `ACHARYA_API_BASE_URL=http://127.0.0.1:8081` for transcript upload to Expo API routes.

### Voice pipeline (voice-local) — current behavior

1. Opening TTS: *"Namaste, I am Acharya AI."* → `ready` → client starts mic slices (~1.25s)
2. **Silence endpointing:** ~**1.5s** silence after speech → STT merge → LLM → TTS reply
3. **Language lock:** user request (e.g. *मराठी में बात*) sets `locked_reply_language`; LLM gets `append_language_lock()`; TTS uses locked code (not Hindi fallback from Devanagari)
4. **LLM:** `reasoning_effort=None` on Sarvam-30B (avoids empty `content` when reasoning eats tokens)
5. **End:** hangup → transcript batch → chat refresh; mic/recorder torn down safely (`safeStopRecorder`)

### Key files (Phase 13)

```
lib/prompts/voice-agent.ts              — system prompt + opening line (source of truth)
hooks/use-voice-agent.ts                — connect/disconnect, chat store sync, audio mode
lib/voice/transports/websocket-transport.ts — Expo Go mic slices + WebSocket
lib/voice/session-token.ts              — JWT for voice gateway auth
lib/graph/voice-session.ts            — Neo4j transcript sync + ensureConversationForTeacher
app/api/voice/session+api.ts            — mint session (derives wss URL from request host)
app/api/voice/transcript-batch+api.ts   — webhook from Python (requireVoiceSecrets only)
services/voice-local/voice_gateway/     — session.py, language.py, sarvam/* (STT/LLM/TTS)
services/voice-livekit/                 — LiveKit agent for production path
docs/VOICE.md                           — operator guide
voice-backend.sh / expo-local.sh        — local run scripts
```

### Navigation + chat (prior phases)

```
components/chat/chat-screen.tsx         — Voice pill, VoiceSessionBar, message list
components/chat/voice/voice-session-bar.tsx
store/chat-store.ts                     — messages + voice transcript append + fetch on End
```

---

## 4. Phase 13 — Voice agent story (compact chat history)

**Goal:** In-app voice coach for teachers using **Sarvam only** (no VAPI/ElevenLabs), Neo4j for history, simple local test without Fly.io.

**Evolution (what we built and fixed):**

| Stage | What happened |
|-------|----------------|
| **Scaffold** | Renamed `voice-gateway` → `voice-local`, `voice-agent-livekit` → `voice-livekit`; single `docs/VOICE.md`; root `.env`; `voice-backend.sh` + `expo-local.sh` |
| **Connectivity** | Fixed sarvamai pin, Metro port for API, STT mime (`.m4a`), session `wssUrl` from request LAN IP |
| **Hearing** | Silence-based turns (not fixed 2.5s record chunks); async Sarvam in thread pool; mic sends during “thinking”, pauses during TTS playback |
| **LLM empty replies** | Sarvam-30B `reasoning_effort=None` — reasoning mode was consuming token budget |
| **Intake loop** | Prompt rewritten: live coaching, not “collect three fields then end call” |
| **Multilingual** | Prompt + `language.py` lock; Marathi ≠ Hindi (Devanagari trap); TTS/STT use locked BCP-47 code |
| **End call / chat** | Transcript API used `requireVoiceSecrets` (not full gateway URL); `ensureConversationForTeacher`; voice turns in chat UI; `safeStopRecorder` for Android `stop failed` |
| **UX tune** | Silence timeout 2.5s → **1.5s**; language switch detection for *मराठी में बात*, *जवाब दें*, etc. |

**Current user-verified state:** Hears correctly, answers teaching questions, multilingual switch works, chat shows voice history, End is clean. **Do not regress voice pipeline when touching unrelated features.**

---

## 5. Current State

> **Status:** Phase 14 recorder analysis on **Sarvam-30B** (reflection + class notes). Phase 13 voice agent still working on Expo Go with `voice-local`.

| Topic | Implementation |
|-------|----------------|
| Recorder STT | Saaras v3, `STT_AUTO_DETECT` (`auto`) — per-chunk language auto-detect |
| Recorder LLM | Sarvam-30B (`SARVAM_LLM_MODEL`) for teaching report + class notes — OpenRouter only for chat/RAG/vision |
| Recorder prompts | `lib/prompts/teaching-analysis.ts` (JSON coach), `lib/prompts/class-notes.ts` (rich student notes) |
| Sarvam chat helper | `lib/sarvam.ts` → `sarvamChatCompletion()` with `reasoning_effort: null`, `contentOnly` |
| Local voice | `./voice-backend.sh` + `./expo-local.sh` → WebSocket to `:8080` |
| Deploy voice | LiveKit + `services/voice-livekit/` + `scripts/deploy-voice-livekit.sh` |
| AI stack | Sarvam Saaras STT, Sarvam-30B LLM, Bulbul TTS — keys server-side only |
| Turn taking | 1.25s audio slices; **1.5s** end-of-turn silence |
| Languages | Voice: locked reply language; Recorder STT: auto-detect |
| Chat integration | Real-time transcript bubbles + Neo4j persist on disconnect |
| Mic | On only when Voice session active; full teardown on End |

### Key files (Phase 14)

```
lib/ai-config.ts              — SARVAM_LLM_MODEL (default sarvam-30b)
lib/sarvam.ts                 — sarvamChatCompletion() for recorder LLM
lib/openrouter.ts             — analyzeTeachingTranscript + generateClassNotes → Sarvam
lib/prompts/teaching-analysis.ts — JSON-only system prompt + coach user prompt
lib/prompts/class-notes.ts    — subject-aware notes, math, ASCII diagrams
app/api/recorder/analyze+api.ts — sequential report then notes
hooks/use-recorder.ts         — clear classNotes on new recording
```

---

## 6. Commit Log (oldest → newest)

### `0f5f7da` — feat: add swipeable bottom tabs and live-only chat history drawer

### `f0cc500` — feat: polish Chat Acharya with caching, multilingual coach, and floating composer

### `f12d5fd` — perf: tab-wide async preload — instant tab switches via Zustand stale-while-revalidate

### `77b00e3` — perf: preload calendar session details for instant View Details modal

### `9bcff5e` — feat: add AI class notes with reflection/notes toggle in session detail

### `6b6c374` — feat: glass pill tab bar with dark frosted dock and chat composer alignment

### *(pending commit)* — feat: Chat Acharya voice agent — Sarvam local gateway + LiveKit deploy path

- `services/voice-local/` WebSocket gateway; `services/voice-livekit/` for production
- Expo Go transport; session + transcript-batch API routes; Neo4j voice session sync
- Multilingual language lock, silence endpointing, chat history from voice
- Docs: `docs/VOICE.md`; scripts: `voice-backend.sh`, `expo-local.sh`, `localvoiceagent.sh`

### *(this commit)* — feat: recorder analysis on Sarvam-30B with robust JSON and richer class notes

- Switch recorder reflection + class notes from OpenRouter/Gemma to native Sarvam-30B (`SARVAM_LLM_MODEL`)
- Add `sarvamChatCompletion()` with `reasoning_effort: null` and content-only extraction (fixes empty JSON on long English transcripts)
- JSON-only teaching coach system prompt; flexible report parsing; 3-attempt retry
- Richer class notes prompt: subject sections, math notation, numericals, ASCII diagrams
- Analyze API runs report then notes; recorder store clears stale notes on new session

---

## 7. Next Work (recommended order)

1. **Commit Phase 13 voice** — single focused PR after final manual pass on Android Expo Go
2. **EAS dev build** — test LiveKit transport on device (not Expo Go)
3. **Deploy voice-livekit** — Fly/LiveKit + public `ACHARYA_API_BASE_URL` for transcript webhook
4. **Manual regression** — text chat, recorder, calendar unchanged after voice work
5. **Optional** — voice session bar “speaking” waveform; barge-in while agent talks

---

## 8. Agent Maintenance Instructions

When you finish a meaningful commit:

1. Move **§5 Current State** detail into **§6 Commit Log** with hash + subject.
2. Reset **§5** for new in-progress work.
3. Update **§1**, **§2**, **§3**, **§4** if routes or file map changed.

**Voice agent rule:** Prefer `docs/VOICE.md` for ops. Do not reintroduce per-service `.env` files. Expo Go = `voice-local`; production APK = LiveKit.

---

## 9. Design References

| File | Screen |
|------|--------|
| `prompt_material/08-teacher-community.png` | Community feed on Home — **implemented** |
| `prompt_material/09-notes-verify.png` | Notes upload — implemented |
| `prompt_material/06-teaching-calendar.png` | Calendar — implemented |
| `prompt_material/05-core-recorder.png` | Recorder — implemented |

---

## 10. Dev workflow

### Commands

```bash
npm run lint && npx tsc --noEmit
npm run sync:voice-prompt    # after editing lib/prompts/voice-agent.ts
./voice-backend.sh           # Terminal 1 — voice AI
./expo-local.sh              # Terminal 2 — Expo Go
npm run verify:neo4j && npm run neo4j:test && npm run neo4j:test-api
```

### Phase 13 voice test checklist (Expo Go)

1. **Start** — Voice pill → opening line → “Listening…”
2. **Speak** — teaching question → ~1.5s pause → thinking → spoken answer
3. **Language** — *मराठी में बात करें* → next replies in Marathi (not Hindi)
4. **Chat history** — user + assistant turns visible in message list
5. **End** — mic off; no `AudioRecorder.stop` error; transcript saved (no 500 in backend log)
6. **Reconnect** — Voice pill again starts fresh session

---

*Last updated: 2026-06-09 — Phase 14 recorder uses Sarvam-30B for reflection + class notes; Saaras v3 auto STT; lint/tsc/Neo4j verification all pass.*
