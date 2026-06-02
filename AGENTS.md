# AGENTS.md — Acharya Expo App

## Purpose

This file is the single source of truth for building **Acharya**, a React Native mobile app built with Expo for teachers. The app helps teachers record live classroom teaching, transcribe long sessions using Sarvam AI, analyze the transcript with an LLM, and receive actionable teaching feedback.

This is a new mobile app project built from scratch. Write code for the current Expo app only. Keep implementations clean, teachable, and production-minded.

---

## Agent Role & Mindset

You are an expert **React Native + Expo** engineer helping build a production-quality teaching app.

- Write clean, simple, maintainable code.
- Prioritize clarity over unnecessary abstraction.
- Think like a senior mobile developer, but implement like a practical learning project—easy to read and explain feature by feature.
- This should feel like a **real app**, but remain approachable for developers learning how it is built.

---

## Product Vision

Acharya is an AI-powered teaching assistant for real teachers, especially those teaching in practical, high-friction environments where speed, clarity, and reliability matter.

The product should optimize for these realities:

- A teacher may want to start recording in seconds.
- A class may run for 1–2 hours.
- The phone screen may be locked during class.
- Recording must continue reliably while the teacher is teaching.
- After the class ends, the recording should be processed into transcript + teaching report with minimal steps.
- The UI should feel bold, simple, energetic, and easy to use under pressure.

This app is **not offline-first**. Recording and report generation depend on network-assisted processing (chunk upload, Sarvam STT, backend analysis)—not on offline queues.

Every product decision should ask:

> Would this make class recording, transcript generation, and report review easier for a teacher using a real phone during a real school day?

If not, simplify it.

---

## Do NOT Use

- **VAPI AI** — use Sarvam AI for all voice features
- **Stream / GetStream** — not used
- **Stream Vision Agents** — not used
- **ElevenLabs** — use Sarvam for STT, TTS, and voice agent flows

---

## Core Features

These are the main product features for Acharya.

### 1. Active Listening Recorder

The recorder is the heart of the app.

It must support:

- Long classroom recordings (target: 1–2 hours)
- Chunked audio capture during recording
- Reliable stop/start lifecycle handling
- Processing flow after recording ends:
  - Recording
  - Uploading chunks
  - Speech-to-text
  - Transcript merge
  - LLM analysis
  - Report ready

The teacher should be able to start recording, teach normally, stop recording later, and receive a useful class report.

### 2. Recorder Widget / Quick Access Entry

The app should support a fast-access entry point for recording so the teacher does not need to navigate through the full app every time.

This should be built in phases:

- **Phase 1:** app shortcut / deep link / quick action into the recorder (e.g. `acharyaapp://` scheme from `app.json`)
- **Phase 2:** true home screen widget with native support (`@bacons/apple-targets` / Android widget modules + EAS dev builds—not Expo Go alone)

The widget or quick-access surface is only a control surface. Heavy processing must remain in the app/backend.

### 3. Transcript-to-Report Pipeline

Once recording ends:

- chunks are uploaded to the backend
- Sarvam AI performs speech-to-text
- chunk transcripts are merged into a final transcript
- Gemini analyzes the class transcript
- a structured teaching report is generated and saved

### 4. Teaching Calendar

Teachers should be able to browse recorded teaching sessions by day and open the detailed report for any session.

Calendar experience should include:

- date-based history view
- visual indicators for recorded days
- session cards with topic, subject, class level, duration, and score
- detailed report modal or screen

### 5. Chat Acharya

An in-app AI teaching coach where teachers can ask teaching questions and receive helpful responses in text or voice.

Use Sarvam AI for voice capabilities and backend-secured LLM flows for analysis and response generation. Primary voice UX is in-app (not a legacy `tel:` phone link).

### 6. Notes Verification (RAG)

Teachers can upload notes and verify them against curriculum-aligned reference material.

The notes verification flow should support:

- selecting class and subject
- uploading notes
- chunking and embedding content
- retrieving relevant curriculum context
- generating a verification report with gaps, corrections, and suggestions

