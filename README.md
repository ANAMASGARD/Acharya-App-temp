# Acharya

AI-powered teaching assistant for teachers — record classroom sessions, transcribe with Sarvam AI, and get actionable teaching reports. Built with **Expo SDK 54** and **Expo Router**.

See **[AGENTS.md](./AGENTS.md)** for full product vision, architecture, and implementation rules.  
See **[memory/memory.md](./memory/memory.md)** for a commit-by-commit log of what has been done so far.

---

## Requirements

- Node.js 18+
- npm (or yarn/pnpm)
- [Expo Go](https://expo.dev/go) or a [development build](https://docs.expo.dev/develop/development-builds/introduction/) for device testing

---

## Get started

```bash
npm install
npx expo start
```

After changing NativeWind or Metro config, clear the bundler cache:

```bash
npx expo start --clear
```

Open the app on a device or simulator from the Expo CLI menu.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Start with Android |
| `npm run ios` | Start with iOS |
| `npm run web` | Start web |
| `npm run lint` | ESLint (`expo lint`) |

Typecheck (when needed):

```bash
npx tsc --noEmit
```

---

## Project layout

```txt
app/              # Expo Router screens (compose UI here)
components/       # Reusable UI (as features grow)
memory/           # Project memory log (commit history)
AGENTS.md         # Agent + developer source of truth
global.css        # Tailwind v4 + NativeWind theme imports
```

Starter template code from `create-expo-app` lives under **`app-example/`** for reference; active routes are under **`app/`**.

---

## Styling (NativeWind v5)

This project uses **NativeWind v5** (preview) with **Tailwind CSS v4**:

- Utilities via `className` on React Native components where supported
- `global.css` imported in `app/_layout.tsx` (not in the Router entry file)
- Neo-Brutal shadows, press states, and some RN-specific components still use `StyleSheet` per `AGENTS.md`

Docs: [NativeWind v5 installation](https://www.nativewind.dev/v5/getting-started/installation)

---

## Status

Early setup: minimal home screen, NativeWind configured, full product features (recorder, calendar, chat, etc.) not implemented yet. Track progress in **[memory/memory.md](./memory/memory.md)**.

---

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
