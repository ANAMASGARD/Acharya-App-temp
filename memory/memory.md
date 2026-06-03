# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§4 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, notes verification) |
| **Phase** | **Phase 5 — Recorder UI** (implemented in working tree; **not committed yet**) |
| **Previous phases** | Phase 0–3.6 committed → Phase 4 Home (`849c971`) → Phase 4b Profile (`8da15e7`) |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — use `npm run start:go` or press `s` after `expo start` (project has `expo-dev-client`, default targets dev build QR) |
| **Last committed feature** | Profile settings hub (`8da15e7`) |
| **Latest work (uncommitted)** | **Core Recorder screen UI** (`05-core-recorder.png`) — simulated record/stop, timer, form, transcript card |

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
- **Recorder:** Lottie mic (`assets/lottie/mic.json`); tab opens **full recorder UI** (not placeholder)
- **Profile:** Lottie settings gear — full **Profile hub**
- **Home:** Full dashboard UI
- **Calendar / Chat:** Still placeholders

**Home dashboard (`/(tabs)` / `app/(tabs)/index.tsx`)**

- Yellow header: `Namaste, {Clerk firstName}!` via `useUser()` + `hooks/use-home-greeting.ts`
- Streak line + `streakFire`; static data from `data/home-dashboard.ts`
- **Acharya logo** (`images.mascotLogo`) 100×100 in yellow header
- Three Neo-Brutal cards: Recent Activity, Verified Notes Gaps, Start New Class Session → recorder tab
- Components: `components/home/*`

**Profile / Settings (`/(tabs)/profile` + `/profile/account`)**

- **Hub** (`components/profile/profile-screen.tsx`): avatar + name, at-a-glance, account menu, app settings, help, sign out
- Change photo: `expo-image-picker` → `user.setProfileImage`
- **Manage account & security** → `/profile/account`
- **Clerk account UI:** platform split — `profile-native-account-view.native.tsx` (dev build + `UserProfileView`), `.tsx` / web fallback; **no top-level `@clerk/expo/native` import on web** (fixes Metro web bundle)
- Expo Go: fallback via `lib/clerk-native-profile.ts`
- Optional browser: `EXPO_PUBLIC_CLERK_ACCOUNT_PORTAL_URL`

**Recorder (`/(tabs)/recorder` — Phase 5 UI only)**

- **Screen:** `components/recording/recorder-screen.tsx` — title “Record Class Session”
- **Session card:** Topic / Subject / Class form (`data/recorder-options.ts`), dashed divider, timer + play/stop button + status
- **Simulated recording:** `hooks/use-recorder-ui.ts` — yellow play → red X, timer `MM:SS`, pulse rings, REC badge; requires all three fields filled to start
- **Transcript card:** yellow header bar “CLASS TRANSCRIBE” (black text), white transcript area, SEND button (disabled until transcript exists — UI only)
- **Not built:** `expo-audio`, chunk upload, Sarvam STT, Aura session writes, live transcript stream

**Bundling / dev client notes**

- `npm run start:go` — Expo Go (recommended for quick mobile UI test)
- `npx expo start` — defaults to **development build** when `expo-dev-client` is installed
- Web export passes after Clerk native + Lottie web splits (`profile-native-account-view.*`, `tab-lottie-icon.web.tsx`)

**AuraDB (needs full `.env`)**

- `neo4j-driver` + server-only `lib/neo4j.ts`
- Live API routes: `GET /api/health/neo4j`, `GET|POST /api/sessions`
- CLI: `npm run verify:neo4j`, `npm run neo4j:apply-schema`, `npm run neo4j:test`, `npm run neo4j:test-api`

**Validation (last run — 2026-06-03, recorder UI work):**

- `npm run lint` — pass
- `npx tsc --noEmit` — pass
- `npx expo export --platform web` — pass
- `npm run verify:neo4j`, `neo4j:test`, `neo4j:test-api` — pass

### Language selection (signed-in)

- Route `/language` — 23 Sarvam Indian languages + English (`data/languages.ts`)
- Neo-Brutal UI: search, Popular / All sections, Confirm CTA + `earth.png` footer
- `store/preferences-store.ts` + SecureStore persist; gate via `hooks/use-language-gate.ts`

### Not built yet

- Recorder **audio** (`expo-audio`), chunk upload, Sarvam STT pipeline, Gemini reports on Aura
- Calendar session list, chat coach, notes verification (RAG)
- Live Home data from Aura (dashboard still uses `data/home-dashboard.ts` static demo)
- Real screen content for Calendar / Chat tabs (placeholders)
- FCM push delivery (toggle stores preference only)
- Biometrics / passkeys on profile

---

## 2. Project Phase Map

