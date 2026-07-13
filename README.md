# Acharya

**AI-powered teaching assistant for Indian school teachers** — record live classes, transcribe with Sarvam AI, get coaching reports, verify notes against NCERT, and talk to Chat Acharya in text or voice.

Built with **Expo SDK 54**, **Expo Router**, **Neo4j AuraDB**, **Sarvam AI**, and **LiveKit** (voice in production builds).

| Docs | Purpose |
|------|---------|
| [AGENTS.md](./AGENTS.md) | Product vision, architecture, implementation rules |
| [memory/memory.md](./memory/memory.md) | Commit-by-commit project history |
| [docs/VOICE.md](./docs/VOICE.md) | Voice agent setup (Expo Go + standalone APK) |

---

## Download

Install the Android APK from GitHub Releases (for judges, testers, and sideloading):

<a href="https://github.com/ANAMASGARD/Acharya-App/releases/latest">
  <img src="assets/badges/get-it-on-github.png" alt="Get it on GitHub" width="250" />
</a>

> **Note:** The APK needs a deployed backend. Set `EXPO_PUBLIC_API_URL` to that URL before building, or use a build that was already configured with your team's API URL.

---

## Features

- **Classroom recorder** — long sessions, chunked upload, Sarvam STT, teaching report + class notes
- **Teaching calendar** — session history from Neo4j Aura
- **Chat Acharya** — text coach with curriculum search, memory, and web lookup
- **Voice coach** — live two-way Sarvam voice (Expo Go locally, LiveKit in APK)
- **Notes verification** — RAG against NCERT curriculum graph
- **Teacher community** — feed and posts

---

## Quick start (development)

