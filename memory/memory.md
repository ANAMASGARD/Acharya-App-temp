# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§4 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, notes verification) |
| **Phase** | **Phase 4 — Home + Profile** (implemented in working tree; **not committed yet**) |
| **Previous phases** | Phase 0–2 committed → Phase 3 Auth + Aura (`4ac6e6f`) → Phase 3.5 Language (`cab10a0`) → Phase 3.6 Tabs (`c5a006f`) |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — auth, language gate, tabs, **Home dashboard**, **Profile hub**; Clerk full account UI needs **dev build**; AuraDB needs full `.env` |
| **Last committed feature** | Custom animated bottom tabs (`c5a006f`) |
| **Latest work (uncommitted)** | Home dashboard (`04-home-dashboard.png`) + **Profile/Settings tab** (Neo-Brutal hub, Clerk account, language, photo, prefs) |

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
- **Recorder:** Lottie mic (`assets/lottie/mic.json`)
- **Profile:** Lottie settings gear (`assets/lottie/profile.json`) — opens full **Profile hub** (not placeholder)
- **Home:** Full dashboard UI
- **Calendar / Chat / Recorder:** Still placeholders (except navigation targets from Profile shortcuts)

**Home dashboard (`/(tabs)` / `app/(tabs)/index.tsx`)**

- Yellow header: `Namaste, {Clerk firstName}!` via `useUser()` + `hooks/use-home-greeting.ts`
- Streak line + `streakFire`; static data from `data/home-dashboard.ts`
- **Acharya logo** (`images.mascotLogo`) 100×100 in yellow header
- Three Neo-Brutal cards: Recent Activity, Verified Notes Gaps, Start New Class Session → recorder tab
- Components: `components/home/*`

**Profile / Settings (`/(tabs)/profile` + `/profile/account`)**

- **Hub** (`components/profile/profile-screen.tsx`): minimal header — **avatar + name only** (no user ID, email, or “Your profile” title block)
- Change photo: `expo-image-picker` → `user.setProfileImage` (base64 data URL)
- **At a glance** card: teaching language, 2FA status, connected providers, member since
- **Manage account & security** → `/profile/account`
- Account menu: Edit name (modal), profile/email, security & 2FA, connected accounts, active devices
- **App settings:** teaching language → `/language`, push notifications toggle (persisted in prefs store), recorder/calendar shortcuts
- **Help & about:** support mailto, privacy/terms (browser), app version
- **Sign out:** red destructive button (`colors.destructive`), confirm dialog → `/onboarding`
- **Clerk full account UI:** `UserProfileView` (`@clerk/expo/native`) on **dev build only**; Expo Go uses fallback via `lib/clerk-native-profile.ts` (avoids `ClerkUserProfileView` crash)
- Optional browser fallback: `EXPO_PUBLIC_CLERK_ACCOUNT_PORTAL_URL` in `.env`

**AuraDB (needs full `.env` — Clerk secret + Neo4j Aura credentials)**

- `neo4j-driver` + server-only `lib/neo4j.ts` (enforces `neo4j+s://`)
- Schema DDL in `neo4j/schema.cypher`
- Live API routes: `GET /api/health/neo4j`, `GET|POST /api/sessions`
- CLI: `npm run verify:neo4j`, `npm run neo4j:apply-schema`, `npm run neo4j:test`, `npm run neo4j:test-api`

**Validation (last run — 2026-06-03, home + profile work):**

- `npm run lint` — pass
- `npx tsc --noEmit` — pass

### Language selection (signed-in)

- Route `/language` — 23 Sarvam Indian languages + English (`data/languages.ts`)
- Neo-Brutal UI: search, Popular / All sections, Confirm CTA + `earth.png` footer
- `store/preferences-store.ts` + SecureStore persist; gate via `hooks/use-language-gate.ts`
- Reachable from Profile → App settings → Teaching language (back button when language already set)

### Not built yet

