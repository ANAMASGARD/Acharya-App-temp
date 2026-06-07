# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§4 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, notes verification) |
| **Phase** | **Phase 7b — Notes Verification UI v1** ✅ ready to commit (backend RAG pending) |
| **Previous phases** | Phase 7 Chat Acharya (`4e652bc`), Phase 6b analyze + calendar (`d692ea9`) |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — recorder, calendar, chat, notes upload UI verified |
| **Default tab on launch** | **Recorder** (`/(tabs)/recorder`) |

### What works today

**Notes Verification UI v1 (`/notes/upload`) ✅**

- Neo-Brutal screen from `prompt_material/09-notes-verify.png`: upload zone, gaps timeline, curriculum sheet
- **PDF/DOC pick** via `expo-document-picker` + client MIME/extension validation
- **Upload Notes** / disabled **Verify Notes** (backend pending) with teacher-facing copy
- **Curriculum bottom sheet** — blur backdrop (same pattern as chat drawer), class accordion, subjects, upload book row
- **Teaching classes** in Profile — multi-select persisted; sheet filters to those classes only
- **Selection banner** with clear (×); animated horizontal red menu dots on header
- Demo gap cards until `POST /api/notes/verify` + Aura GraphRAG lands

**Chat Acharya (`/(tabs)/chat` — Phase 7) ✅** — unchanged; Upload pill → `/notes/upload`

**Recorder, Calendar, Auth, Profile** — unchanged from Phase 7 memory

**Not built yet**

- `POST /api/notes/verify` — chunk, embed, vector search, Gemini gaps → `VerificationReport` on Aura
- Enable **Verify Notes** when file + class + subject + API healthy
- Home `NotesGapsCard` CTA → `/notes/upload`
- Chat **Voice** pill → Sarvam conversational agent
- Live Home data from Aura

**Validation (last run — 2026-06-06):** `npm run lint` + `npx tsc --noEmit` — pass

---

## 2. Project Phase Map

```
Phase 0–6b   … prior phases (see §6 Commit Log)
Phase 7      Chat Acharya       ✅ 4e652bc
Phase 7b     Notes verify UI    ✅ UI v1 (this commit) — backend RAG ⬜ next
Phase 7c     Notes RAG API      ⬜ planned — Aura Chunk + VerificationReport
```

---

## 3. Architecture Snapshot

### Notes verification UI (Phase 7b — client only)

```
Chat header Upload pill
  → app/notes/upload.tsx (thin route)
  → components/verification/notes-upload-screen.tsx
       ├── hooks/use-notes-upload.ts → expo-document-picker
       ├── hooks/use-curriculum-selection.ts → sheet + subject selection state
       ├── store/preferences-store.ts → teachingClassIds (filter sheet)
       ├── components/verification/upload-drop-zone.tsx
       ├── components/verification/verification-gaps-timeline.tsx (demo data)
       └── components/verification/curriculum-select-sheet.tsx (blur + slide)

Profile → app/profile/teaching-classes.tsx
  → components/profile/teaching-classes-screen.tsx → setTeachingClassIds
```

### Future backend (not implemented)

```
POST /api/notes/verify (multipart: file, classId, subjectId, clerkId)
  → extract → chunk → embed → MERGE Chunk
  → (Teacher)-[:UPLOADED]->(noteChunk)
  → vector index chunk_embedding + IN_CHAPTER traverse
  → Gemini structured gaps → VerificationReport
  → (Teacher)-[:REQUESTED]->(VerificationReport)-[:CHECKED_AGAINST]->(Chunk)
```

See [`neo4j/graph-model.md`](../neo4j/graph-model.md).

### Routes (Expo Router) — notes + profile additions

| Route | File | Role |
|-------|------|------|
| `/notes/upload` | `app/notes/upload.tsx` | Compose `NotesUploadScreen` |
| `/profile/teaching-classes` | `app/profile/teaching-classes.tsx` | Multi-select teaching grades |

---

## 4. File map — Notes Verification (Phase 7b)

### Routes (`app/`)

| File | Code |
|------|------|
| `app/notes/upload.tsx` | Default export → `<NotesUploadScreen />` only |
| `app/profile/teaching-classes.tsx` | Default export → `<TeachingClassesScreen />` |

### Components (`components/verification/`)

| File | Responsibility |
|------|----------------|
| `notes-upload-screen.tsx` | SafeArea, header (back + title + red ⋯), selection banner w/ clear, ScrollView, wires hooks + sheet |
| `upload-drop-zone.tsx` | Dashed tappable zone, file preview (name + size), Upload Notes / disabled Verify Notes, error banner |
| `verification-gaps-timeline.tsx` | Section title + dashed rail + maps `VerificationGap[]` |
| `verification-gap-card.tsx` | Coral / coralLight / neutral Neo-Brutal cards + `mascotChecklist` |
| `curriculum-select-sheet.tsx` | Modal: Reanimated blur backdrop + spring slide-up sheet; class accordion; upload book; empty state → settings |
| `animated-menu-dots.tsx` | Horizontal pulsing dots (Reanimated) in red header button |

### Components (`components/profile/`)

| File | Responsibility |
|------|----------------|
| `teaching-classes-screen.tsx` | Checkbox list Class 6–12, summary card, Save → `setTeachingClassIds` |
| `profile-screen.tsx` | **Modified:** App settings row **Select classes** → `/profile/teaching-classes` + subtitle |

