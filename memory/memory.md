# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§4 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, notes verification) |
| **Phase** | **Phase 4 — Home dashboard** (implemented in working tree; **not committed yet**) |
| **Previous phases** | Phase 0–2 committed → Phase 3 Auth + Aura (`4ac6e6f`) → Phase 3.5 Language (`cab10a0`) → Phase 3.6 Tabs (`c5a006f`) |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — auth, language gate, tab shell, **Home dashboard UI**; **AuraDB requires full `.env`** (see §3 Environment) |
| **Last committed feature** | Custom animated bottom tabs (`c5a006f`) |
| **Latest work (uncommitted)** | Home dashboard matching `04-home-dashboard.png` — Clerk greeting, static cards, large logo in yellow header |

### What works today (if `.env` is configured)

**Auth (needs `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` only)**

- Onboarding at `/onboarding` → Get Started → `/sign-up`
- Custom Sign Up / Sign In (Neo-Brutal UI, no password fields)
- Email OTP via Clerk (6-digit modal, auto-submit on last digit)
- Google / Facebook OAuth via `useSSO` + browser (Expo Go)
- Signed-in users: **no language saved** → `/language`; after Confirm → `/(tabs)` (Home tab)
- Language preference persisted via Zustand + **expo-secure-store** (used for gate; **not shown on Home header**)
- Signed-out users → `/onboarding`

**Tab navigation (`app/(tabs)/`)**

- Order: **Home | Calendar | Recorder (center) | Chat | Profile**
- Custom `AcharyaTabBar`: black bar, mint inactive labels, yellow sliding circle for active tab
- Active tab: icon only (no label); inactive: mint icon + label
- Reanimated: sliding indicator, press bounce, haptic on switch
- **Recorder:** Lottie mic + waveform (`assets/lottie/mic.json`), mint badge when idle (visible on black bar)
- **Profile:** Lottie rotating settings gear (`assets/lottie/profile.json`)
- **Home / Calendar / Chat:** Ionicons (mint inactive, black on yellow when active)
- **Home tab:** Full dashboard UI (see below) — other tabs still placeholders

**Home dashboard (`/(tabs)` / `app/(tabs)/index.tsx`)**

- Yellow header: `Namaste, {Clerk firstName}!` via `useUser()` + `hooks/use-home-greeting.ts`
- Streak line + `streakFire` asset; static streak count from `data/home-dashboard.ts`
- **Acharya logo** (`images.mascotLogo`) top-right, **100×100**, fully inside yellow header (no overlap onto cream)
- Scrollable cream body with three Neo-Brutal cards:
  - **Recent Activity** (white) — two static rows from `data/home-dashboard.ts`
  - **Verified Notes Gaps** (mint) — body copy + black pill CTA
  - **Start New Class Session** (cream) — tap navigates to `/(tabs)/recorder`
- Components: `components/home/*` (`HomeScreen`, `HomeHeader`, `NeoDashboardCard`, section cards)
- **Tab bar untouched** — per product request

**AuraDB (needs full `.env` — Clerk secret + Neo4j Aura credentials)**

- `neo4j-driver` + server-only `lib/neo4j.ts` (enforces `neo4j+s://`)
- Schema DDL in `neo4j/schema.cypher` (constraints, indexes, vector index)
- Live API routes: `GET /api/health/neo4j`, `GET|POST /api/sessions`
- CLI: `npm run verify:neo4j`, `npm run neo4j:apply-schema`, `npm run neo4j:test`, `npm run neo4j:test-api`

**Validation (last run — 2026-06-03, home dashboard work):**

- `npm run lint` — pass
- `npx tsc --noEmit` — pass

### Language selection (signed-in)

- Route `/language` — 23 Sarvam Indian languages + English (`data/languages.ts`)
- Neo-Brutal UI: search, Popular / All sections, Confirm CTA + `earth.png` footer
- `store/preferences-store.ts` + SecureStore persist; gate via `hooks/use-language-gate.ts`

### Not built yet

- Recorder capture (`expo-audio`), chunk upload, Sarvam STT pipeline
- Calendar session list, chat coach, notes verification (RAG)
- Live Home data from Aura (dashboard still uses `data/home-dashboard.ts` static demo)
- Real screen content for Calendar / Chat / Profile / Recorder tabs (placeholders except Home)

---

## 2. Project Phase Map