- Recorder capture (`expo-audio`), chunk upload, Sarvam STT pipeline
- Calendar session list, chat coach, notes verification (RAG)
- Live Home data from Aura (dashboard still uses `data/home-dashboard.ts` static demo)
- Real screen content for Calendar / Chat / Recorder tabs (placeholders)
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
Phase 4  Home dashboard     🟡 working tree  `04-home-dashboard.png` (uncommitted)
Phase 4b Profile/Settings   🟡 working tree  Neo-Brutal hub + Clerk account (uncommitted)
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
| `/(tabs)/profile` | `app/(tabs)/profile.tsx` | Signed-in | **Profile hub** (`ProfileScreen`) |
| `/profile/account` | `app/profile/account.tsx` | Signed-in | Clerk `UserProfileView` or Expo Go fallback |
| `/language` | `app/language.tsx` | Signed-in | Post-login language gate / change from Profile |
| `/onboarding` | `app/onboarding.tsx` | New users | 3-slide carousel |
| `/sign-up`, `/sign-in` | `app/(auth)/` | Signed-out | Clerk OTP + OAuth |
| `(auth)/_layout` | `app/(auth)/_layout.tsx` | — | Redirects signed-in → `/(tabs)` |

### Auth + tab flow

```
App open → / → (unsigned) → /onboarding → sign-up/sign-in
  → verify → / → /language (first time) → Confirm → /(tabs) Home
Signed-in with language → / → redirect /(tabs)
Profile → Manage account → /profile/account (native Clerk UI on dev build)
Profile → Sign out → /onboarding
```

### Key folders

| Path | Role |
|------|------|
| `app/(tabs)/` | Tab screens + `_layout.tsx` (custom tab bar) |
| `app/profile/` | Stack: `account.tsx` (Clerk account management) |
| `components/home/` | Home dashboard UI |
| `components/profile/` | Profile hub, header, menu cards, edit-name modal, account fallback |
| `components/navigation/` | `AcharyaTabBar`, tab items, placeholders |
| `data/home-dashboard.ts` | Static dashboard copy |
| `hooks/use-home-greeting.ts` | Clerk display name (uses `lib/user-display-name.ts`) |
| `hooks/use-profile-*.ts` | Photo upload, account actions, summary badges |
| `lib/clerk-native-profile.ts` | Detect Expo Go / native view — gate `UserProfileView` |
| `lib/user-display-name.ts` | Shared name + member-since formatting |
| `constants/legal.ts` | Support email, privacy/terms URLs, portal env |
| `store/preferences-store.ts` | Language + `pushNotificationsEnabled` (SecureStore) |
| `theme/` | Neo-Brutal colors, typography, tokens |
| `memory/` | This file |

### Design system (active)

- **Style:** Neo-Brutal — thick black borders, hard shadows, cream `#FFF8E7`, rounded cards `radii.lg`
- **Tab bar:** Black, mint inactive, yellow active pill
- **Home header:** Yellow `#FFDB33`, greeting + streak + mascot logo
- **Profile:** Cream scroll; mint/lavender accent cards; **red sign-out** button
- **Fonts:** Archivo Black (headings), Space Grotesk (body)

### Environment (`.env` — copy from `.env.example`)

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk Dashboard → API keys |
| `CLERK_SECRET_KEY` | Yes (API routes) | Clerk Dashboard → Secret keys |
| `EXPO_PUBLIC_CLERK_ACCOUNT_PORTAL_URL` | Optional | Clerk Account Portal URL (Expo Go account fallback) |
| `NEO4J_URI` | Yes | Aura Console → Connect (`neo4j+s://…`) |
| `NEO4J_USERNAME` / `NEO4J_PASSWORD` / `NEO4J_DATABASE` | Yes | Aura instance |

---

## 4. Current State (working tree)

> **Status:** Phase 4 Home + Phase 4b Profile — **ready to commit** (uncommitted as of 2026-06-03).

### Summary of uncommitted work

**A. Home dashboard** (matches `prompt_material/04-home-dashboard.png`)

- Clerk greeting, static Neo-Brutal cards, logo in yellow header
- Start session → recorder tab

**B. Profile / Settings** (full user-facing scope)