### 7. Profile and Preferences

The app should let teachers manage:

- account settings
- language preference
- notifications
- app preferences relevant to recording and report review

---

## Secondary Features

These are important, but secondary to the recorder pipeline.

### Teaching Dashboard

A dashboard can show:

- weekly teaching scores
- session counts
- strengths and weaknesses
- recent reports

### Lesson Plan Generator

Teachers enter topic, class, and subject. The app generates a practical lesson plan aligned to curriculum context.

### Regional Language Support

The app should support Indian language experiences where useful:

- transcription language selection
- translated report summaries
- voice interactions in supported languages
- multilingual teacher experience where product value is clear

### Student Engagement Tracking

After each class, teachers can log a small amount of structured reflection such as engagement level, topic completion, or disruptions.

### Sharing

Teachers should be able to share useful outputs such as text summaries or feedback cards.

---

## Tech Stack

Use this stack unless the user explicitly approves a change.

- **Expo SDK 54** with **Expo Router**
- React Native + React 19
- TypeScript (strict)
- Zustand
- AsyncStorage
- Clerk (`@clerk/clerk-expo`) for authentication
- **Sarvam AI** for speech-to-text, text-to-speech, translation, and conversational voice
- **Google Gemini** for transcript analysis and structured teaching reports
- **Neon Postgres + Drizzle ORM** — core backend persistence (sessions, transcripts, reports, RAG)
- **`expo-audio`** for recording (with background recording config when implementing the recorder—not deprecated `expo-av`)

Important rules:

- Do not assume any library is already installed.
- Before writing code that depends on a package, check `package.json` first.
- If the package is missing, ask before adding it.
- **NativeWind v5** + Tailwind CSS v4 — target styling stack; confirm install and versions in `package.json` before writing `className` code (see Styling Rules).
- Do not introduce new major libraries unless there is a strong reason.

---

## Development Philosophy

Build feature by feature.

For every task:

1. Understand the request fully.
2. Read this file before coding.
3. Keep implementation simple.
4. Avoid unnecessary abstraction.
5. Prefer readable code over clever code.
6. Build the smallest useful version first.
7. Refactor only when repetition or complexity appears.
8. Keep the app easy to teach and explain.

This is a learning-friendly project, but the code should still feel production-quality.

---

## Decision Making & Clarifications

If something is unclear or could be improved:

- Proactively suggest better approaches.
- If a new library would significantly simplify or improve the implementation:
  - Recommend the library.
  - Clearly explain why it is useful.
  - **Ask the user for permission before adding or installing it.**

Example:

> "This could be implemented manually, but `react-native-reanimated` would make animations smoother. Do you want me to add it?"

**Do not install or use new libraries without user approval.**

---

## Architecture Guidelines

Use this structure unless there is a strong reason to change it:

```txt
app/
  (auth)/
  (tabs)/
  lesson/
  notes/
  widget/
  api/
components/
  ui/
  recording/
  chat/
  calendar/
  verification/
  navigation/
constants/
data/
hooks/
lib/
store/
types/
assets/
docs/
drizzle/          ← schema + migrations (when DB layer is added)
```

### `app/` — Routes and Screens Only

- Use `app/` for screens, layouts, and API routes only.
- Screens should **compose** components and call hooks/stores.
- Do **not** put large reusable UI blocks or complex business logic directly in route files.
- Route and screen files stay **lowercase**.
- Do not co-locate components, types, or utilities inside `app/` (Expo Router anti-pattern).

### `components/` — Reusable UI

Create a component only when:

- it is reused in multiple places,
- it makes a screen easier to read, or
- it represents a clear UI concept (e.g. `NeoCard`, `RecordingButton`, `SessionCard`).

Do not create tiny one-off components too early.

When unsure, ask:

> Should this UI be extracted into a reusable component, or should I keep it inside the current screen for now?

### `data/` — Typed Static Content

Use for hardcoded structured content (not database-backed):

```txt
data/
  languages.ts
  ncert-subjects.ts
```

