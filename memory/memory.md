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

---

## In progress (not yet committed)

_Items below will move into dated commit sections once committed._

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

---

## In progress (not yet committed)

_None — add the next feature section here after your next commit._

---

## Stack snapshot (current)

| Area | Choice |
|------|--------|
| Framework | Expo SDK 54, Expo Router, React 19 |
| Styling | NativeWind v5 preview + Tailwind CSS v4 |
| Auth (planned) | Clerk |
| Voice (planned) | Sarvam AI (backend only) |
| Analysis (planned) | Gemini (backend only) |
| DB (planned) | Neon Postgres + Drizzle |

---

## How to use this file

1. After each commit, add a new `### \`<hash>\` — <subject>` section above “In progress”.
2. Remove completed items from **In progress**.
3. Keep entries short: what changed and why, not every file name unless helpful.
