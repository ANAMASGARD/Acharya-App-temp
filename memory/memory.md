# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§5 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, question paper verify/generate) |
| **Phase** | **Phase 7c — Question Paper Graph RAG** ✅ in progress on `dev` |
| **Previous phases** | Phase 7b Notes UI (`a50a59b`), Phase 7 Chat (`4e652bc`), Phase 6b calendar (`d692ea9`) |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — recorder, calendar, chat, notes upload + generate UI |
| **Default tab on launch** | **Recorder** (`/(tabs)/recorder`) |

### What works today

**Question Paper Tool (Phase 7c) ✅**

- **`/notes/upload`** — verify question papers (PDF/DOC/image/camera) against NCERT books in Aura
- **`/notes/generate`** — generate unit test / half yearly / surprise quiz / model papers from embedded curriculum
- **Hybrid Graph RAG** — vector ANN → graph join → keyword boost → single OpenRouter LLM call (verify + generate)
- **11 demo NCERT books embedded** in Aura (~1,987 curriculum chunks, `openai/text-embedding-3-small`, dim 1536)
- **Curriculum sheet** — 2 subjects per class; green **Available** + tick from live Aura; yellow **Coming soon** placeholder
- **Book ingest pipeline** — `npm run books:embed-missing` (safe incremental), `npm run books:status`

**API routes (Clerk auth)**

| Route | Role |
|-------|------|
| `GET /api/curriculum/books` | Books + chapters for class/subject |
| `GET /api/curriculum/availability` | Class+subject pairs with embedded chunks |
| `POST /api/notes/verify` | Multipart verify → gaps + alignment |
| `POST /api/notes/generate` | JSON generate → structured paper |

**Chat, Recorder, Calendar, Auth, Profile** — unchanged from prior phases

**Not built yet**

- Home `NotesGapsCard` CTA → `/notes/upload`
- Chat **Voice** pill → Sarvam conversational agent
- Live Home dashboard from Aura
- More than 2 subjects per class in curriculum sheet (placeholder pattern ready)

**Validation (last run — 2026-06-07):** `npm run lint` + `npx tsc --noEmit` + `npm run verify:neo4j` + `npm run neo4j:test` + `npm run neo4j:test-api` — **pass**

**Aura schema:** `neo4j/schema.cypher` applied (19 statements — constraints, indexes, `chunk_embedding` vector index 1536 cosine)

---

## 2. Project Phase Map

```
Phase 0–6b   … prior phases (see §6 Commit Log)
Phase 7      Chat Acharya       ✅ 4e652bc
Phase 7b     Notes verify UI    ✅ a50a59b
Phase 7c     Question Paper RAG ✅ — verify + generate APIs, NCERT ingest, curriculum availability UI
```

---

## 3. Architecture Snapshot

### Question paper RAG (Phase 7c)

```
Chat Upload pill → /notes/upload
  → NotesUploadScreen
       ├── useQuestionPaperUpload (PDF/DOC/gallery/camera)
       ├── useCurriculumBooks → GET /api/curriculum/books
       ├── useQuestionPaperVerify → POST /api/notes/verify
       └── CurriculumSelectSheet (2 subjects/class, Aura availability)

/notes/generate → QuestionPaperGenerateScreen
  → useQuestionPaperGenerate → POST /api/notes/generate

Server:
  lib/rag/extract-text.ts → pdf-parse, mammoth, vision seed
  lib/rag/embeddings.ts → OpenRouter
  lib/rag/retrieve.ts → hybrid post-filter retrieval
  lib/rag/verify-evaluate.ts | generate-evaluate.ts
  lib/graph/curriculum.ts | notes.ts
```

### NCERT demo books (local + Aura)

```
books/demo-books.json          — one book per class (config)
books/class-N/<subject>/<slug>/ — PDFs on disk
npm run books:embed-missing    — manifest + ingest only missing
npm run books:status           — compare disk vs Aura
```

Demo embedded (11/11): class 2–5 English Marigold, class 6 Science Curiosity, class 7–12 English (one book each).

See [`neo4j/graph-model.md`](../neo4j/graph-model.md), [`books/README.md`](../books/README.md).

### Routes (Expo Router)

| Route | File | Role |
|-------|------|------|
| `/notes/upload` | `app/notes/upload.tsx` | Verify question paper |
| `/notes/generate` | `app/notes/generate.tsx` | Generate question paper |
| `/profile/teaching-classes` | `app/profile/teaching-classes.tsx` | Classes 2–12 multi-select |

---

## 4. File map — Question Paper (Phase 7c)

### API (`app/api/`)