```
Phase 0  Bootstrap          ✅ committed   Expo 54 shell, AGENTS.md
Phase 1  Design system      ✅ committed   theme/, global.css, fonts
Phase 2  Onboarding         ✅ committed   /onboarding (was /), 3 slides
Phase 3  Auth + AuraDB      ✅ committed   `4ac6e6f` Clerk, API routes, Neo4j graph
Phase 3.5 Language pick     ✅ committed   `/language`, SecureStore prefs, gate
Phase 3.6 Tab navigation   ✅ committed   `c5a006f` custom bar, Lottie mic + settings
Phase 4  Home dashboard     🟡 working tree  prompt_material/04-home-dashboard (uncommitted)
Phase 5  Recorder pipeline ⬜ planned     expo-audio, Sarvam, Gemini → Aura nodes
Phase 6  Core product       ⬜ planned     calendar UI, chat, notes RAG on Aura
```

---

## 3. Architecture Snapshot

### Routes (Expo Router)

| Route | File | Who sees it | Notes |
|-------|------|-------------|-------|
| `/` | `app/index.tsx` | All | Auth + language gate → redirects |
| `/(tabs)` | `app/(tabs)/index.tsx` | Signed-in + language | **Home dashboard** (`HomeScreen`) |
| `/(tabs)/calendar` | `app/(tabs)/calendar.tsx` | Signed-in | Calendar placeholder |
| `/(tabs)/recorder` | `app/(tabs)/recorder.tsx` | Signed-in | Recorder placeholder (center tab) |
| `/(tabs)/chat` | `app/(tabs)/chat.tsx` | Signed-in | Chat placeholder |
| `/(tabs)/profile` | `app/(tabs)/profile.tsx` | Signed-in | Profile placeholder |
| `/language` | `app/language.tsx` | Signed-in | Post-login language gate |
| `/onboarding` | `app/onboarding.tsx` | New users | 3-slide carousel |
| `/sign-up`, `/sign-in` | `app/(auth)/` | Signed-out | Clerk OTP + OAuth |
| `(auth)/_layout` | `app/(auth)/_layout.tsx` | — | Redirects signed-in → `/(tabs)` |

### Auth + tab flow

```
App open → / → (unsigned) → /onboarding → sign-up/sign-in
  → verify → / → /language (first time) → Confirm → /(tabs) Home
Signed-in with language → / → redirect /(tabs)
```

### Key folders

| Path | Role |
|------|------|
| `app/(tabs)/` | Tab screens + `_layout.tsx` (custom tab bar) |
| `components/home/` | Home dashboard UI (`HomeScreen`, header, Neo-Brutal cards) |
| `components/navigation/` | `AcharyaTabBar`, `TabBarItem`, `TabBarIcon`, `TabLottieIcon`, placeholders |
| `data/home-dashboard.ts` | Static dashboard copy (streak, activity, notes, start session) |
| `types/home-dashboard.ts` | Typed shapes for home dashboard data |
| `hooks/use-home-greeting.ts` | Clerk display name for Home header |
| `assets/lottie/` | `mic.json`, `profile.json` (tab animations) |
| `constants/images.ts` | Centralized images incl. `mascotLogo`, `streakFire` |
| `constants/lottie.ts` | Centralized Lottie imports |
| `components/auth/` | Auth shell, social buttons, verification modal |
| `lib/neo4j.ts` | Aura driver singleton (API routes only) |
| `store/preferences-store.ts` | Language prefs (SecureStore) |
| `theme/` | Neo-Brutal colors, typography, tokens |
| `memory/` | This file |

### Design system (active)

- **Style:** Neo-Brutal — thick black borders, hard shadows, cream `#FFF8E7`
- **Tab bar:** Black `#000000`, mint inactive `#B8E5E1`, yellow active pill `#FFDB33`
- **Home header:** Yellow `#FFDB33`, greeting + streak + large mascot logo (in-header only)
- **Fonts:** Archivo Black (headings), Space Grotesk (body)
- **Packages added:** `lottie-react-native`, `react-native-reanimated` (tab animations)

### Environment (`.env` — copy from `.env.example`)

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk Dashboard → API keys |
| `CLERK_SECRET_KEY` | Yes (API routes) | Clerk Dashboard → Secret keys |
| `NEO4J_URI` | Yes | Aura Console → Connect (`neo4j+s://…`) |
| `NEO4J_USERNAME` | Yes | Usually `neo4j` |
| `NEO4J_PASSWORD` | Yes | Aura instance password |
| `NEO4J_DATABASE` | Optional | Default `neo4j` |

---

## 4. Current State (working tree)

> **Status:** Phase 4 Home dashboard — **ready to commit** (uncommitted as of 2026-06-03).

**Files added/changed:**

| Path | Change |
|------|--------|
| `app/(tabs)/index.tsx` | Renders `HomeScreen` |
| `components/home/` | `home-screen`, `home-header`, `neo-dashboard-card`, `recent-activity-card`, `notes-gaps-card`, `start-session-card` |
| `data/home-dashboard.ts` | Static streak, recent activity, notes gaps, start session |
| `types/home-dashboard.ts` | Dashboard types |
| `hooks/use-home-greeting.ts` | Clerk `useUser()` → `Namaste, {name}!` |
| `constants/images.ts` | Added `streakFire` |

