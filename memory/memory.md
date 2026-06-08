# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§5 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, question paper verify/generate, teacher community) |
| **Phase** | **Phase 11 — Tab-wide async preload** ✅ implemented on `dev` (uncommitted) |
| **Previous phases** | Phase 10 Chat polish (`f0cc500`), Phase 9 swipeable tabs (`0f5f7da`), Phase 8 Home + Community (`40bf9fa`) |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — recorder, calendar, chat UI, notes, Home + community; **chat keyboard sticky composer needs dev build** (`react-native-keyboard-controller`) |
| **Default tab on launch** | **Recorder** (`/(tabs)/recorder`) |

### What works today

**Tab-wide preload (Phase 11)**

- **Background warm on sign-in** — `TabDataBootstrap` + `useTabBootstrap` fires parallel fetches as soon as signed-in tabs mount; teacher can wait on Recorder while Home, Calendar, Chat, and community preview load in background
- **Zustand domain stores** — `dashboard-store`, `calendar-sessions-store`, `community-feed-store`; chat list + active conversation fetch consolidated into `chat-history-store` / `chat-store`
- **Stale-while-revalidate** — 60s TTL (`TAB_DATA_STALE_MS`); tab focus only silent-refreshes when stale; pull-to-refresh / Retry uses `force: true`
- **No spinner on cache hit** — hooks read warm in-memory data; `isLoading` only when `status === "loading"` and no cached rows
- **Sign-out reset** — bootstrap clears all tab stores; no stale prior-user data in session
- **Web parity** — `lazy: false` on web tabs + same bootstrap entry point
- **Calendar View Details preload** — `calendar-session-detail-store` caches session report + transcript summary; bootstrap prefetches 5 recent sessions; selecting a date prefetches all visible session cards; modal opens instantly when cache hit

**Chat Acharya (Phase 10)**

- Dedicated chat LLM (`OPENROUTER_CHATBOX_MODEL`); multilingual coach prompt; message + history cache; rename/delete; stage-based loading; floating composer; keyboard-controller

**Home Dashboard + Teacher Community (Phase 8)** — dashboard + feed preview now preloaded via Phase 11 stores

**Question Paper Tool (Phase 7c)** — unchanged

**Navigation (Phase 9)** — swipeable bottom tabs; web tap-only fallback

**Not built yet**

- Chat **Voice** pill → Sarvam conversational agent
- Group chat unread counts / push notifications (v1 is poll-only)
- AsyncStorage persist for dashboard/calendar preload (in-memory only by design)
- Community groups segment preload (still lazy until user taps Groups)

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
Phase 11     Tab-wide async preload — Zustand bootstrap + stale-while-revalidate across tabs
```

---

## 3. Architecture Snapshot

### Tab preload (Phase 11)

```
types/async-resource.ts              — AsyncStatus, TAB_DATA_STALE_MS, isStale()
store/dashboard-store.ts             — Home dashboard cache + fetch
store/calendar-sessions-store.ts     — Calendar session list cache + fetch
store/calendar-session-detail-store.ts — Per-session detail + class report summary cache
store/community-feed-store.ts        — Keyed feed cache (home preview key "2")
store/chat-history-store.ts          — + fetchConversations(), status, lastFetchedAt
store/chat-store.ts                  — + fetchActiveConversation(), lastFetchedAt
hooks/use-tab-bootstrap.ts           — Parallel warm on sign-in; reset on sign-out
components/navigation/tab-data-bootstrap.tsx — Null mount in tab layouts

hooks/use-home-dashboard.ts          — reads dashboard-store; focus = silent stale refresh
hooks/use-calendar-sessions.ts       — reads calendar-sessions-store; local UI state for modal/date
hooks/use-community-feed.ts          — store-backed when limit=2 (home preview)
hooks/use-chat.ts                    — delegates to chat-store fetch
hooks/use-chat-history.ts            — delegates to chat-history-store fetch

