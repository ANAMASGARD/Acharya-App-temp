# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§4 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, notes verification) |
| **Phase** | **Phase 3.5 — Language selection** (post-login gate; committing now) |
| **Previous phases** | Phase 0–2 committed → Phase 3 Auth + Aura (`4ac6e6f`) |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — auth + language flow; **AuraDB requires full `.env`** (see §3 Environment) |
| **Last committed feature** | Clerk auth + Neo4j Aura foundation (`4ac6e6f`) |
| **Latest work (this commit)** | Neo-Brutal language screen, Zustand + SecureStore prefs, post-login gate |

### What works today (if `.env` is configured)

**Auth (needs `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` only)**

- Onboarding at `/onboarding` → Get Started → `/sign-up`
- Custom Sign Up / Sign In (Neo-Brutal UI, no password fields)
- Email OTP via Clerk (6-digit modal, auto-submit on last digit)
- Google / Facebook OAuth via `useSSO` + browser (Expo Go)
- Signed-in users: **no language saved** → `/language`; after Confirm → `/` (home stub)
- Language preference persisted via Zustand + **expo-secure-store** (AsyncStorage native module failed in Expo Go)
- Signed-out users → `/onboarding`

**AuraDB (needs full `.env` — Clerk secret + Neo4j Aura credentials)**

- `neo4j-driver` + server-only `lib/neo4j.ts` (enforces `neo4j+s://`)
- Schema DDL in `neo4j/schema.cypher` (constraints, indexes, vector index)
- Live API routes: `GET /api/health/neo4j`, `GET|POST /api/sessions`
- Clerk auth only on client; Aura stores product data (recordings, RAG, reports) — `clerkId` is a reference key, not auth storage
- CLI: `npm run verify:neo4j`, `npm run neo4j:apply-schema`, `npm run neo4j:test`

**Validation (last run — AuraDB live):**

- `npm run verify:neo4j` — pass (Aura TLS OK)
- `npm run neo4j:apply-schema` — pass (12 constraints/indexes)
- `npm run neo4j:test` — pass (MERGE Teacher, TAUGHT Session, cleanup)
- `GET /api/health/neo4j` — HTTP 200, `connected: true`
- `npm run lint` / `npx tsc --noEmit` / `npx expo-doctor` — pass (2026-06-03, language feature)

**Aura instance:** Provisioned and verified live. Schema applied via `npm run neo4j:apply-schema` (no cypher-shell required).

### Language selection (signed-in)

- Route `/language` — 23 Sarvam Indian languages + English (`data/languages.ts`)
- Neo-Brutal UI: search, Popular / All sections, rounded cards, green check toggle, Confirm CTA
- Footer: Confirm + `earth.png` (up to 480×300px), pinned bottom
- `store/preferences-store.ts` + `hooks/use-language-gate.ts` + SecureStore persist adapter
- Home: change-language link + clear-storage test button

### Not built yet

- Home dashboard (`prompt_material/04-home-dashboard.png` — note: `04-language-selection-screen.png` is done)
- Recorder (`expo-audio`), chunk upload, Sarvam STT pipeline
- Transcript/report nodes on Aura, calendar UI, chat coach, notes verification (RAG)
- Tab navigation

---

## 2. Project Phase Map

```
Phase 0  Bootstrap          ✅ committed   Expo 54 shell, AGENTS.md
Phase 1  Design system      ✅ committed   theme/, global.css, fonts
Phase 2  Onboarding         ✅ committed   /onboarding (was /), 3 slides
Phase 3  Auth + AuraDB      ✅ committed   `4ac6e6f` Clerk, API routes, Neo4j graph
Phase 3.5 Language pick     ✅ committing  `/language`, SecureStore prefs, gate
Phase 4  Home dashboard     ⬜ planned     prompt_material/04-home-dashboard
Phase 5  Recorder pipeline ⬜ planned     expo-audio, Sarvam, Gemini → Aura nodes
Phase 6  Core product       ⬜ planned     calendar, chat, notes RAG on Aura
```

---

## 3. Architecture Snapshot

### Routes (Expo Router)

| Route | File | Who sees it | Notes |
|-------|------|-------------|-------|
| `/` | `app/index.tsx` | Signed-in + language set | Home stub; redirects to `/language` if no prefs |
| `/language` | `app/language.tsx` | Signed-in | Post-login language gate; Confirm → `/` |
| `/onboarding` | `app/onboarding.tsx` | New users | 3-slide carousel; Get Started → `/sign-up` |
| `/sign-up` | `app/(auth)/sign-up.tsx` | Signed-out | NAME + EMAIL, social + email OTP |
| `/sign-in` | `app/(auth)/sign-in.tsx` | Signed-out | EMAIL only, social + email OTP |
| `(auth)/_layout` | `app/(auth)/_layout.tsx` | — | Redirects signed-in users to `/` |