```
Phase 0  Bootstrap          ✅ committed   Expo 54 shell, AGENTS.md
Phase 1  Design system      ✅ committed   theme/, global.css, fonts
Phase 2  Onboarding         ✅ committed   /onboarding (was /), 3 slides
Phase 3  Auth + AuraDB      ✅ committed   `4ac6e6f` Clerk, API routes, Neo4j graph
Phase 3.5 Language pick     ✅ committed   `/language`, SecureStore prefs, gate
Phase 3.6 Tab navigation   ✅ committed   `c5a006f` custom bar, Lottie mic + settings
Phase 4  Home dashboard     ✅ committed   `849c971` — `04-home-dashboard.png`
Phase 4b Profile/Settings   ✅ committed   `8da15e7` — Neo-Brutal hub + Clerk account
Phase 5  Recorder UI         🟡 working tree  `05-core-recorder.png` — UI only (uncommitted)
Phase 5b Recorder pipeline  ⬜ planned     expo-audio, Sarvam, Gemini → Aura nodes
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
| `/(tabs)/recorder` | `app/(tabs)/recorder.tsx` | Signed-in | **Recorder screen** (`RecorderScreen`) |
| `/(tabs)/chat` | `app/(tabs)/chat.tsx` | Signed-in | Chat placeholder |
| `/(tabs)/profile` | `app/(tabs)/profile.tsx` | Signed-in | **Profile hub** (`ProfileScreen`) |
| `/profile/account` | `app/profile/account.tsx` | Signed-in | Clerk account (native / fallback) |
| `/language` | `app/language.tsx` | Signed-in | Post-login language gate / change from Profile |
| `/onboarding` | `app/onboarding.tsx` | New users | 3-slide carousel |
| `/sign-up`, `/sign-in` | `app/(auth)/` | Signed-out | Clerk OTP + OAuth |

### Auth + tab flow

```
App open → / → (unsigned) → /onboarding → sign-up/sign-in
  → verify → / → /language (first time) → Confirm → /(tabs) Home
Home “Start session” or center tab → /(tabs)/recorder
Profile → Manage account → /profile/account
Profile → Sign out → /onboarding
```

### Key folders

| Path | Role |
|------|------|
| `app/(tabs)/` | Tab screens + `_layout.tsx` (custom tab bar) |
| `app/profile/` | Stack: `account.tsx` (Clerk account management) |
| `components/home/` | Home dashboard UI |
| `components/profile/` | Profile hub, account (`.native.tsx` / `.tsx` split) |
| `components/recording/` | Recorder screen, form, timer, button, transcript card, neo cards |
| `components/navigation/` | `AcharyaTabBar`, Lottie icons (`tab-lottie-icon.web.tsx` for web) |
| `data/home-dashboard.ts` | Static dashboard copy |
| `data/recorder-options.ts` | Subject + class level picklists |
| `hooks/use-recorder-ui.ts` | Simulated recorder state + timer |
| `hooks/use-home-greeting.ts`, `hooks/use-profile-*.ts` | Home + profile helpers |
| `lib/clerk-native-profile.ts`, `lib/user-display-name.ts` | Clerk / display helpers |
| `store/preferences-store.ts` | Language + push notifications pref |
| `theme/` | Neo-Brutal colors, typography, tokens |
| `memory/` | This file |

### Design system (active)

- **Style:** Neo-Brutal — thick black borders, hard shadows, cream `#FFF8E7`
- **Recorder:** Two stacked neo cards — session (form + timer + **88–104px** yellow play button) + transcript (yellow header band, white body, SEND)
- **Tab bar:** Black, mint inactive, yellow active pill; center mic Lottie

### Environment (`.env` — copy from `.env.example`)

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk Dashboard → API keys |
| `CLERK_SECRET_KEY` | Yes (API routes) | Clerk Dashboard → Secret keys |
| `EXPO_PUBLIC_CLERK_ACCOUNT_PORTAL_URL` | Optional | Clerk Account Portal URL |
| `NEO4J_URI` | Yes | Aura Console → Connect (`neo4j+s://…`) |
| `NEO4J_USERNAME` / `NEO4J_PASSWORD` / `NEO4J_DATABASE` | Yes | Aura instance |

---

## 4. Current State (working tree)

> **Status:** Phase 5 Recorder UI — **ready to commit** (uncommitted as of 2026-06-03).

### Summary

**Core Recorder screen (UI only)** — matches `prompt_material/05-core-recorder.png` + user refinements (two-card layout, smaller timer, larger bold yellow play button, spacing fixes).

- Route: `app/(tabs)/recorder.tsx` → `RecorderScreen`
- **Session card:** TOPIC / SUBJECT / CLASS (required), dashed divider, compact timer, play/stop (yellow `#FFCC00` → red + X), status text (“Ready to record” / “Recording…” / helper when form incomplete)
- **Transcript card:** “CLASS TRANSCRIBE” — **yellow header bar**, **black title text**, rounded top corners (`overflow: hidden`), white transcript panel, SEND (disabled without transcript)
- **State:** `useRecorderUi` — local React state only (no Zustand recorder store yet)
- **Bug fixes in this work:** pulse ring idle placeholder blocked taps (fixed: `null` when idle + button `zIndex`); Metro web broke on `@clerk/expo/native` (platform files); Expo Go vs dev client documented (`start:go`)