Keep all entries typed. Do not add a database only to store static curriculum or language lists.

### `store/` — Zustand

Use Zustand for global client state, for example:

- user and language preferences
- recorder session state
- recent session metadata
- chat history cache
- calendar session cache
- teaching streak or dashboard summaries

Persist with AsyncStorage only where persistence adds real value.

### `lib/` — Service Helpers

Use for external service wrappers (no secrets in client code):

```txt
lib/
  clerk.ts
  sarvam.ts
  api.ts
  gemini.ts
  neon.ts       ← server-side DB client helpers (API routes only)
  cn.ts
```

Never expose API keys in the mobile app.

---

## Recorder Architecture

This is one of the most important parts of the project.

### Goal

Support long classroom recordings and convert them into a final AI teaching report.

### Required Flow

1. Teacher starts recording from app or quick-access entry.
2. App records audio continuously.
3. Audio is cut into chunks during capture.
4. Teacher stops recording after class.
5. App uploads chunk files plus session metadata.
6. Backend sends audio chunks to Sarvam AI speech-to-text.
7. Backend merges chunk transcripts in correct order.
8. Backend sends merged transcript to Gemini.
9. Gemini returns structured teaching analysis.
10. Backend stores transcript + report.
11. App shows report UI.

### Recorder Rules

- Do not wait for a single giant 1–2 hour file before starting processing work.
- Chunk recordings during capture.
- Preserve chunk order reliably.
- Track recording state centrally in a store.
- Show processing status clearly in the UI.
- Handle interruptions, partial failures, and user confusion gracefully.
- For **1–2 hour** sessions: run STT **per chunk** (or per batch job under Sarvam limits), then merge transcripts server-side—do not assume one STT call covers the full class.

### Recording Implementation (when building)

- Prefer **`expo-audio`** with `enableBackgroundRecording` in `app.json` and `setAudioModeAsync` at runtime.
- Background recording on Android uses a foreground service notification; plan permissions and UX accordingly.
- True OS home-screen widgets require custom native builds, not Expo Go alone.

### Recorder State Model

At minimum, the recorder domain should model:

- idle
- recording
- stopping
- uploading
- transcribing
- analyzing
- completed
- failed

### Widget / Quick Entry Rules

- A quick-access surface can start the recording flow.
- It must not contain heavy business logic.
- It should sync state with the main app recorder store.
- If true native widgets are added later, treat them as a native extension milestone, not a default Expo Go assumption.

---

## AI Integration Rules

### Sarvam AI

Use Sarvam AI for:

- Speech-to-text
- Text-to-speech
- Translation
- Conversational voice agent features

All Sarvam calls must go through secure backend routes.

Never expose secrets in the client.

**Backend implementation notes:**