- Neo-Brutal profile hub on settings tab
- Clerk account parity via native `UserProfileView` when dev build available
- Expo Go safe: no native view render; fallback card + optional Account Portal URL
- Teaching language, push pref toggle, shortcuts, help/legal, sign out

### Files added/changed (working tree)

| Path | Change |
|------|--------|
| `app/(tabs)/index.tsx` | Renders `HomeScreen` |
| `app/(tabs)/profile.tsx` | Renders `ProfileScreen` (was placeholder) |
| `app/profile/_layout.tsx`, `app/profile/account.tsx` | Clerk account stack |
| `components/home/*` | Home dashboard components |
| `components/profile/*` | Profile hub, header, menus, modal, fallback, native wrapper |
| `data/home-dashboard.ts`, `types/home-dashboard.ts` | Static home data |
| `hooks/use-home-greeting.ts` | Uses `lib/user-display-name.ts` |
| `hooks/use-profile-photo.ts` | Image picker + `setProfileImage` |
| `hooks/use-profile-account.ts` | Sign out, copy ID, portal browser |
| `hooks/use-profile-summary.ts` | 2FA, providers, language, member since |
| `lib/user-display-name.ts`, `lib/clerk-native-profile.ts` | Shared helpers |
| `constants/legal.ts` | Support/legal links |
| `store/preferences-store.ts` | Added `pushNotificationsEnabled` |
| `package.json` | `expo-image-picker`, `expo-clipboard` |
| `app.json` | Image picker plugin + iOS photo/camera usage strings |
| `.env.example` | Optional `EXPO_PUBLIC_CLERK_ACCOUNT_PORTAL_URL` |

### UX decisions

**Home**

- No “Teaching in: …” on header (language still in prefs for gate/STT later)
- Logo 100×100 inside yellow header only

**Profile**

- Header shows **only avatar + display name** (removed user ID, email, page title/subtitle clutter)
- Edit name moved to **Account → Edit name** menu row
- Sign out button: **red** (`destructive` palette)
- `UserProfileView` never rendered in Expo Go (`ExecutionEnvironment.StoreClient`)

**Suggested commits (can be one or two):**

1. `feat: home dashboard with Clerk greeting and Neo-Brutal cards`
2. `feat: profile settings hub with Clerk account and app preferences`

---

## 5. Stack (installed)

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54, Expo Router, React 19 |
| Styling | NativeWind v5 preview, Tailwind CSS v4 + StyleSheet for Neo-Brutal |
| Auth | Clerk `@clerk/expo` + `@clerk/backend`; native `@clerk/expo/native` (`UserProfileView`) |
| State | Zustand (`preferences-store`) + SecureStore persist |
| Database | **Neo4j AuraDB** — `neo4j-driver`, `lib/neo4j.ts` |
| Tab UI | Custom tab bar, Reanimated, Lottie |
| Profile media | `expo-image-picker`, `expo-clipboard` |
| Images | `expo-image` + `constants/images.ts` |
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
- Validation: lint, tsc, neo4j scripts — pass

### `0f8a5e4` — docs: record tab navigation commit hash in memory

---

## 7. Next Work (recommended order)

1. **Commit Phase 4 + 4b** — home dashboard + profile/settings (working tree)
2. **Recorder** — `expo-audio`, chunked capture (`prompt_material/05-core-recorder.png`)
3. **Calendar** — session history from Aura `(Teacher)-[:TAUGHT]->(Session)`
4. **Wire Home to Aura** — replace static `data/home-dashboard.ts`
5. **Notes verification UI** — `prompt_material/09-notes-verify.png`
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
| `prompt_material/01-design-system.png` | Neo-Brutal palette — used on Home + Profile |
| `prompt_material/05-core-recorder.png` | Recorder — next |
| `prompt_material/06-teaching-calendar.png` | Calendar |
| `prompt_material/09-notes-verify.png` | Notes verification |

---

*Last updated: 2026-06-03 — Phase 4 Home + Phase 4b Profile/Settings (uncommitted). HEAD on `dev` at `0f8a5e4`.*
