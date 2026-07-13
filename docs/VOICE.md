# Chat Acharya Voice Agent

One `.env` at the repo root. Two terminals for local testing (backend + Expo).

| How you run the app | What handles voice |
|---------------------|-------------------|
| **Expo Go** on Android (laptop) | `services/voice-local/` (WebSocket) |
| **Standalone APK** (release build) | LiveKit Cloud + `services/voice-livekit/` |

---

## Prerequisites

- Node.js 18+
- **Python 3.11+** (3.12 preferred; 3.14 works on Fedora if that is your system `python3`)
- [Expo Go](https://expo.dev/go) on your Android phone
- Phone and laptop on the **same Wi‑Fi**
- Root `.env` with Clerk, Neo4j, and voice vars (see below)

---

## Root `.env` (required voice vars)

Copy from `.env.example` and fill in:

```env
SARVAM_API_KEY=sk_your_key
VOICE_SESSION_SIGNING_SECRET=<openssl rand -hex 32>
VOICE_AGENT_WEBHOOK_SECRET=<openssl rand -hex 32>
```

Generate secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

For **standalone APK + LiveKit**, also add:

```env
EXPO_PUBLIC_API_URL=https://your-public-api-url
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_AGENT_NAME=acharya-voice-agent
ACHARYA_API_BASE_URL=https://your-public-api-url
```

`EXPO_PUBLIC_API_URL` is baked into the APK at build time so the app can reach `/api/voice/session` without Metro. LiveKit secrets stay **server-only** — the APK always uses LiveKit transport when not running in Expo Go.

You do **not** need a separate `.env` inside `services/`.

---

## Expo Go — local test (two terminals)

Like web dev: backend in one terminal, app in another.

**Terminal 1 — voice AI backend:**

```bash
./voice-backend.sh
```

**Terminal 2 — Expo app:**

```bash
./expo-local.sh
```

(`./localvoiceagent.sh` prints these instructions if you forget.)

Then on your phone:

1. Open **Expo Go** → scan the QR code
2. Sign in → **Chat Acharya**
3. Tap **Voice** → allow microphone
4. Hear the opening line → speak → tap **End**

### Troubleshooting (Expo Go)

| Problem | Fix |
|---------|-----|
| `pip install` / `sarvamai` error | Delete `services/voice-local/.venv` and rerun; or install `python3.12` and rerun |
| `No module named uvicorn` | Install failed — rerun `./voice-backend.sh` |
| Network / connection failed on phone | Phone and laptop on same Wi‑Fi; Expo must be on port **8081** (`expo-local.sh` forces this). If Expo uses 8082, run `EXPO_API_PORT=8082 ./voice-backend.sh` |
| Voice connection failed | Allow ports 8080 + 8081 in firewall |
| "Voice agent is not configured" | Add `VOICE_*` secrets to root `.env`, restart both terminals |
| No transcript after End | Both terminals running; backend uses `ACHARYA_API_BASE_URL` matching Expo port |

**Fedora firewall:**

```bash
sudo firewall-cmd --add-port=8080/tcp --add-port=8081/tcp
sudo firewall-cmd --runtime-to-permanent
```

---

## Standalone APK + LiveKit Cloud

Expo Go cannot use LiveKit (native WebRTC required). Any **bundled APK** uses LiveKit automatically.

### 1. LiveKit Cloud (free Build tier)

1. Sign up at [cloud.livekit.io](https://cloud.livekit.io) (no credit card on Build plan)
2. Create a project → copy `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
3. Add them to root `.env` on your **deployed API host** (and local `.env` for agent deploy)

Limits: ~5,000 WebRTC min/mo, ~1,000 agent session min/mo. Sarvam is billed separately via your API key.

### 2. Deploy the Python agent

```bash
# One-time
lk cloud auth
cd services/voice-livekit
lk agent create

# After code changes
bash scripts/deploy-voice-livekit.sh
```

Secrets are read from **root `.env`** only.

### 3. Build Android release APK (local)

Set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env`, then:

```bash
source scripts/android-env.sh
npm run android:standalone-apk
```

Output: `dist/acharya-<version>.apk` — install on device (not Expo Go). Chat → Voice uses LiveKit.

### 4. Publish APK for judges

```bash
bash scripts/publish-github-release.sh v1.0.2 dist/acharya-1.0.2.apk
```

README links to `https://github.com/ANAMASGARD/Acharya-App/releases/latest`.

### Optional: EAS cloud build

```bash
eas build --profile standalone --platform android
```

---

## Folder layout

```txt
voice-backend.sh                      ← Terminal 1 (voice AI, Expo Go)
expo-local.sh                           ← Terminal 2 (Expo Go)
scripts/android-env.sh                  ← source before standalone APK build
scripts/android-standalone-apk.sh       ← release APK pipeline
scripts/publish-github-release.sh       ← upload APK to GitHub Releases
.env                                    ← all secrets (one file)
services/voice-local/                   ← WebSocket server (Expo Go)
services/voice-livekit/                 ← LiveKit agent (standalone APK)
lib/voice/                              ← app voice client code
docs/VOICE.md                           ← this file
```
