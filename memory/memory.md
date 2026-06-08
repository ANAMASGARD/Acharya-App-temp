# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§5 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, question paper verify/generate, teacher community) |
| **Phase** | **Phase 10 — Chat Acharya polish** ✅ committed on `dev` (`f0cc500`) |
| **Previous phases** | Phase 9 swipeable tabs (`0f5f7da`), Phase 8 Home + Community (`40bf9fa`), Phase 7c Question Paper RAG |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — recorder, calendar, chat UI, notes, Home + community; **chat keyboard sticky composer needs dev build** (`react-native-keyboard-controller`) |
| **Default tab on launch** | **Recorder** (`/(tabs)/recorder`) |

### What works today

**Chat Acharya (Phase 10)**

- **Dedicated chat LLM** — `OPENROUTER_CHATBOX_MODEL` (e.g. `google/gemini-2.5-flash-lite`) for inbox only; recorder/analysis stays on `OPENROUTER_MODEL`
- **Multilingual coach prompt** — all 22 scheduled Indian languages in native scripts (Devanagari, Tamil, Bengali, Gurmukhi, etc.); short precise answers by default; long answers only when teacher asks
- **WhatsApp-style caching** — `messageCache` in `chat-store` + `chat-history-store`; instant show on tab/conversation switch; background revalidate; no spinner when cache hit
- **History drawer** — rename + delete with confirm dialogs; keyboard-aware edit title (`use-keyboard-height`); Aura-backed list prefetch on tab focus
- **Stage-based loading** — reply phases `sent → analyzing → preparing → almost_ready` tied to stream lifecycle (no infinite text loop); mascot pulse + wave dots in `chat-loading-indicator`
- **Floating composer UX** — transparent dock (no white strip); absolute overlay; `composerInset` padding so last message stays visible above input
- **Keyboard** — `react-native-keyboard-controller` (`KeyboardProvider`, `KeyboardStickyView`, `KeyboardAwareScrollView`); Android `softwareKeyboardLayoutMode: pan`

**Home Dashboard + Teacher Community (Phase 8)** — unchanged

**Question Paper Tool (Phase 7c)** — unchanged

**Navigation (Phase 9)**

- Swipeable bottom tabs; web tap-only fallback; live-only chat history (no demo cards)

**API routes (Clerk auth) — chat additions**

| Route | Role |
|-------|------|
| `PATCH /api/chat/conversations` | Rename conversation title |
| `DELETE /api/chat/conversations` | Delete conversation + messages |

**Not built yet**

- Chat **Voice** pill → Sarvam conversational agent
- Group chat unread counts / push notifications (v1 is poll-only)
- More than 2 subjects per class in curriculum sheet

**Validation (last run — 2026-06-08):**

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ pass |
| `npx tsc --noEmit` | ✅ pass |
| `npm run verify:neo4j` | ✅ pass — 2300 nodes, 2280 rels |
| `npm run neo4j:test` | ✅ pass — 8/8 integration tests |
| `npm run neo4j:test-api` | ✅ pass — API layer + health query |

**Env (server `.env`):**

```env
OPENROUTER_MODEL=...              # recorder / teaching report analysis
OPENROUTER_CHATBOX_MODEL=google/gemini-2.5-flash-lite   # Chat Acharya inbox only
```

---

## 2. Project Phase Map

```
Phase 0–7c   … prior phases (see §6 Commit Log)
Phase 8      Home Dashboard + Teacher Community
Phase 9      Swipeable tab navigation + live-only chat history drawer
Phase 10     Chat Acharya — caching, multilingual prompt, dedicated model, composer UX
```

---

## 3. Architecture Snapshot

### Chat (Phase 10)

```
app/api/chat/completions+api.ts     — NDJSON stream; buildChatSystemContent()
app/api/chat/conversations+api.ts   — list, rename, delete
lib/prompts/chat-coach.ts           — multilingual + short-answer system prompt
lib/openrouter.ts                   — streamChatCompletion → OPENROUTER_CHATBOX_MODEL
lib/ai-config.ts                    — getOpenRouterChatboxConfig()
lib/chat-stream.ts                  — onStreamOpen / onStreamActivity for reply phases
lib/graph/chat.ts                   — Aura Conversation + Message graph ops

store/chat-store.ts                 — messages + messageCache + replyPhase
store/chat-history-store.ts         — conversation list cache
hooks/use-chat.ts                   — stale-while-revalidate, phase transitions
hooks/use-chat-history.ts           — drawer + rename/delete + prefetch
hooks/use-keyboard-height.ts        — shared keyboard lift for dialogs

components/chat/chat-screen.tsx           — KeyboardStickyView floating composer
components/chat/chat-message-list.tsx     — composerInset paddingBottom
components/chat/chat-loading-indicator.tsx — mascot + dots + phase label
components/chat/chat-edit-title-dialog.tsx
components/chat/chat-delete-confirm-dialog.tsx
```

### Home + community / RAG / navigation

Unchanged from Phase 8–9 — see prior sections.

---

## 4. File map — Phase 10 (Chat)