### Auth flow

```
App open → / → (unsigned) → /onboarding → Get Started → /sign-up
  → Continue with Email → 6-digit modal → verify → / → /language (first time) → Confirm → / (home)
  → Continue with Google/Facebook → OAuth browser → same language gate
/sign-in ↔ /sign-up via cross-links
```

### Key folders

| Path | Role |
|------|------|
| `app/` | Routes/screens only (no fat business logic) |
| `components/auth/` | Auth shell, social buttons, verification modal |
| `lib/auth-flow.ts` | Clerk email OTP helpers (sign-up + sign-in) |
| `lib/neo4j.ts` | Aura driver singleton (API routes only; `neo4j+s://` required) |
| `lib/graph/` | Teacher MERGE, Session create/list (live Cypher) |
| `lib/api-auth.ts` | Clerk Bearer verification via `@clerk/backend` |
| `lib/api-client.ts` | Authenticated fetch to `/api/*` |
| `app/api/` | Health + sessions API routes (Clerk-verified; no auth stored in Aura) |
| `neo4j/` | `schema.cypher`, `graph-model.md` |
| `hooks/` | `use-social-auth.ts`, `use-warm-up-browser.ts`, `use-language-gate.ts`, `use-preferences-hydration.ts` |
| `store/` | `preferences-store.ts` (Zustand persist → SecureStore) |
| `data/languages.ts` | 23 Sarvam BCP-47 codes + native labels |
| `components/language/` | Search bar + list item (Neo-Brutal cards) |
| `theme/` | colors, typography, fonts, tokens (Neo-Brutal) |
| `data/onboarding-slides.ts` | Static onboarding copy + mascots |
| `constants/images.ts` | Centralized image imports |
| `prompt_material/` | Design reference PNGs (01–09) |
| `memory/` | This file |

### Design system (active)

- **Style:** Neo-Brutal — thick black borders, hard offset shadows, cream `#FFF8E7`
- **Fonts:** Archivo Black (headings), Space Grotesk (body)
- **Styling:** NativeWind v5 + Tailwind v4 (`global.css`); auth inputs/modals use StyleSheet per AGENTS.md exceptions
- **Primary CTA:** Yellow `#FFDB33`, `neo-button-primary` utility

