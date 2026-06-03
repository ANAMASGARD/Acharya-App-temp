# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§4 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, notes verification) |
| **Phase** | **Phase 3.6 — Tab navigation** (custom bottom bar; committing now) |
| **Previous phases** | Phase 0–2 committed → Phase 3 Auth + Aura (`4ac6e6f`) → Phase 3.5 Language (`cab10a0`) |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — auth, language gate, tab shell; **AuraDB requires full `.env`** (see §3 Environment) |
| **Last committed feature** | Post-login language selection (`cab10a0`) |
| **Latest work (this commit)** | Custom animated bottom tabs + Lottie recorder mic + rotating profile settings icon |

### What works today (if `.env` is configured)

**Auth (needs `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` only)**

- Onboarding at `/onboarding` → Get Started → `/sign-up`
- Custom Sign Up / Sign In (Neo-Brutal UI, no password fields)
- Email OTP via Clerk (6-digit modal, auto-submit on last digit)
- Google / Facebook OAuth via `useSSO` + browser (Expo Go)
- Signed-in users: **no language saved** → `/language`; after Confirm → `/(tabs)` (Home tab)
- Language preference persisted via Zustand + **expo-secure-store**
- Signed-out users → `/onboarding`

**Tab navigation (`app/(tabs)/`)**

- Order: **Home | Calendar | Recorder (center) | Chat | Profile**
- Custom `AcharyaTabBar`: black bar, mint inactive labels, yellow sliding circle for active tab
- Active tab: icon only (no label); inactive: mint icon + label
- Reanimated: sliding indicator, press bounce, haptic on switch
- **Recorder:** Lottie mic + waveform (`assets/lottie/mic.json`), mint badge when idle (visible on black bar)
- **Profile:** Lottie rotating settings gear (`assets/lottie/profile.json`)
- **Home / Calendar / Chat:** Ionicons (mint inactive, black on yellow when active)
- Placeholder screens only — no dashboard/recorder/calendar UI yet

**AuraDB (needs full `.env` — Clerk secret + Neo4j Aura credentials)**

- `neo4j-driver` + server-only `lib/neo4j.ts` (enforces `neo4j+s://`)
- Schema DDL in `neo4j/schema.cypher` (constraints, indexes, vector index)
- Live API routes: `GET /api/health/neo4j`, `GET|POST /api/sessions`
- CLI: `npm run verify:neo4j`, `npm run neo4j:apply-schema`, `npm run neo4j:test`, `npm run neo4j:test-api`

**Validation (last run — 2026-06-03, tab navigation commit):**

- `npm run lint` — pass
- `npx tsc --noEmit` — pass
- `npx expo-doctor` — pass (18/18)
- `npm run verify:neo4j` — pass
- `npm run neo4j:test` — pass (8 integration checks)
- `npm run neo4j:test-api` — pass (lib + health Cypher path)

### Language selection (signed-in)

- Route `/language` — 23 Sarvam Indian languages + English (`data/languages.ts`)
- Neo-Brutal UI: search, Popular / All sections, Confirm CTA + `earth.png` footer
- `store/preferences-store.ts` + SecureStore persist; gate via `hooks/use-language-gate.ts`

### Not built yet

- Home dashboard UI (`prompt_material/04-home-dashboard.png`)
- Recorder capture (`expo-audio`), chunk upload, Sarvam STT pipeline
- Calendar session list, chat coach, notes verification (RAG)
- Real screen content inside tab routes (placeholders only)

---

## 2. Project Phase Map

```
Phase 0  Bootstrap          ✅ committed   Expo 54 shell, AGENTS.md
Phase 1  Design system      ✅ committed   theme/, global.css, fonts
Phase 2  Onboarding         ✅ committed   /onboarding (was /), 3 slides
Phase 3  Auth + AuraDB      ✅ committed   `4ac6e6f` Clerk, API routes, Neo4j graph
Phase 3.5 Language pick     ✅ committed   `/language`, SecureStore prefs, gate
Phase 3.6 Tab navigation   ✅ committing  `(tabs)`, custom bar, Lottie mic + settings
Phase 4  Home dashboard     ⬜ planned     prompt_material/04-home-dashboard
Phase 5  Recorder pipeline ⬜ planned     expo-audio, Sarvam, Gemini → Aura nodes
Phase 6  Core product       ⬜ planned     calendar UI, chat, notes RAG on Aura
```

---

## 3. Architecture Snapshot

### Routes (Expo Router)

| Route | File | Who sees it | Notes |
|-------|------|-------------|-------|
| `/` | `app/index.tsx` | All | Auth + language gate → redirects |
| `/(tabs)` | `app/(tabs)/index.tsx` | Signed-in + language | Home placeholder |
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
| `components/navigation/` | `AcharyaTabBar`, `TabBarItem`, `TabBarIcon`, `TabLottieIcon`, placeholders |
| `assets/lottie/` | `mic.json`, `profile.json` (tab animations) |
| `constants/lottie.ts` | Centralized Lottie imports |
| `components/auth/` | Auth shell, social buttons, verification modal |
| `lib/neo4j.ts` | Aura driver singleton (API routes only) |
| `store/preferences-store.ts` | Language prefs (SecureStore) |
| `theme/` | Neo-Brutal colors, typography, tokens |
| `memory/` | This file |

### Design system (active)

- **Style:** Neo-Brutal — thick black borders, hard shadows, cream `#FFF8E7`
- **Tab bar:** Black `#000000`, mint inactive `#B8E5E1`, yellow active pill `#FFDB33`
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

> **Status:** _None — tab navigation committed with this memory update._

---

## 5. Stack (installed)

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54, Expo Router, React 19 |
| Styling | NativeWind v5 preview, Tailwind CSS v4 |
| Auth | Clerk `@clerk/expo` + `@clerk/backend` |
| Database | **Neo4j AuraDB** — `neo4j-driver`, `lib/neo4j.ts` |
| Tab UI | Custom tab bar, Reanimated, Lottie (`lottie-react-native`) |
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

---

## 7. Next Work (recommended order)

1. **Home dashboard** — `prompt_material/04-home-dashboard.png`
2. **Recorder** — `expo-audio`, chunked capture, processing states
3. **Calendar** — session history from Aura `(Teacher)-[:TAUGHT]->(Session)`
4. **Backend** — Sarvam STT, Gemini analysis; extend Aura graph

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
| `prompt_material/04-home-dashboard.png` | Home dashboard — next (tab bar matches mockup) |
| `prompt_material/05-core-recorder.png` | Recorder |
| `prompt_material/06-teaching-calendar.png` | Calendar |
| `prompt_material/09-notes-verify.png` | Notes verification |

---

*Last updated: tab navigation (`c5a006f`). HEAD on `dev`.*
