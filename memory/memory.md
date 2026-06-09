# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§5 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, question paper verify/generate, teacher community) |
| **Phase** | **Phase 12 — Glass pill tab bar** ✅ committed on `main` |
| **Previous phases** | Phase 11 tab preload (`f12d5fd`), Phase 10 Chat polish (`f0cc500`), Phase 9 swipeable tabs (`0f5f7da`) |
| **Branch** | `main` |
| **Runnable in Expo Go?** | Yes — recorder, calendar, chat UI, notes, Home + community; **chat keyboard sticky composer needs dev build** (`react-native-keyboard-controller`) |
| **Default tab on launch** | **Recorder** (`/(tabs)/recorder`) |

### What works today

**Glass pill tab bar (Phase 12)**

- **Floating dark frosted-glass dock** — `expo-blur` (`tint="dark"`) + light dark veil; background content bleeds through blurred
- **Pill layout** — 64px height, horizontal inset, 8px float gap above home indicator
- **Yellow indicator** — per-tab slot measurement; centered on icon anchor (50px circle)
- **Tab labels** — always visible; mint when inactive, white bold when active
- **Shared tokens** — `tab-bar-constants.ts` (layout), `tab-bar-glass.ts` (visual)
- **Chat composer** — `getTabBarOverlayHeight()` lifts sticky composer above floating bar

**Tab-wide preload (Phase 11)**

- Background warm on sign-in via `TabDataBootstrap` + Zustand stores (dashboard, calendar, chat, community preview)
- Stale-while-revalidate 60s TTL; sign-out resets all tab stores
- Calendar View Details preload — `calendar-session-detail-store` for instant modal

**Chat Acharya (Phase 10)** — dedicated chat LLM, caching, floating composer, keyboard-controller

**Home + Community (Phase 8)** — dashboard + feed preview from preload stores

**Not built yet**

- Chat **Voice** pill → Sarvam conversational agent
- AsyncStorage persist for tab preload caches

**Validation (last run — 2026-06-08):**

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ pass |
| `npx tsc --noEmit` | ✅ pass |
| `npm run verify:neo4j` | ✅ pass — 2301 nodes, 2281 rels |
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
Phase 11     Tab-wide async preload — Zustand bootstrap + stale-while-revalidate
Phase 12     Glass pill tab bar — dark frosted dock, icon alignment, chat clearance
```

---

## 3. Architecture Snapshot

### Navigation — glass tab bar (Phase 12)

```
components/navigation/tab-bar-constants.ts  — pill height, indicator, overlay height helper
components/navigation/tab-bar-glass.ts      — blur intensity, veil, border, icon/label colors
components/navigation/acharya-tab-bar.tsx   — BlurView pill shell, per-tab indicator positioning
components/navigation/tab-bar-item.tsx      — icon anchor + always-visible labels
components/navigation/tab-bar-icon.tsx      — Ionicons + glass-aware inactive tint
components/navigation/tab-lottie-icon.tsx   — recorder/profile Lottie on glass bar
components/chat/chat-screen.tsx             — composer offset via getTabBarOverlayHeight()
```

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
app/(tabs)/_layout.tsx               — TabDataBootstrap + SwipeableTabs lazy:false
app/(tabs)/_layout.web.tsx           — TabDataBootstrap + Tabs lazy:false
```

### Chat (Phase 10)

```
components/chat/chat-screen.tsx     — KeyboardStickyView floating composer above glass tab bar
store/chat-store.ts                 — messages, messageCache, fetchActiveConversation
store/chat-history-store.ts         — conversation list, fetchConversations
```

---

## 4. File map — Phase 12 (Glass tab bar)

| File | Role |
|------|------|
| `components/navigation/tab-bar-constants.ts` | Layout tokens + `getTabBarOverlayHeight()` |
| `components/navigation/tab-bar-glass.ts` | Dark frosted-glass visual tokens |
| `components/navigation/acharya-tab-bar.tsx` | Floating pill tab bar with BlurView + spring indicator |
| `components/navigation/tab-bar-item.tsx` | Tab press target, icon anchor, label styles |
| `components/navigation/tab-bar-icon.tsx` | Ionicons with mint inactive / black active |
| `components/navigation/tab-lottie-icon.tsx` | Recorder/profile Lottie variants |
| `components/navigation/tab-lottie-icon.web.tsx` | Web static mic fallback |
| `components/chat/chat-screen.tsx` | Composer `bottom` offset for floating bar clearance |

---

## 5. Current State

> **Status:** Phase 12 glass pill tab bar committed on `main`. No in-progress feature work.

| Topic | Implementation |
|-------|----------------|
| Tab bar chrome | Dark frosted glass pill, `expo-blur` + translucent veil, specular rim highlights |
| Indicator | Per-tab `onLayout` centering; 50px yellow circle on icon anchor |
| Labels | Mint inactive / white bold active — never hidden on focus |
| Chat UX | Composer + message list inset account for floating bar height |
| Out of scope | Separate search pill (reference dock); light/white glass variant (reverted — washed screen) |

---

## 6. Commit Log (oldest → newest)

### `0f5f7da` — feat: add swipeable bottom tabs and live-only chat history drawer

- Native swipeable tabs; removed demo chat history

### `f0cc500` — feat: polish Chat Acharya with caching, multilingual coach, and floating composer

- Dedicated chat LLM; message/history cache; keyboard-aware composer

### `f12d5fd` — perf: tab-wide async preload — instant tab switches via Zustand stale-while-revalidate

- `TabDataBootstrap`, domain stores, 60s stale TTL, web `lazy: false`

### `77b00e3` — perf: preload calendar session details for instant View Details modal

- `calendar-session-detail-store`; bootstrap + date-select prefetch

### `9bcff5e` — feat: add AI class notes with reflection/notes toggle in session detail

- Class notes pipeline in session detail modal

### `c624748` — feat: glass pill tab bar with dark frosted dock and chat composer alignment

- Replaced full-width black dock with floating blurred glass pill (`expo-blur`, dark tint)
- Extracted `tab-bar-constants.ts` + `tab-bar-glass.ts` for layout/visual tokens
- Per-tab indicator centering; always-visible tab labels; mint/white icon contrast
- Chat composer lifted above bar via `getTabBarOverlayHeight()`
- Validation: lint, tsc, verify:neo4j, neo4j:test, neo4j:test-api — all pass

---

## 7. Next Work (recommended order)

1. **Manual test tab bar** — scroll content behind pill on Home/Calendar; verify blur + indicator alignment on all 5 tabs
2. **Manual test chat** — composer sits above bar; messages scroll clear of composer + bar
3. **Chat voice agent** — Voice pill → Sarvam conversational agent

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

### Phase 12 test checklist

1. **Glass blur** — scroll Home; cream/cards visible blurred through dark pill
2. **Indicator** — swipe all 5 tabs; yellow circle centers on each icon
3. **Labels** — tab name visible when active (white bold) and inactive (mint)
4. **Recorder/Profile Lottie** — mic badge + settings animation on glass bar
5. **Chat** — composer above bar; last message not hidden behind pill
6. **Safe area** — pill floats with small gap above home indicator

---

*Last updated: 2026-06-08 — Phase 12 glass pill tab bar committed on `main`.*