**Requirements:** Node.js 18+, npm, [Expo Go](https://expo.dev/go) on Android for device testing.

```bash
cp .env.example .env   # add Clerk + Neo4j keys (see .env.example)
npm install
npx expo start
```

For **voice in Expo Go** (two terminals):

```bash
./voice-backend.sh     # Terminal 1 — local Sarvam voice gateway
./expo-local.sh        # Terminal 2 — Expo Go
```

Full voice guide: **[docs/VOICE.md](./docs/VOICE.md)**

---

## What is `EXPO_PUBLIC_API_URL`?

This is the **public base URL of your Acharya backend** — where the app's API routes live (`app/api/**`).

| How you run the app | How the app finds the API |
|---------------------|---------------------------|
| **Expo Go** (dev) | Auto — uses your laptop IP from Metro, e.g. `http://192.168.1.5:8081` |
| **Standalone APK** (release) | **Must be set** — baked into the APK at build time |

### Why the APK needs it

A sideloaded APK does **not** connect to your laptop's Metro dev server. Every API call (auth, recorder, chat, voice session, calendar, Neo4j) goes to:

```
{EXPO_PUBLIC_API_URL}/api/...
```

Examples:

- Voice session: `POST {EXPO_PUBLIC_API_URL}/api/voice/session`
- Chat: `POST {EXPO_PUBLIC_API_URL}/api/chat/completions`
- Health check: `GET {EXPO_PUBLIC_API_URL}/api/health/neo4j`

### What value to put

Use the **HTTPS URL** where you deployed this repo's server/API routes. No trailing slash.

```env
EXPO_PUBLIC_API_URL=https://your-acharya-api.example.com
```

**Same URL** should be used for the LiveKit agent webhook:

```env
ACHARYA_API_BASE_URL=https://your-acharya-api.example.com
```

### How to get that URL

1. **EAS Hosting** (recommended for Expo API routes) — deploy server output from this project:
   ```bash
   npm install          # includes eas-cli
   npm run eas:login    # one-time browser login
   npm run deploy:api   # export + deploy + auto-set EXPO_PUBLIC_API_URL in .env
   ```
   Production URL example: `https://acharya-app.expo.app`

2. **Any public HTTPS host** — VPS, Railway, Render, etc., as long as `app/api/**` routes run with your `.env` secrets (Clerk, Neo4j, Sarvam, LiveKit).

### What stays server-only (never in the APK)

These live only on the deployed API host — **not** `EXPO_PUBLIC_*`:

- `CLERK_SECRET_KEY`, `NEO4J_*`, `SARVAM_API_KEY`
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `VOICE_SESSION_SIGNING_SECRET`, `VOICE_AGENT_WEBHOOK_SECRET`

The APK only needs `EXPO_PUBLIC_API_URL` + `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` at build time.

---

## Build release APK (standalone + LiveKit voice)

**Requirements:** JDK 17+, Android SDK, filled `.env` with `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.

**Before building:**

1. Deploy API with all server secrets (Clerk, Neo4j, Sarvam, LiveKit).
2. Deploy LiveKit voice agent: `bash scripts/deploy-voice-livekit.sh`
3. Set `EXPO_PUBLIC_API_URL` and `ACHARYA_API_BASE_URL` to the same public API URL.

**Build (two commands):**

```bash
source scripts/android-env.sh
npm run android:standalone-apk
```

Output: `dist/acharya-<version>.apk`

Install on device:

```bash
adb install -r dist/acharya-1.0.2.apk
```

**Publish for judges / submission:**

```bash
bash scripts/publish-github-release.sh v1.0.2 dist/acharya-1.0.2.apk
```

The README download badge then points to the latest release APK.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Start with Android |
| `npm run ios` | Start with iOS |
| `npm run web` | Start web |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npm run eas:login` | One-time Expo/EAS browser login |
| `npm run deploy:api` | Deploy API to EAS Hosting + set `EXPO_PUBLIC_API_URL` |
| `npm run release:all` | Full pipeline: deploy API → build APK → GitHub release |
| `npm run android:standalone-apk` | Build release APK (LiveKit native modules included) |
| `bash scripts/publish-github-release.sh` | Upload APK to GitHub Releases |
| `bash scripts/deploy-voice-livekit.sh` | Deploy Sarvam voice agent to LiveKit Cloud |
| `./voice-backend.sh` | Local voice gateway (Expo Go) |
| `./expo-local.sh` | Expo Go dev server |
| `npm run sync:voice-prompt` | Sync voice prompt to Python services |
| `npm run verify:neo4j` | Verify Neo4j Aura connectivity |

---

## Voice: Expo Go vs standalone APK

| | Expo Go | Standalone APK |
|---|---------|----------------|
| **Voice transport** | WebSocket → `services/voice-local/` on your laptop | LiveKit → `services/voice-livekit/` in the cloud |
| **API URL** | Metro auto-detect | `EXPO_PUBLIC_API_URL` (required at build) |
| **Use case** | Local development | Judges, testers, production sideload |

---

## Project layout

```txt
app/                  # Expo Router screens + API routes (app/api/**)
components/           # Reusable UI
lib/                  # API clients, graph, AI helpers
services/
  voice-local/        # WebSocket voice (Expo Go)
  voice-livekit/      # LiveKit voice agent (APK)
scripts/              # Build, Neo4j, release helpers
neo4j/                # Aura schema + graph model
docs/VOICE.md         # Voice operator guide
```

---

## Submission checklist (hackathon / judges)

1. Deploy API → copy URL into `EXPO_PUBLIC_API_URL`
2. Deploy LiveKit agent → `bash scripts/deploy-voice-livekit.sh`
3. Build APK → `source scripts/android-env.sh && npm run android:standalone-apk`
4. Publish release → `bash scripts/publish-github-release.sh v1.0.2 dist/acharya-1.0.2.apk`
5. Share in submission:
   - **APK link:** https://github.com/ANAMASGARD/Acharya-App/releases/latest
   - **API URL:** your `EXPO_PUBLIC_API_URL` (for reviewers testing live features)

---

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router API routes](https://docs.expo.dev/router/web/api-routes/)
- [EAS Hosting](https://docs.expo.dev/eas/hosting/introduction/)
- [LiveKit Cloud](https://cloud.livekit.io)
- [Sarvam AI docs](https://docs.sarvam.ai)