### Hooks

| File | Responsibility |
|------|----------------|
| `hooks/use-notes-upload.ts` | `DocumentPicker.getDocumentAsync`, validate, `selectedFile` / `error` / `canVerify: false` |
| `hooks/use-curriculum-selection.ts` | Sheet visibility, expanded class, `selection`, `uploadedBookName`, clear selection |

### Lib / types / data

| File | Responsibility |
|------|----------------|
| `lib/notes-file-validation.ts` | `ACCEPTED_NOTE_*`, `isAcceptedNotesFile`, `formatFileSize`, `normalizePickerAsset` |
| `lib/teaching-classes.ts` | `getTeachingClassesForCurriculum`, `formatTeachingClassesSummary` |
| `types/notes-verification.ts` | `VerificationGap`, `NotesUploadFile`, `NotesUploadError` |
| `types/curriculum.ts` | `CurriculumClass`, `CurriculumSelection`, subject status |
| `data/curriculum-catalog.ts` | Class 7–12 → subject lists (from recorder options) |
| `data/notes-verification-demo.ts` | `DEMO_VERIFICATION_GAPS` for timeline placeholder |

### Store

| File | Change |
|------|--------|
| `store/preferences-store.ts` | `teachingClassIds: string[]`, `setTeachingClassIds`, `toggleTeachingClass` — persisted |

### Dependencies

| Package | Use |
|---------|-----|
| `expo-document-picker` ~14.0.8 | Notes file pick + curriculum book pick |

### Chat entry (unchanged)

| File | Link |
|------|------|
| `components/chat/chat-header.tsx` | Red **Upload** pill → `router.push("/notes/upload")` |

---

## 5. Current State

> **Status:** Phase 7b Notes Verification **UI v1** complete on `dev`. Next: `POST /api/notes/verify` + Aura GraphRAG.

### Phase 7b decisions

| Topic | Implementation |
|-------|----------------|
| Teacher copy | **Upload Notes** / **Verify Notes** — not "RAG upload" |
| Verify CTA | Disabled until API; helper: *Verification coming soon — your file is ready.* |
| File validation | Picker MIME filter + extension/MIME re-check client-side |
| Teaching classes | Profile multi-select → filters curriculum sheet only |
| Curriculum sheet | Same blur animation as chat history drawer (`AnimatedBlurView`, spring sheet) |
| Menu button | Red square, **horizontal** animated dots |
| Selection UX | Mint banner + × to clear class/subject |
| Backend | **None yet** — demo gaps, local file + selection state only |

---

## 6. Commit Log (oldest → newest)

### `4e652bc` — feat: Chat Acharya with Aura graph, voice input, and Neo-Brutal coach UI

### *(pending)* — feat: Notes verification upload UI with curriculum sheet and teaching class settings

- Neo-Brutal `/notes/upload` from design ref `09-notes-verify.png`
- `expo-document-picker`, validation lib, upload drop zone, demo gaps timeline
- Curriculum bottom sheet (blur + slide), class/subject accordion, upload book row
- Profile **Select classes** (multi-select persisted) filters curriculum popup
- Animated horizontal menu dots; selection banner with clear

---

## 7. Next Work (recommended order)

1. **`POST /api/notes/verify`** — multipart upload, Clerk auth, chunk + embed + Aura writes
2. **`lib/graph/notes.ts`** — MERGE `Chunk`, `VerificationReport`, relationships
3. **Enable Verify Notes** — when file + curriculum selection + API ready
4. **Replace demo gaps** — live `VerificationGap[]` from Gemini response
5. **Wire Home `NotesGapsCard`** → `/notes/upload`
6. **Chat voice agent** — Voice pill → Sarvam conversational agent

---

## 8. Agent Maintenance Instructions

When you finish a meaningful commit:

1. Move **§5 Current State** detail into **§6 Commit Log** with hash + subject.
2. Reset **§5** for new in-progress work.
3. Update **§1**, **§2**, **§3**, **§4** if routes or file map changed.

---

## 9. Design References

| File | Screen |
|------|--------|
| `prompt_material/09-notes-verify.png` | Notes upload + gaps timeline — **UI v1 implemented** |
| `prompt_material/06-teaching-calendar.png` | Calendar — implemented |
| `prompt_material/05-core-recorder.png` | Recorder — implemented |
| `prompt_material/04-home-dashboard.png` | Home — implemented |

---

## 10. Dev workflow

### Commands

```bash
npm run lint && npx tsc --noEmit
npm run start:go -- --clear
```

### Notes verification test checklist

1. **Profile → Select classes** → pick Class 9, 10, 12 → Save
2. **Chat → Upload** → Verify Lesson Notes screen
3. Tap dashed zone or **Upload Notes** → pick PDF → name + size shown
4. Tap red **⋯** → blur backdrop + sheet; only saved classes listed
5. Expand class → tap subject → sheet closes; mint banner with × clear
6. **Upload book** row in sheet → document picker
7. **Verify Notes** stays disabled with helper text

### Chat test checklist

Unchanged — see Phase 7 memory (composer, mic STT, history drawer blur).

---

*Last updated: 2026-06-06 — Phase 7b Notes Verification UI v1 (pre-commit).*