| File | Role |
|------|------|
| `curriculum/books+api.ts` | List Aura books |
| `curriculum/availability+api.ts` | Embedded class+subject slots |
| `notes/verify+api.ts` | Multipart verify pipeline |
| `notes/generate+api.ts` | Paper generation |

### Lib / RAG

| File | Role |
|------|------|
| `lib/rag/chunk-text.ts` | Text chunking |
| `lib/rag/embeddings.ts` | OpenRouter embeddings |
| `lib/rag/extract-text.ts` | PDF/DOCX/image seed |
| `lib/rag/retrieve.ts` | Hybrid retrieval |
| `lib/rag/verify-evaluate.ts` | Structured verify LLM |
| `lib/rag/generate-evaluate.ts` | Structured generate LLM |
| `lib/graph/curriculum.ts` | Books, chapters, availability |
| `lib/graph/notes.ts` | Teacher chunks, VerificationReport |
| `lib/ai-config.ts` | Embedding, vision, RAG_DEBUG env |

### Scripts

| Script | npm command | Role |
|--------|-------------|------|
| `scripts/ingest-ncert-books.mjs` | `neo4j:ingest-books` | Batched embed + Aura write |
| `scripts/embed-missing-books.mjs` | `books:embed-missing` | Safe incremental ingest |
| `scripts/books-status.mjs` | `books:status` | Demo vs Aura report |
| `scripts/aura-introspect.mjs` | `neo4j:introspect` | Chunk/index introspection |
| `scripts/apply-neo4j-schema.mjs` | `neo4j:apply-schema` | Apply `schema.cypher` |

### Neo4j

| File | Role |
|------|------|
| `neo4j/schema.cypher` | Constraints, lookup indexes, `chunk_embedding` vector index (1536) |
| `neo4j/graph-model.md` | Labels, relationships, example Cypher |

---

## 5. Current State

> **Status:** Phase 7c Question Paper Graph RAG — verify + generate live; 11 demo books embedded; schema applied to Aura.

### Phase 7c decisions

| Topic | Implementation |
|-------|----------------|
| RAG style | Structured retrieve → single LLM → JSON (not agentic loops) |
| Embeddings | `openai/text-embedding-3-small` via OpenRouter; Aura vector index 1536 cosine |
| Demo books | One book per class in `books/demo-books.json`; class 6 = Science Curiosity |
| Curriculum UI | 2 subjects per class; availability from `GET /api/curriculum/availability` |
| Ingest | Skip existing books/chapters; batched embed + UNWIND writes |
| Images | Vision seed for retrieval; multimodal LLM for final verify |

### Env (server `.env`)

`OPENROUTER_EMBEDDING_MODEL`, `OPENROUTER_VISION_MODEL`, `INGEST_*` tuning — see `.env.example`.

---

## 6. Commit Log (oldest → newest)

### `a50a59b` — feat: Notes verification upload UI with curriculum sheet and class settings

- Neo-Brutal `/notes/upload`, curriculum sheet, teaching classes filter

### `4e652bc` — feat: Chat Acharya with Aura graph, voice input, and Neo-Brutal coach UI

---

## 7. Next Work (recommended order)

1. **End-to-end manual test** — verify + generate on device with Clerk auth + API server
2. **Home `NotesGapsCard`** → `/notes/upload`
3. **Add class 6 English + more subjects** when PDFs ready → `npm run books:embed-missing`
4. **Chat voice agent** — Voice pill → Sarvam conversational agent

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
| `prompt_material/09-notes-verify.png` | Notes upload + gaps — **implemented + live verify** |
| `prompt_material/06-teaching-calendar.png` | Calendar — implemented |
| `prompt_material/05-core-recorder.png` | Recorder — implemented |

---

## 10. Dev workflow

### Commands

```bash
npm run lint && npx tsc --noEmit
npm run verify:neo4j && npm run neo4j:test && npm run neo4j:test-api
npm run neo4j:apply-schema    # idempotent — safe to re-run
npm run books:status
npm run books:embed-missing # after adding PDFs to books/
npm run start:go -- --clear
```

### Question paper test checklist

1. **Profile → Select classes** → include Class 6–12 (or 2–12 for full demo)
2. **Chat → Upload** → pick class → expand → **English** or **Science** shows green Available
3. Select subject → book chips load from Aura → upload PDF → **Verify**
4. **Generate paper** link → `/notes/generate` → paper type + difficulty → **Generate**

---

*Last updated: 2026-06-07 — Phase 7c Question Paper Graph RAG (verify, generate, NCERT ingest, curriculum availability).*