**UX decisions (post-mockup tweaks):**

- Removed **“Teaching in: …”** line from Home header (language still persisted for gate/STT later).
- Logo: **100×100**, right side of yellow header only (`overflow: hidden` on header) — not overlapping cream body.

**Not changed:** `components/navigation/*`, `app/(tabs)/_layout.tsx` tab bar.

**Suggested commit subject:** `feat: home dashboard with Clerk greeting and Neo-Brutal cards`

---

## 5. Stack (installed)

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54, Expo Router, React 19 |
| Styling | NativeWind v5 preview, Tailwind CSS v4 (+ StyleSheet on Home for Neo-Brutal shadows) |
| Auth | Clerk `@clerk/expo` + `@clerk/backend` |
| State | Zustand (`preferences-store`) + SecureStore persist |
| Database | **Neo4j AuraDB** — `neo4j-driver`, `lib/neo4j.ts` |
| Tab UI | Custom tab bar, Reanimated, Lottie (`lottie-react-native`) |
| Images | `expo-image` + `constants/images.ts` |
| Icons | `@expo/vector-icons` (Ionicons) + Lottie for Recorder/Profile |
| Planned voice | Sarvam AI (backend only) |
| Planned analysis | Gemini (backend only) |

---

## 6. Commit Log (oldest → newest)

Read top-to-bottom = project timeline.

---

### `7936d2b` — Initial commit

- Expo SDK 54 app from `create-expo-app`

### `62cc316` — feat 1 : Setup

- Stripped template tabs; bare Stack layout

### `014d98d` — docs: add full AGENTS.md

- Full Acharya product + architecture spec

### `c657848` — feat: NativeWind v5 + Tailwind v4

### `49dd7e5` — docs: memory log + README

### `e400509` — feat 4 : Design Theme

### `00ba6ae` — feat : Onboarding Screen

### `4ac6e6f` — feat: Clerk auth and Neo4j Aura foundation

### `cab10a0` — feat: post-login language selection with SecureStore persistence

### `27b3233` — docs: fix memory commit hash for language selection

### `c5a006f` — feat: custom animated bottom tab navigation with Lottie mic and settings

- **`app/(tabs)/`:** Home, Calendar, Recorder (center), Chat, Profile placeholders
- **`components/navigation/`:** `AcharyaTabBar` — yellow sliding circle, mint labels, Reanimated press/haptics
- **Recorder tab:** Lottie mic + waveform on mint badge (idle) / yellow pill (active)
- **Profile tab:** Lottie rotating settings gear
- **Home / Calendar / Chat:** Ionicons with high-contrast mint on black bar
- **Auth routing:** `/` gate only; signed-in → `/(tabs)`; `import "react-native-reanimated"` in root layout
- **Deps:** `lottie-react-native`
- **Fix:** `scripts/test-neo4j-api-layer.mjs` — health check without `@/` API import (Node path alias)
- **Validation:** lint, tsc, expo-doctor, verify:neo4j, neo4j:test, neo4j:test-api — all pass

### `0f8a5e4` — docs: record tab navigation commit hash in memory

---

## 7. Next Work (recommended order)

1. **Commit Phase 4** — home dashboard (working tree)
2. **Recorder** — `expo-audio`, chunked capture, processing states (`prompt_material/05-core-recorder.png`)
3. **Calendar** — session history from Aura `(Teacher)-[:TAUGHT]->(Session)`
4. **Wire Home to Aura** — replace `data/home-dashboard.ts` with live recent activity / streak when APIs exist
5. **Notes verification UI** — `prompt_material/09-notes-verify.png`; link Verified Notes Gaps CTA
6. **Backend** — Sarvam STT, Gemini analysis; extend Aura graph

---

## 8. Agent Maintenance Instructions

When you finish a meaningful commit:

1. Move **§4 Current State** content into **§6 Commit Log** with the real hash + subject.
2. Reset **§4** to `_None — awaiting next feature._` or new in-progress notes.
3. Update **§1 Quick Read** (phase, last commit, what works / not built).
4. Update **§2 Phase Map** checkmarks.
5. Update **§3** only if routes, folders, or stack changed.

---

## 9. Design References

| File | Screen |
|------|--------|
| `prompt_material/04-home-dashboard.png` | Home dashboard — **implemented** (working tree) |
| `prompt_material/05-core-recorder.png` | Recorder — next |
| `prompt_material/06-teaching-calendar.png` | Calendar |
| `prompt_material/09-notes-verify.png` | Notes verification |

---

*Last updated: Phase 4 home dashboard (uncommitted). HEAD on `dev` at `0f8a5e4`.*