app/(tabs)/_layout.tsx               — TabDataBootstrap + SwipeableTabs lazy:false
app/(tabs)/_layout.web.tsx           — TabDataBootstrap + Tabs lazy:false
```

### Chat (Phase 10)

```
app/api/chat/completions+api.ts     — NDJSON stream; buildChatSystemContent()
app/api/chat/conversations+api.ts   — list, rename, delete
store/chat-store.ts                 — messages, messageCache, fetchActiveConversation
store/chat-history-store.ts         — conversation list, fetchConversations
hooks/use-chat.ts                   — stale-while-revalidate, phase transitions
hooks/use-chat-history.ts           — drawer + rename/delete
components/chat/chat-screen.tsx     — KeyboardStickyView floating composer
```

### Home + community / RAG / navigation

Dashboard and home community preview served from Phase 11 stores; full community feed page (`limit: 20`) still local-state fetch on navigation.

---

## 4. File map — Phase 11 (Tab preload)

| File | Role |
|------|------|
| `types/async-resource.ts` | Shared async fetch metadata + stale TTL |
| `store/dashboard-store.ts` | Dashboard API cache |
| `store/calendar-sessions-store.ts` | Sessions list API cache |
| `store/calendar-session-detail-store.ts` | View Details + class summary cache per sessionId |
| `store/community-feed-store.ts` | Keyed community feed cache |
| `store/chat-history-store.ts` | + `fetchConversations`, status, reset |
| `store/chat-store.ts` | + `fetchActiveConversation`, `resetTabData` |
| `hooks/use-tab-bootstrap.ts` | Orchestrates parallel tab warm |
| `components/navigation/tab-data-bootstrap.tsx` | Bootstrap mount point |
| `hooks/use-home-dashboard.ts` | Store-backed dashboard hook |
| `hooks/use-calendar-sessions.ts` | Store-backed sessions hook |
| `hooks/use-community-feed.ts` | Store-backed when `limit === 2` |
| `hooks/use-chat.ts` | Store-backed conversation fetch |
| `hooks/use-chat-history.ts` | Store-backed history fetch |
| `app/(tabs)/_layout.tsx` | Native bootstrap wiring |
| `app/(tabs)/_layout.web.tsx` | Web bootstrap + eager tab mount |

---

## 5. Current State

> **Status:** Phase 11 implemented on `dev` (uncommitted). Ready for commit + PR.

| Topic | Implementation |
|-------|----------------|
| Bootstrap | `Promise.allSettled` warms dashboard, sessions, chat list, active chat, home feed on sign-in |
| Stores | In-memory Zustand with deduped fetch, 60s stale TTL, sign-out reset |
| Hooks | Thin selectors; focus = silent revalidate; force refresh on pull/retry |
| UX | Swipe to Home/Calendar/Chat after ~2s on Recorder → no blocking spinners when warm |
| Web | `lazy: false` + same bootstrap as native |
| Out of scope | Persist preload to AsyncStorage; groups segment; full feed page; recorder list API |

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

### Phase 11 (uncommitted) — feat: tab-wide async preload with Zustand bootstrap

- `TabDataBootstrap` warms dashboard, calendar sessions, chat history, active conversation, home feed in parallel on sign-in
- New stores: `dashboard-store`, `calendar-sessions-store`, `community-feed-store`; extended chat stores with fetch actions
- `types/async-resource.ts` — shared stale-while-revalidate helpers (60s TTL)
- Hooks refactored to read stores; tab focus silent-revalidates when stale only
- Web tabs `lazy: false` for eager mount parity with native swipe tabs
- Sign-out resets all tab preload stores

---

## 7. Next Work (recommended order)

1. **Commit Phase 11** — tab preload feature + memory update
2. **Manual test preload** — sign in, wait on Recorder 3–5s, swipe tabs; confirm instant content; verify no duplicate fetch within 60s
3. **Merge PR** — `dev` → `main` (Phase 10 + 11)
4. **Chat voice agent** — Voice pill → Sarvam conversational agent

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

### Phase 11 test checklist

1. **Bootstrap** — sign in → land on Recorder → wait 3–5s → Network tab shows dashboard/sessions/chat/feed requests without visiting those tabs
2. **Instant swipe** — swipe Home / Calendar / Chat → content visible immediately, no full-screen spinner
3. **Stale TTL** — return to same tab within 60s → no duplicate fetch burst
4. **Force refresh** — pull-to-refresh Calendar / Retry on Home error → data reloads
5. **Sign out** — sign out → sign in as same or different user → no stale prior-user tab data
6. **Web** — same behavior with tab clicks (`lazy: false`)

### Phase 10 test checklist

1. **Chat send** — status phases advance once; mascot loader during stream
2. **Multilingual** — Hindi answer in Devanagari; short by default
3. **Cache** — tab switch returns instant messages
4. **History** — rename/delete with keyboard-safe dialog
5. **Composer** — no white strip; last message visible above input

---

*Last updated: 2026-06-08 — Phase 11 tab-wide async preload on `dev` (uncommitted).*