| File | Role |
|------|------|
| `lib/ai-config.ts` | `OPENROUTER_CHATBOX_MODEL` + `getOpenRouterChatboxConfig()` |
| `lib/prompts/chat-coach.ts` | Multilingual native-script + brevity rules |
| `lib/openrouter.ts` | Chat stream uses chatbox config |
| `lib/chat-stream.ts` | Stream callbacks for reply phases |
| `lib/graph/chat.ts` | Rename/delete conversation Cypher |
| `app/api/chat/conversations+api.ts` | PATCH/DELETE handlers |
| `store/chat-store.ts` | Message cache + `ChatReplyPhase` |
| `store/chat-history-store.ts` | Global conversation list cache |
| `hooks/use-chat.ts` | Cache hydrate, silent refresh, phase machine |
| `hooks/use-chat-history.ts` | Rename/delete API + prefetch |
| `hooks/use-keyboard-height.ts` | Keyboard overlap for modals |
| `components/chat/chat-loading-indicator.tsx` | Branded loader |
| `components/chat/chat-edit-title-dialog.tsx` | Rename with keyboard lift |
| `components/chat/chat-delete-confirm-dialog.tsx` | Delete confirm |
| `components/chat/chat-screen.tsx` | Floating composer layout |
| `components/chat/chat-message-list.tsx` | Scroll inset above composer |
| `types/chat.ts` | `ChatReplyPhase` type |
| `app/_layout.tsx` | `KeyboardProvider` |
| `app.json` | Android `softwareKeyboardLayoutMode: pan` |
| `.env.example` | Documents `OPENROUTER_CHATBOX_MODEL` |

---

## 5. Current State

> **Status:** Phase 10 shipped on `dev` (`f0cc500`). Ready for PR to `main`.

| Topic | Implementation |
|-------|----------------|
| Chat LLM | Separate `OPENROUTER_CHATBOX_MODEL` (Gemini 2.5 Flash Lite); recorder unchanged on `OPENROUTER_MODEL` |
| Prompt | 22 Indian languages in native script; short answers default |
| Caching | Message + history list cache; no reload spinner on tab switch when cached |
| History UX | Rename/delete; keyboard-safe edit dialog |
| Loading UX | Stage-based status text (not looping); mascot + dots |
| Composer | Transparent floating bar; last message padded above input |
| Keyboard | `react-native-keyboard-controller` — dev build recommended |

---

## 6. Commit Log (oldest → newest)

### `0a3af7e` — feat: Question Paper Graph RAG with NCERT ingest and curriculum availability

- (prior entry unchanged)

### `40bf9fa` — feat: Home dashboard and teacher community with post images and welcome guide

- (prior entry unchanged)

### `0f5f7da` — feat: add swipeable bottom tabs and live-only chat history drawer

- Native swipeable tabs; removed demo chat history; validation pass

### `92373c8` — docs: fix Phase 9 commit hash in project memory

- Memory doc hash correction

### `f0cc500` — feat: polish Chat Acharya with caching, multilingual coach, and floating composer

- `OPENROUTER_CHATBOX_MODEL` for chat-only LLM; recorder stays on `OPENROUTER_MODEL`
- Chat coach prompt: 22 Indian languages in native scripts; short answers by default
- WhatsApp-style message + history caching (`chat-store`, `chat-history-store`)
- Rename/delete conversations; keyboard-aware edit title dialog
- Stage-based reply loading (`sent → analyzing → preparing → almost_ready`); branded mascot loader
- Floating composer (no white strip); `composerInset` so last message visible above input
- `react-native-keyboard-controller` for keyboard-aware scroll + sticky composer
- Aura graph + API for conversation rename/delete
- Validation: lint, tsc, verify:neo4j, neo4j:test, neo4j:test-api — all pass

---

## 7. Next Work (recommended order)

1. **Merge Phase 10 PR** — `dev` → `main`
2. **Manual test Chat** — Hindi/Marathi/Tamil native script replies; tab switch cache; rename/delete; keyboard open/close on Android dev build
3. **Chat voice agent** — Voice pill → Sarvam conversational agent
4. **Keyboard polish** — fine-tune sticky offset if tab bar overlap on specific devices

---

## 8. Agent Maintenance Instructions

When you finish a meaningful commit:

1. Move **§5 Current State** detail into **§6 Commit Log** with hash + subject.
2. Reset **§5** for new in-progress work.
3. Update **§1**, **§2**, **§3**, **§4** if routes or file map changed.

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
npm run verify:neo4j && npm run neo4j:test && npm run neo4j:test-api
npm run start:go -- --clear
npx expo run:android   # keyboard-controller native module
```

### Phase 10 test checklist

1. **Chat send** — status phases advance once (sent → analyzing → preparing → almost ready); mascot loader during stream
2. **Multilingual** — ask for Hindi answer → Devanagari script, not Roman letters; reply stays short unless "explain in detail"
3. **Cache** — send messages, switch tab, return → instant messages, no full-screen spinner
4. **History** — rename conversation (keyboard doesn't hide Save); delete with confirm
5. **Composer** — no white strip behind input; last message fully visible above chat box when scrolled to end
6. **Env** — set `OPENROUTER_CHATBOX_MODEL=google/gemini-2.5-flash-lite`; recorder still uses `OPENROUTER_MODEL`

---

*Last updated: 2026-06-08 — Phase 10 Chat Acharya polish on `dev`.*