### Files added/changed (working tree)

| Path | Change |
|------|--------|
| `app/(tabs)/recorder.tsx` | `RecorderScreen` instead of placeholder |
| `components/recording/*` | Full recorder UI (screen, form, timer, button, pulse, transcript, neo card, divider, status) |
| `data/recorder-options.ts` | Subject + class level options |
| `hooks/use-recorder-ui.ts` | Form + simulated recording + timer |
| `components/profile/profile-native-account-view.native.tsx` | Native Clerk `UserProfileView` |
| `components/profile/profile-native-account-view.tsx` | Web/default fallback (no native import) |
| `components/navigation/tab-lottie-icon.web.tsx` | Web tab Lottie fallback (static mic image) |
| `package.json` | `"start:go": "expo start --go"` |

### UX decisions (recorder)

- No hamburger menu (removed per user feedback)
- Timer **~26px**; play button **104px**, bold yellow; timer and button grouped with **4px** gap
- Status text close below button (reduced stage clearance + `marginTop: xs`)
- Recording requires topic + subject + class; fields lock while “recording”
- Phase 5b will swap hook internals for `expo-audio`, store, API, Sarvam — UI components stay largely the same

### Suggested commit

`feat: core recorder screen UI with simulated record state (Phase 5)`

---

## 5. Stack (installed)

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54, Expo Router, React 19 |
| Styling | NativeWind v5 preview + StyleSheet (recorder uses StyleSheet) |
| Auth | Clerk `@clerk/expo` + `@clerk/backend`; native account on `.native.tsx` only |
| State | Zustand (`preferences-store`); recorder UI uses local hook (no recorder store yet) |
| Database | **Neo4j AuraDB** — `neo4j-driver`, `lib/neo4j.ts` |
| Tab UI | Custom tab bar, Reanimated, Lottie (+ web fallback for mic) |
| Dev | `expo-dev-client` — use `start:go` for Expo Go |
| Planned recorder | `expo-audio` (not installed) |
| Planned voice | Sarvam AI (backend only) |
| Planned analysis | Gemini (backend only) |

---

## 6. Commit Log (oldest → newest)

Read top-to-bottom = project timeline.

---

### `7936d2b` — Initial commit

- Expo SDK 54 app from `create-expo-app`

### `62cc316` — feat 1 : Setup

### `014d98d` — docs: add full AGENTS.md

### `c657848` — feat: NativeWind v5 + Tailwind v4

### `49dd7e5` — docs: memory log + README

### `e400509` — feat 4 : Design Theme

### `00ba6ae` — feat : Onboarding Screen

### `4ac6e6f` — feat: Clerk auth and Neo4j Aura foundation

### `cab10a0` — feat: post-login language selection with SecureStore persistence

### `27b3233` — docs: fix memory commit hash for language selection

### `c5a006f` — feat: custom animated bottom tab navigation with Lottie mic and settings

- Tab shell: Home, Calendar, Recorder, Chat, Profile placeholders
- `AcharyaTabBar`, Lottie mic + settings gear

### `0f8a5e4` — docs: record tab navigation commit hash in memory

### `849c971` — feat: home dashboard with Clerk greeting and Neo-Brutal cards

- Home screen per `04-home-dashboard.png`; static `data/home-dashboard.ts`
- Start session → recorder tab

### `8da15e7` — feat: profile settings hub with Clerk account and app preferences

- Profile hub, `/profile/account`, image picker, prefs, sign out
- Clerk native account gated for dev build / Expo Go fallback

---

## 7. Next Work (recommended order)

1. **Commit Phase 5** — recorder UI (`components/recording/`, hooks, data)
2. **Phase 5b** — `expo-audio`, `store/recorder-store.ts`, chunk upload, POST `/api/sessions`, Sarvam STT → transcript panel
3. **Calendar** — session history from Aura `(Teacher)-[:TAUGHT]->(Session)`
4. **Wire Home to Aura** — replace static `data/home-dashboard.ts`
5. **Notes verification UI** — `prompt_material/09-notes-verify.png`
6. **Backend** — Gemini analysis; extend Aura graph (transcript, report nodes)

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
| `prompt_material/04-home-dashboard.png` | Home dashboard — **implemented** (`849c971`) |
| `prompt_material/01-design-system.png` | Neo-Brutal palette — Home, Profile, Recorder |
| `prompt_material/05-core-recorder.png` | Recorder — **UI implemented** (working tree; audio pipeline next) |
| `prompt_material/06-teaching-calendar.png` | Calendar |
| `prompt_material/09-notes-verify.png` | Notes verification |

---

*Last updated: 2026-06-03 — Phase 5 Recorder UI (uncommitted). HEAD on `dev` at `8da15e7`.*