### Environment (`.env` — copy from `.env.example`)

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | [Clerk Dashboard](https://dashboard.clerk.com) → your app → **API keys** → Publishable key (`pk_test_…` or `pk_live_…`) |
| `CLERK_SECRET_KEY` | Yes (API routes) | Same Clerk page → **Secret keys** (`sk_test_…`). Server only — never prefix with `EXPO_PUBLIC_` |
| `NEO4J_URI` | Yes | [Neo4j Aura Console](https://console.neo4j.io) → your instance → **Connect** → URI (`neo4j+s://….databases.neo4j.io`) |
| `NEO4J_USERNAME` | Yes | Almost always `neo4j` (shown on Connect screen) |
| `NEO4J_PASSWORD` | Yes | Password you set when creating the Aura instance (or reset in console) |
| `NEO4J_DATABASE` | Optional | Default `neo4j` |

**After filling `.env`:**

1. Apply graph schema once:  
   `cypher-shell -a "$NEO4J_URI" -u neo4j -p "$NEO4J_PASSWORD" -f neo4j/schema.cypher`
2. Verify connectivity: `npm run verify:neo4j`
3. Restart Expo: `npx expo start --clear`
4. Sign in → home should show **AuraDB connected — teacher graph node synced**

Clerk Dashboard checklist: Native API on, email verification code enabled, Google/Facebook SSO, redirect URL `acharyaapp://`.

---

## 4. Current State (working tree)

> **Status:** Language selection feature ready; committed with this memory update.

### Neo4j Aura — what “installed” means

| Layer | Status |
|-------|--------|
| npm package `neo4j-driver` | ✅ Installed |
| npm package `@clerk/backend` | ✅ Installed (API auth) |
| Driver + helpers (`lib/neo4j.ts`, serialize, graph repos) | ✅ Done |
| Schema DDL (`neo4j/schema.cypher`) | ✅ Ready to apply on **your** Aura instance |
| Graph model docs (`neo4j/graph-model.md`) | ✅ Done |
| API routes (health, teacher sync, sessions) | ✅ Done |
| AGENTS.md HACKHAZARDS Aura track rules | ✅ Done |
| **Your cloud Aura instance** | ✅ Connected (verified `npm run verify:neo4j`) |
| **Schema applied to Aura** | ✅ 12 DDL statements applied (`npm run neo4j:apply-schema`) |
| **Integration tests** | ✅ All pass (`npm run neo4j:test`) |
| **API health route** | ✅ `GET /api/health/neo4j` → 200, live Cypher |
| **`.env` filled** | Clerk + Neo4j; `CLERK_SECRET_KEY` for authenticated session APIs |

### Best practices followed

- Aura TLS only (`neo4j+s://` enforced in code)
- Credentials server-only (never `EXPO_PUBLIC_`)
- Uniqueness constraints before MERGE ingestion
- Parameterized Cypher (no string concatenation)
- `executeRead` / `executeWrite` session modes
- MERGE for idempotent Teacher nodes; `(Teacher)-[:TAUGHT]->(Session)` for calendar history
- Vector index placeholder for future RAG (`chunk_embedding`, 1536 dims)
- `app.json` web `output: "server"` so API routes work

### Changed / added — language selection (latest)

**Routes & gate**

- `app/language.tsx` — Neo-Brutal picker (search, sections, Confirm, earth footer)
- `app/index.tsx` — redirect to `/language` when `selectedLanguageId` null; home links for change/clear test

**Data & state**

- `data/languages.ts`, `types/language.ts` — 23 Sarvam languages (22 Indian + `en-IN`)
- `store/preferences-store.ts` — Zustand persist; `lib/preferences-persist-storage.ts` uses **expo-secure-store** (fixes AsyncStorage native null in Expo Go)
- `hooks/use-preferences-hydration.ts` — root rehydrate + safety timeout
- `hooks/use-language-gate.ts` — Clerk loaded + store hydrated before routing

**UI**

- `components/language/language-search-bar.tsx`, `language-list-item.tsx` — rounded cards, green check, tap-to-toggle selection
- `constants/images.ts` — `earth` asset
- `theme/tokens.ts` — `radii.lg`, `radii.xl`
- Packages: `zustand`, `@react-native-async-storage/async-storage@2.2.0` (expo pin; prefs use SecureStore)

**Validation (2026-06-03):** `npm run lint`, `npx tsc --noEmit`, `npx expo-doctor`, `npm run verify:neo4j` — all pass.

### Previously committed — Auth + Aura (`4ac6e6f`)

**Routes**

- Moved onboarding from `/` → `app/onboarding.tsx`
- `app/index.tsx` → auth-gated home placeholder
- Added `app/(auth)/sign-up.tsx`, `sign-in.tsx`, `_layout.tsx`

**Clerk**

- Packages: `@clerk/expo`, `@clerk/backend`, `expo-secure-store`, `expo-auth-session`
- `ClerkProvider` + official `tokenCache` from `@clerk/expo/token-cache`
- Passwordless email OTP in `lib/auth-flow.ts`
- OAuth via `useSSO` + `AuthSession.makeRedirectUri` in `hooks/use-social-auth.ts`
- Sign-up includes `nativeID="clerk-captcha"` for Clerk bot protection

**UI**

- `components/auth/auth-screen-shell.tsx` — layout + labeled inputs (rounded 8px)
- `components/auth/social-auth-button.tsx` — Google logo PNG, email icon, Facebook button
- `components/auth/verification-code-modal.tsx` — 6-digit number pad, keyboard-aware
- Assets: `google-logo.png`, `mascot-auth.png` in `constants/images.ts`

**Config**

- `.env.example` with Clerk + Neo4j Aura checklist
- `app.json` plugins: `@clerk/expo`, `expo-secure-store`; web `output: "server"` for API routes

**Neo4j Aura (primary DB — HACKHAZARDS track)**

- `lib/neo4j.ts` — Aura driver (`neo4j+s://` enforced)
- `lib/graph/session.ts` — live Cypher (lazy Teacher anchor + TAUGHT)
- `app/api/health/neo4j+api.ts`, `app/api/sessions+api.ts`
- `neo4j/schema.cypher`, `neo4j/graph-model.md`
- `scripts/verify-neo4j.mjs`, `apply-neo4j-schema.mjs`, `test-neo4j-integration.mjs`, `load-env.mjs`
- `types/graph.ts` — Session + TeacherAnchor types

**Validation (last run):**

- See §1 Quick Read — Aura integration tests pass

---

## 5. Stack (installed)

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54, Expo Router, React 19 |
| Styling | NativeWind v5 preview, Tailwind CSS v4 |
| Auth | Clerk `@clerk/expo` + `@clerk/backend` (email OTP, Google/Facebook OAuth) |
| Database | **Neo4j AuraDB** (primary) — `neo4j-driver`, `lib/neo4j.ts`, `neo4j/schema.cypher` |
| Images | `expo-image`; registry in `constants/images.ts` |
| Planned voice | Sarvam AI (backend only) |
| Planned analysis | Gemini (backend only) |

---

## 6. Commit Log (oldest → newest)

Read top-to-bottom = project timeline. **Feature commits** are detailed; **docs/meta commits** are one line.

---

### `7936d2b` — Initial commit

- Expo SDK 54 app from `create-expo-app`
- Expo Router tabs, starter screens, template components
- Stub `AGENTS.md`, assets, ESLint, TypeScript strict

---

### `62cc316` — feat 1 : Setup

- Stripped template tabs; bare `Stack` layout
- `app/index.tsx` placeholder “Acharya App”
- Removed unused starter code from active tree

---

### `014d98d` — docs: add full AGENTS.md

- Full Acharya product + architecture spec (~1000 lines)
- Recorder pipeline, stack, Neo-Brutal rules, folder conventions

---

### `c657848` — feat: NativeWind v5 + Tailwind v4

- Installed NativeWind v5 preview, `react-native-css`, Tailwind v4, PostCSS
- `global.css`, `metro.config.js`, `nativewind-env.d.ts`
- Root layout imports CSS; home className smoke test

---

### `49dd7e5` — docs: memory log + README

- Created `memory/memory.md`
- Acharya-focused README (scripts, layout, NativeWind)

---

### `a3a2b68` · `7fb770d` · `bffca1f` · `99fb9cf` — docs: memory maintenance

- Changelog housekeeping only; no product code changes

---

### `e400509` — feat 4 : Design Theme

- **Theme:** `theme/colors.ts`, `typography.ts`, `fonts.ts`, `tokens.ts`
- **Global CSS:** RetroUI tokens, hard shadows, `neo-*` utilities, cream palette
- **Fonts:** Archivo Black + Space Grotesk via `expo-font`
- **Home:** Design-system showcase on `/` (later replaced by onboarding)
- **Assets:** `constants/images.ts`; design refs in `prompt_material/`

---

### `00ba6ae` — feat : Onboarding Screen

- **UX:** 3-page horizontal pager (`FlatList`), dots, Next / Get Started CTA
- **Content:** `data/onboarding-slides.ts` — welcome, record, insights slides
- **Design:** Matches `prompt_material/02-onboarding-screen.png`
- **Theme:** `colors.cream` `#FFF8E7`; cream stack background
- **Note:** Get Started was stubbed (auth added later, uncommitted)

---

### `4ac6e6f` — feat: Clerk auth and Neo4j Aura foundation

- Clerk auth screens, OAuth, email OTP
- Neo4j Aura driver, schema, session graph repo, API routes

### `cab10a0` — feat: post-login language selection with SecureStore persistence

- `/language` Neo-Brutal picker; 23 Sarvam languages; SecureStore persistence
- Post-login gate on `/`; home change-language + test clear-storage

---

## 7. Next Work (recommended order)

1. **Fill `.env`** — Clerk + Neo4j Aura (see §3 Environment)
2. **Apply schema** — `cypher-shell … -f neo4j/schema.cypher`
3. **Commit** auth + Aura foundation on `dev`
4. **Home dashboard** — `prompt_material/04-home-dashboard.png`
3. **Tab shell** — main app navigation after auth
4. **Recorder** — `expo-audio`, chunked capture, processing states
5. **Backend** — Sarvam STT, Gemini analysis; extend Aura graph (transcripts, reports, RAG)

---

## 8. Agent Maintenance Instructions

When you finish a meaningful commit:

1. Move **§4 Current State** content into **§6 Commit Log** with the real hash + subject.
2. Reset **§4** to `_None — awaiting next feature._` or new in-progress notes.
3. Update **§1 Quick Read** (phase, last commit, what works / not built).
4. Update **§2 Phase Map** checkmarks.
5. Update **§3** only if routes, folders, or stack changed.
6. Keep entries **short bullet points** — not every filename unless it helps the next agent.

**Do not** log pure typo fixes or lockfile-only bumps unless they unblock the team.

---

## 9. Design References

| File | Screen |
|------|--------|
| `prompt_material/01-design-system.png` | Design kit / tokens |
| `prompt_material/02-onboarding-screen.png` | Onboarding ✅ |
| `prompt_material/03-auth-screen.png` | Sign up / sign in ✅ (local) |
| `prompt_material/04-language-selection-screen.png` | Language picker ✅ |
| `prompt_material/04-home-dashboard.png` | Home dashboard — next |
| `prompt_material/05-core-recorder.png` | Recorder |
| `prompt_material/06-teaching-calendar.png` | Calendar |
| `prompt_material/08-teacher-community.png` | Community |
| `prompt_material/09-notes-verify.png` | Notes verification |

---

*Last updated: Language selection (`cab10a0`). HEAD on `dev`.*