- Verify current auth headers, model names, and endpoint contracts from [official Sarvam docs](https://docs.sarvam.ai) before implementation.
- Do not hardcode outdated API assumptions in the app or in this file.
- Long audio: chunk STT + ordered merge on the server (see Recorder Architecture).
- Voice agents in production often use Sarvam via server SDK or LiveKit/Pipecat on the backend—not raw keys in the mobile app.

### Gemini

Use Gemini for:

- transcript analysis
- teaching quality report generation
- notes verification analysis
- lesson plan generation
- summarization where needed

Gemini calls must also go through secure backend routes.

---

## API Rules

All secrets and external AI calls must live behind backend/server routes.

### API Responsibilities

Backend routes may handle:

- Sarvam STT requests
- Sarvam TTS requests
- Sarvam translation requests
- transcript merge logic
- Gemini analysis
- report persistence
- token generation if needed

Expo Router API routes use the `+api.ts` suffix (e.g. `app/api/sarvam/stt+api.ts`).

### Security Rules

- Never expose Sarvam keys in the client app.
- Never expose Gemini keys in the client app.
- Never expose database credentials in the client app.
- Validate authenticated users where required (Clerk session on API routes).

### Important Hosting Rule

If API routes are used, deployment must support server logic (**EAS Hosting** or a separate Node backend). Do not assume static-only web export (`output: "static"` in `app.json`) can run `app/api/**` routes.

**Expo Router API routes require server output and deployed server infrastructure in production**—not static-only export. See [Expo API routes](https://docs.expo.dev/router/web/api-routes/).

---

## Styling Rules

### Design Language

The app uses **Neo-Brutalism** as its primary visual language.

That means the UI should generally use:

- thick borders
- hard offset shadows
- bold color blocks
- playful but structured layouts
- strong contrast
- large touch-friendly controls
- confident typography

### Visual Tone

The app should feel:

- bold
- playful
- clear
- mobile-first
- teacher-friendly
- energetic, not corporate

### Colors

Use the Acharya Neo-Brutal palette as the base design direction.

Core palette includes:

- yellow `#FFDB33`
- mint `#B8E5E1`
- sky `#A8D5E5`
- coral `#FFB5A7`
- lime `#C5E99B`
- lavender `#E0D4F7`
- black `#1A1A1A`
- white `#FFFFFF`
- cream / warm neutral background `#FFF8E7`

Define tokens in `constants/colors.ts` when styling work begins.

### UI Quality Bar

The app should feel:

- playful
- polished
- friendly
- bold and clear (Neo-Brutal, not corporate)
- mobile-first
- visually close to provided design references when supplied

Use:

- strong CTA buttons with obvious press states
- thick bordered cards and **hard offset shadows** (Neo-Brutal—not soft iOS-style shadows unless a design explicitly asks)
- clean spacing and clear section hierarchy
- progress indicators for recording and processing pipelines
- friendly empty states
- large touch targets (minimum 44×44px)
- simple animations when useful (`Animated` API or Reanimated—ask before adding Reanimated)

---

## UI Implementation Rules (When a Design Is Provided)

For any UI task where the user supplies a design image or mockup:

- The goal is to **replicate the provided design exactly**.
- Match the UI **as closely as practical** on mobile.

You MUST:

- match layout, spacing, and padding
- match font sizes and hierarchy
- match colors precisely (use Acharya palette unless the design specifies otherwise)
- match border radius and shadows (Neo-Brutal: thick borders, hard shadows)
- match alignment and positioning
- match proportions of elements
- replicate all visible UI elements

Do not approximate. Do not simplify unless the user explicitly asks.

When building from a design:

- make layouts responsive across common phone widths (375px–430px)
- prefer reusable patterns in `constants/colors.ts` or shared UI components

---

## NativeWind and Styling Implementation Rules

**Target stack: NativeWind v5** with Tailwind CSS v4. Use NativeWind utility classes for general layout and spacing once installed and configured.

If NativeWind v5 is not yet in `package.json` or not configured (Metro, PostCSS, `global.css`):

- do not assume it exists
- ask before adding or upgrading
- default to clean React Native `StyleSheet` implementations (especially for Neo-Brutal shadows and press states)

**Avoid large inline styles unless required.**

When NativeWind is active, prefer reusable utilities in `global.css` where appropriate. If a utility is missing and reused often, add it to `global.css` following consistent naming (BEM-style is acceptable).

### NativeWind Rule

Before writing any NativeWind-related code:

1. Check `package.json` — this project targets **NativeWind v5**; confirm it is installed and which exact version is present.
2. Follow syntax and patterns supported by **that installed version only** (v5, not v4 or other examples).
3. Do not upgrade or change NativeWind major versions unless the user explicitly approves.

**Reference docs only:** [NativeWind v5](https://www.nativewind.dev/v5/llms-full.txt) — always verify the installed version in `package.json` first.

Do not write styling code based on guessed setup.

### Style Exception Rules

Use `StyleSheet` or inline styles for these React Native scenarios instead of NativeWind classes:

| Component / Scenario | Why | Use Instead |
|---|---|---|
| `SafeAreaView` | `className` often not supported reliably | Inline styles or `StyleSheet` |
| `Button` | Limited styling via `title` / `onPress` only | `Pressable` / `TouchableOpacity` + custom styles |
| `KeyboardAvoidingView` | Behavior props not in className | Inline styles or `StyleSheet` |
| `Modal` | `visible`, `transparent` props | Inline styles |
| `ScrollView` | `contentContainerStyle`, `indicatorStyle` | `StyleSheet` |
| `TextInput` | Input-specific native props | Inline styles |
| `Animated.View` | Animated style values | `StyleSheet` with animated values |
| Dynamic styles | Calculated at runtime | `StyleSheet.create()` or inline |
| Platform-specific | iOS/Android-only props | Conditional inline styles |
| `Pressable` / `TouchableOpacity` | Pressed-state styles | `StyleSheet` |
| Shadows (iOS/Android) | Platform-specific shadow syntax; Neo-Brutal hard shadows | `StyleSheet` with platform checks |
| Transform arrays | Complex transforms | `StyleSheet` |
| Z-index | Sometimes needs explicit values | `StyleSheet` |

### When to Use StyleSheet

Use `StyleSheet` or inline styles when:

- the prop is React Native-specific (not web-equivalent)
- the value is dynamic or calculated at runtime
- platform-specific behavior is needed
- NativeWind does not map the property correctly
- Neo-Brutal press states or hard shadows are required

### SafeAreaView Example

```tsx
// ✅ CORRECT
import { SafeAreaView } from "react-native-safe-area-context";

function MyScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF8E7" }}>
      {/* content */}
    </SafeAreaView>
  );
}

// ❌ INCORRECT — do not rely on className on SafeAreaView
function MyScreen() {
  return <SafeAreaView className="flex-1 bg-cream">{/* */}</SafeAreaView>;
}
```

For components in the exception table above, follow the same pattern. Otherwise, when NativeWind is installed, prefer utility classes.

---

## Component Rules

Only create a reusable component when at least one of these is true:

- it is reused in multiple places
- it makes a screen easier to read
- it represents a clear UI concept

Examples:

- `NeoButton`
- `NeoCard`
- `RecordingButton`
- `SessionCard`
- `VerificationReport`

Do not extract tiny one-off components too early.

### Component Creation Rule

Only create reusable components when necessary. **Ask if unsure** whether to extract or keep UI in the screen file.

---

## Code Simplicity Rules

- Avoid overengineering.
- Refactor only when repetition or real complexity appears.
- Prefer the smallest change that solves the problem.

---

## Image Rules

Use centralized image imports.

Before using any image asset:

1. Check if `constants/images.ts` exists.
2. If it does not exist, create it.
3. Import and export all app images from that file.
4. Use images through the centralized object.

Example:

```ts
import acharyaLogo from "@/assets/images/acharya-logo.png";
import mascotHappy from "@/assets/images/mascot-happy.png";

export const images = {
  acharyaLogo,
  mascotHappy,
};
```

Do not import assets ad hoc across unrelated screens unless there is a strong reason.

```tsx
import { Image } from "expo-image";
import { images } from "@/constants/images";

<Image source={images.acharyaLogo} />
```

---

## Image Generation Rules

If the user enables image generation for UI assets:

- Generate images that are **visually identical or extremely close** to the provided UI reference.
- Do not change style, colors, or composition without permission.
- Keep consistency with the Neo-Brutal Acharya design system.

After generating images:

- Place them under `assets/images/` with clear names, e.g. `onboarding-1.png`, `mascot-happy.png`.
- Register them in `constants/images.ts`.
- Use them through the centralized `images` object.

---

## State Management Rules

Use Zustand for global client state.

Use local component state for temporary UI state only.

Persist with AsyncStorage where persistence is actually useful.

Good candidates for global persisted state:

- user preferences
- language preference
- recent session metadata
- recorder state that needs to survive navigation changes
- widget/quick-entry sync with recorder store (idle / recording / processing)

Do not persist everything by default.

---

## TypeScript Rules

Use TypeScript strictly.

- Avoid `any`
- Prefer simple readable types
- Use `type` over `interface` unless extending
- Add explicit return types on exported functions where practical
- Keep types organized by domain in `types/`

Example:

```ts
type Props = Readonly<{
  children: React.ReactNode;
}>;

export function ScreenContainer({ children }: Props): React.ReactElement {
  return <>{children}</>;
}
```

---

## Data Rules

Use `data/` for hardcoded structured content when appropriate.

Examples:

- supported languages
- curriculum mappings
- local demo data

Keep data typed.

Do not introduce a database just to hold static content.

---

## Auth Rules

Use Clerk for authentication.

- Do not build custom auth.
- Use `@clerk/clerk-expo` only.
- Protect screens where needed.
- Send session tokens to API routes via `Authorization: Bearer <token>` when required.
- Handle Clerk loading state (`useAuth()` may be unset on first render).

---

## Database Rules

This project uses **Neon Postgres + Drizzle ORM** for backend persistence. A database is a **core architectural requirement** for Acharya—not an optional add-on. Transcripts, reports, RAG results, and session history are persistent product data, not temporary client-only state.

### What the database stores

Use the database for core product data such as:

- session metadata
- uploaded audio / session references
- transcripts
- generated teaching reports
- notes verification results
- curriculum books, chunks, and embeddings
- user-linked history and analytics (e.g. calendar, dashboard)

Use **pgvector** for RAG-related embeddings when implementing notes verification or curriculum retrieval.

Enable in Neon:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### What stays off the database

- Static lists and mappings that rarely change → `data/` (typed TS), e.g. languages, NCERT subject lists
- UI-only ephemeral state → component state or Zustand without DB
- Secrets → never in the DB client connection from the mobile app

### Access rules

- Do not store database credentials in the mobile client.
- All database access must happen through **API routes** or other **server-side** code (`@neondatabase/serverless` in route handlers).
- The Expo app reads/writes product data via authenticated API calls, not direct Postgres from the device.

### Backend architecture

```txt
Expo app (UI + recorder client)
    → API routes or separate Node backend (Sarvam, Gemini, auth)
        → Neon Postgres + Drizzle (persistence)
```

Expo Router API routes require **server output** and **deployed server infrastructure** in production—see `Important Hosting Rule` under API Rules.

---

## Current Project State Rule

Always inspect the current repo before assuming anything exists.

- Treat features in this file as **product targets** unless the codebase already implements them.
- Do not assume folders, dependencies, or screens exist until you verify them.

Before implementing a feature:

- inspect `package.json`
- inspect existing folders
- inspect app routes
- follow existing conventions if they are already good

Build from what exists in the repo right now—not from an imagined full structure.

---

## Commands

```bash
npx expo start              # Dev server (try Expo Go first)
npx expo start --clear      # Clear cache
npm run lint                # ESLint (expo lint)
npx tsc --noEmit            # Typecheck when tsconfig is configured
```

Custom native builds (`eas build` / `npx expo run:android`) are required for home-screen widgets, extended background recording polish, and some native modules—not for basic UI and navigation in Expo Go.

---

## Communication Rules

Be concise and practical.

When completing a task:

1. Explain what changed.
2. List files changed.
3. Explain how to test it.
4. Mention any setup or install step required.

Do not write long unnecessary explanations unless the user asks for them.

---

## Feature Implementation Rules

When the user asks to build a feature:

1. Read this file first.
2. Identify files to create or change.
3. Keep changes focused—do not rewrite unrelated code.
4. Follow existing patterns if they are good.
5. Ensure the feature works end-to-end for the requested scope.
6. Handle loading, empty, and error states.
7. Fix lint and type errors before finishing.

---

## Linting and Validation

Run before marking work complete:

```bash
npm run lint
npx tsc --noEmit    # when TypeScript is configured
```

Add `"typecheck": "tsc --noEmit"` to `package.json` when the team wants a single script. Fix all reported errors.

---

## Feature Implementation Checklist

Before implementing any feature:

- [ ] Read this file first.
- [ ] Understand the feature fully.
- [ ] Check the current repository state.
- [ ] Check installed dependencies in `package.json`.
- [ ] Identify the smallest set of files to change.
- [ ] Keep changes focused.
- [ ] Follow existing patterns if they are good.
- [ ] Keep code teachable and readable.
- [ ] Keep secrets out of the client.
- [ ] Respect the recorder architecture if touching recording flows.
- [ ] Keep quick-access recording controls lightweight.
- [ ] Handle loading, empty, and error states.
- [ ] Run `npm run lint` and `npx tsc --noEmit` if configured.
- [ ] Fix errors before finishing.

---

## Practical Constraints

Important product constraints:

- Long classroom recordings are a first-class use case.
- Recording flow is more important than flashy UI.
- Quick start matters.
- Post-recording report clarity matters.
- The user experience should reduce friction for teachers.

Avoid building features that make the core recorder flow harder to use.

---

## Final Reminder

Before every feature implementation:

- Read this file.
- Follow it strictly.
- Build clean, simple, teachable code.
- Replicate UI exactly when designs are provided.
- Respect Acharya-specific rules (Sarvam, Neo-Brutal, recorder architecture)—not generic language-learning app patterns.

Build Acharya like a practical teacher tool, not a demo toy.

Prioritize:

- fast recording access
- reliable long-session handling
- secure AI processing
- understandable reports
- bold, clear mobile UI

When making tradeoffs, choose the approach that makes the app easier for a teacher to use and easier for a developer to understand.

---

## Rules Included From the Expo Teaching Template

This file adapts the Duolingo-style Expo teaching template for **Acharya**. Included (adapted):

| Template rule | In this file? | Acharya adaptation |
|---|---|---|
| Expert RN + Expo engineer mindset | Yes | `Agent Role & Mindset` |
| Feature-by-feature development | Yes | `Development Philosophy` |
| Ask before new libraries | Yes | `Decision Making & Clarifications` |
| Architecture folders (`app`, `components`, `data`, `store`, `lib`, …) | Yes | `Architecture Guidelines` + folder sections |
| Screens compose only; no fat routes | Yes | `app/` section |
| Component extraction rules + “ask if unsure” | Yes | `components/` + `Component Rules` |
| Pixel-perfect UI when design provided | Yes | `UI Implementation Rules` |
| Image generation + `assets/` naming | Yes | `Image Generation Rules` |
| NativeWind version check + docs link | Yes | `NativeWind Rule` |
| Style exception table + SafeAreaView example | Yes | `Style Exception Rules` |
| Centralized `constants/images.ts` | Yes | `Image Rules` |
| Zustand + AsyncStorage | Yes | `store/` + `State Management Rules` |
| `lib/` helpers, no secrets in client | Yes | `lib/` section |
| TypeScript strict, avoid `any` | Yes | `TypeScript Rules` |
| Feature implementation steps | Yes | `Feature Implementation Rules` |
| Clerk auth, no custom auth | Yes | `Auth Rules` |
| Lint + typecheck | Yes | `Linting and Validation` |
| Concise communication + how to test | Yes | `Communication Rules` |
| Code simplicity / no overengineering | Yes | `Code Simplicity Rules` |
| Playful, polished, mobile-first UI bar | Yes | `UI Quality Bar` (Neo-Brutal styling) |
| Backend-only secrets for AI | Yes | `API Rules` + `AI Integration Rules` |

**Not included** (wrong for Acharya):

| Template rule | Why omitted |
|---|---|
| Duolingo / language-learning product overview | Replaced by `Product Vision` + teacher features |
| Stream / GetStream / Vision Agents | Listed in `Do NOT Use` |
| Lessons, XP, vocabulary, video teacher lessons | Not Acharya features |
| `lib/stream.ts` | Not used |
| “No database” constraint | Replaced: Neon + Drizzle is a **core requirement** (`Database Rules`) |
| Soft shadows / generic playful cards only | Neo-Brutal hard shadows and borders take priority |
