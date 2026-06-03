# Acharya — Project Memory

Chronological log of what we have built. **Update this file after each meaningful commit** so anyone (or an agent) can see project history at a glance.

---

## Commits

### `7936d2b` — Initial commit

- Created Expo SDK 54 project with `create-expo-app` template
- Expo Router: tabs layout, explore/home screens, modal route
- Starter components (`themed-text`, `parallax-scroll-view`, etc.), hooks, `constants/theme.ts`
- Assets (icons, splash), `app.json`, ESLint, TypeScript strict config
- Stub `AGENTS.md` pointing at Expo v54 docs; `CLAUDE.md` symlink-style pointer

### `62cc316` — feat 1 : Setup

- Simplified app shell: removed tab navigator and starter screens from `app/`
- Root layout is a bare `Stack`; home is `app/index.tsx` with placeholder “Acharya App”
- Removed unused components/hooks/constants from active `app/` tree (template preserved under `app-example/`)
- Disabled `reset-project` script usage path for day-to-day dev

### `014d98d` — docs: add full AGENTS.md product and architecture guidelines

- Replaced Expo stub `AGENTS.md` with full Acharya agent/developer spec (~1000 lines)
- Documents product vision, core features, tech stack (Expo 54, Sarvam, Gemini, Neon, Clerk)
- Recorder architecture, API/security rules, Neo-Brutal styling, NativeWind v5 rules, folder layout

### `c657848` — feat: set up NativeWind v5 with Tailwind CSS v4

- Packages: `nativewind@5.0.0-preview.4`, `react-native-css@^3.0.7`, `tailwindcss@^4`, `@tailwindcss/postcss`, `postcss`
- `global.css` — Tailwind v4 layer imports + `nativewind/theme`
- `postcss.config.mjs` — `@tailwindcss/postcss` plugin
- `metro.config.js` — `withNativewind(getDefaultConfig(__dirname))`
- `package.json` — `overrides.lightningcss` pinned to `1.30.1`
- `nativewind-env.d.ts` — `react-native-css` types; included in `tsconfig.json`
- `app/_layout.tsx` — imports `../global.css` (top layout for Fast Refresh)
- `app/index.tsx` — Neo-Brutal cream/black `className` smoke test on home screen

### `49dd7e5` — docs: add project memory log and Acharya-focused README

- Added `memory/memory.md` (this file) at repo root `memory/` folder
- README replaced generic Expo template copy with Acharya overview, scripts, layout, NativeWind notes
- Links to `AGENTS.md` and `memory/memory.md` for onboarding

### `a3a2b68` — docs: record README and memory commit in project memory log

- Finalized changelog entry for `49dd7e5`; cleared stale “In progress” section

### `7fb770d` — docs: log memory maintenance commit in project memory

- Documented `a3a2b68` in the changelog (this file)

### `bffca1f` — docs: sync project memory changelog through latest commit

- Brought memory log in sync with commits through `7fb770d`

### `99fb9cf` — docs: use hash-agnostic entry for memory sync commit in changelog

- Minor memory changelog maintenance (hash-agnostic wording for sync commits)

### `e400509` — feat 4 : Design Theme

**Summary:** Full Neo-Brutal / RetroUI-aligned design system for React Native (NativeWind v5), matching `prompt_material/01-design-system.png`, with a live design-kit demo on the home screen.

**Theme & tokens (`theme/`)**

- `colors.ts` — RetroUI semantic palette (`primary` `#FFDB33`, `border` `#000`, `background` `#fff`, etc.) plus Acharya accent swatches (mint, sky, coral, lime, lavender)
- `typography.ts` — type scale (H1/H2/Body/Caption); **Archivo Black** for headings, **Space Grotesk** for body
- `fonts.ts` — `expo-font` asset map (only RetroUI fonts loaded at runtime)
- `tokens.ts` — borders, spacing, **radius 0** (sharp neo-brutal), hard shadow presets for StyleSheet use

**Global CSS (`global.css`)**

- RetroUI-style `:root` CSS variables and `@theme` Tailwind tokens
- Hard offset shadows (`shadow-xs` … `shadow-2xl`) — no soft blur
- Utilities: `font-head`, `font-sans`, `text-head-h1`, `text-body`, `neo-card`, `neo-input`, `neo-button-primary`, semantic colors (`bg-primary`, `text-foreground`, etc.)

**Fonts (`assets/fonts/`)**

- Active: `ArchivoBlack-Regular.ttf`, `SpaceGrotesk-Regular/Medium/Bold.ttf` (from Google Fonts / Fontsource)
- Legacy in repo (not loaded): Poppins Regular/Medium/SemiBold/Bold — can be deleted later

**App wiring**

- `app/_layout.tsx` — loads fonts via `useFonts`, splash screen until ready, cream/white `background` from theme
- `app/index.tsx` — scrollable **design system showcase**: palette, typography rows, buttons, inputs, cards, mascot state tiles

**Assets & references**

- `constants/images.ts` — centralized image exports (`moscot-logo`, mascots, UI art: earth, palace, treasure, streak-fire, etc.)
- `prompt_material/*.png` — design references for onboarding, auth, home, recorder, calendar, community, notes-verify
- `assets.d.ts` — TypeScript modules for `.png` / `.ttf`
- `tsconfig.json` — excludes `app-example` from typecheck

**Validation (at time of commit):** `npm run lint` and `npx tsc --noEmit` pass.

---

## In progress (not yet committed)

_None — add the next feature section here after your next commit._

---

## Stack snapshot (current)

| Area | Choice |
|------|--------|
| Framework | Expo SDK 54, Expo Router, React 19 |
| Styling | NativeWind v5 preview + Tailwind CSS v4 |
| Design system | RetroUI-inspired tokens in `global.css` + `theme/`; Neo-Brutal hard shadows, `--radius: 0` |
| Fonts (active) | Archivo Black (headings), Space Grotesk (body) via `expo-font` |
| Images | `constants/images.ts` registry |
| Auth (planned) | Clerk |
| Voice (planned) | Sarvam AI (backend only) |
| Analysis (planned) | Gemini (backend only) |
| DB (planned) | Neon Postgres + Drizzle |

---

## Context summary (where we are now)

1. **Product** — Acharya teacher app: recorder, transcripts, reports, calendar, chat coach, notes verification (see `AGENTS.md`).
2. **App shell** — Minimal Expo Router stack; home screen currently doubles as the **design system demo**, not production UI yet.
3. **Styling** — NativeWind v5 is configured; use semantic classes (`bg-primary`, `font-head`, `neo-card`) and `theme/` tokens for StyleSheet/dynamic cases.
4. **Next screens** — Reference mocks live in `prompt_material/` (02 onboarding, 03 auth, 04 home, etc.); image assets are committed and registered for upcoming UI work.
5. **Not in this repo yet** — Clerk auth, recorder (`expo-audio`), API routes, Neon/Drizzle, real tab navigation.

---

## How to use this file

1. After each commit, add a new `### \`<hash>\` — <subject>` section above “In progress”.
2. Remove completed items from **In progress**.
3. Keep entries short: what changed and why, not every file name unless helpful.
4. Update **Stack snapshot** and **Context summary** when architecture or conventions change materially.
