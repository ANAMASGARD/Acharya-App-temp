# Acharya — Project Memory

> **Purpose:** Single source of project history + current state for humans and AI agents.  
> **Spec:** Product/architecture rules live in [`AGENTS.md`](../AGENTS.md) — read that before implementing features.  
> **Update rule:** After each meaningful commit, update **§5 Current State** and add one entry to **§6 Commit Log**.

---

## 1. Quick Read (AI + humans)

| Field | Value |
|-------|--------|
| **Product** | Acharya — AI teaching assistant for teachers (recorder, transcripts, reports, calendar, chat, question paper verify/generate, teacher community) |
| **Phase** | **Phase 8 — Home Dashboard + Teacher Community** ✅ committed on `dev` |
| **Previous phases** | Phase 7c Question Paper RAG (`0a3af7e`), Phase 7b Notes UI, Phase 7 Chat |
| **Branch** | `dev` |
| **Runnable in Expo Go?** | Yes — recorder, calendar, chat, notes, live Home dashboard + community |
| **Default tab on launch** | **Recorder** (`/(tabs)/recorder`) |

### What works today

**Home Dashboard + Teacher Community (Phase 8)**

- **Live Home dashboard** — stats merged inside Recent Activity card (classes, notes, avg score); compact header; activity max 2 on Home
- **Dashboard fix** — Neo4j `LIMIT` uses `neo4j.int()` (fixes `5.0 is not a valid integer` error)
- **Community on Home** — feed preview (max 2 posts), compact create-post banner; visible without scroll on most phones
- **Post images** — create post supports gallery/camera/files (JPG, PNG, WEBP, HEIC, GIF, etc.); up to 4 images; served via `GET /api/community/images/[imageId]`
- **Acharya welcome post** — always upserted in Aura on feed load; ASCII-art quick-start guide; pinned first; deletable; does not re-appear after delete
- **Post UX** — card content tappable for full post; bookmark icon top-right only; delete in footer only; vote/save/delete wired with Teacher MERGE fix + API route param fallback
- **Full community stack** — `/community/feed`, create post, post detail + comments, groups, join by code, group chat (5s poll)
- **Neo4j community graph** — `CommunityPost`, `CommunityComment`, `CommunityGroup`, `GroupMessage`, `CommunityPostImage` + vote/save/member relationships
- **Transactional vote scores** — `CommunityPost.score` updated in single write tx with delta table
- **Deep links** — share copies `acharyaapp://community/post/{postId}`

**Question Paper Tool (Phase 7c) ✅**

- `/notes/upload`, `/notes/generate`, hybrid Graph RAG, 11 demo NCERT books embedded

**API routes (Clerk auth) — community + dashboard**

| Route | Role |
|-------|------|
| `GET /api/dashboard` | Live stats + recent activity |
| `GET/POST /api/community/posts` | Feed + create post |
| `GET /api/community/posts/[postId]` | Post detail + comments |
| `POST/DELETE .../vote` | Upvote/downvote/remove |
| `POST/DELETE .../save` | Bookmark toggle |
| `GET/POST .../comments` | Comment thread |
| `GET /api/community/images/[imageId]` | Serve uploaded post images |
| `GET/POST /api/community/groups` | List/create groups |
| `POST /api/community/groups/join` | Join by code (case-insensitive) |
| `GET /api/community/groups/[groupId]` | Group detail + members |
| `GET/POST .../messages` | Group chat |

**Chat, Recorder, Calendar, Auth, Profile** — unchanged; Chat tab remains AI coach only

**Not built yet**

- Chat **Voice** pill → Sarvam conversational agent
- Group chat unread counts / push notifications (v1 is poll-only)
- More than 2 subjects per class in curriculum sheet

**Validation (last run — 2026-06-08):**

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ pass |
| `npx tsc --noEmit` | ✅ pass |
| `npm run verify:neo4j` | ✅ pass — 2299 nodes, 2279 rels |
| `npm run neo4j:test` | ✅ pass — 8/8 integration tests |
| `npm run neo4j:test-api` | ✅ pass — API layer + health query |

**Aura schema:** `neo4j/schema.cypher` — apply after pull: `npm run neo4j:apply-schema` (adds community constraints/indexes)

---

## 2. Project Phase Map

```
Phase 0–7c   … prior phases (see §6 Commit Log)
Phase 8      Home Dashboard + Teacher Community — live Aura dashboard, Reddit-style feed, groups, group chat, post images
```

---

## 3. Architecture Snapshot

### Home + community

```
Home tab
  → use-home-dashboard → GET /api/dashboard
  → use-community-feed (preview limit 2) → GET /api/community/posts (+ welcome upsert + optional demo seed)
  → Groups segment (lazy) → GET /api/community/groups

app/community/*
  → feed, create-post, post/[postId], groups/*, join, group chat

lib/graph/dashboard.ts       — stats + activity aggregation
lib/graph/community/*        — feed, votes, comments, groups, chat, seed-demo, seed-welcome
lib/api-route-params.ts      — nested API route param resolution fallback
lib/community/post-route.ts  — post deep-link paths
lib/dashboard/streak.ts      — consecutive-day streak in TypeScript
```

### Question paper RAG (Phase 7c)

Unchanged — see prior memory sections.

---

## 4. File map — Phase 8

### API

| File | Role |
|------|------|
| `app/api/dashboard+api.ts` | Dashboard aggregation |
| `app/api/community/posts+api.ts` | Feed + create (+ image upload) |
| `app/api/community/posts/[postId]+api.ts` | Detail + delete |
| `app/api/community/posts/[postId]/vote+api.ts` | Votes |
| `app/api/community/posts/[postId]/save+api.ts` | Saves |
| `app/api/community/posts/[postId]/comments+api.ts` | Comments |
| `app/api/community/images/[imageId]+api.ts` | Post image serving |
| `app/api/community/groups+api.ts` | Groups |
| `app/api/community/groups/join+api.ts` | Join code |
| `app/api/community/groups/[groupId]+api.ts` | Group detail |
| `app/api/community/groups/[groupId]/messages+api.ts` | Group chat |

### UI

| Path | Role |
|------|------|
| `components/home/home-screen.tsx` | Compact Home (stats in activity card) |
| `components/home/recent-activity-card.tsx` | Stats chips + activity + quick links |
| `components/community/*` | Feed, post card/body, images, groups, chat, top bookmark actions |
| `app/community/*` | Community stack screens |

### Hooks / store

| File | Role |
|------|------|
| `hooks/use-home-dashboard.ts` | Dashboard on focus |
| `hooks/use-community-feed.ts` | Feed + optimistic vote/save/delete |
| `hooks/use-community-groups.ts` | Groups CRUD/join |
| `hooks/use-group-chat.ts` | 5s polling chat |
| `hooks/use-community-post-images.ts` | Image picker + upload |
| `store/community-store.ts` | Draft post state |

---

## 5. Current State

> **Status:** Phase 8 shipped on `dev`. No in-progress feature branch work.

| Topic | Implementation |
|-------|----------------|
| Home data | Aura live — no static mock feed |
| Streak | Distinct session dates from Cypher → `computeTeachingStreak` in TS |
| Vote score | Single write transaction + delta table; Teacher MERGE before vote/save |
| API params | `lib/api-route-params.ts` — URL fallback for nested Expo API routes |
| Welcome post | `ensureAcharyaWelcomePost()` on every feed load; ASCII guide; footer-only delete |
| Post actions | Bookmark top-right; delete footer only (card + detail) |
| Home performance | Dashboard + feed preview on load; groups lazy on segment tap |
| Group chat v1 | 5s poll while focused; no unread counts |
| Join codes | Uppercase on write; case-insensitive lookup |
| Demo seed | `COMMUNITY_DEMO_SEED=true` — LLM posts on empty feed; cleanup: `MATCH (p:CommunityPost {demoSeed:true}) WHERE NOT coalesce(p.demoWelcome,false) DETACH DELETE p` |

---

## 6. Commit Log (oldest → newest)

### `0a3af7e` — feat: Question Paper Graph RAG with NCERT ingest and curriculum availability

- (prior entry unchanged)

### `474cfb6` — feat: Home dashboard and teacher community with post images and welcome guide

- Live Aura dashboard on Home (`GET /api/dashboard`); stats merged into Recent Activity card
- Neo4j `neo4j.int()` fix for dashboard LIMIT params
- Full teacher community: feed, create post, post detail, comments, votes, saves, groups, join-by-code, group chat
- Post image upload (gallery/camera/files) + `CommunityPostImage` graph nodes + image API route
- Acharya welcome post (ASCII quick-start guide); always upserted; pinned; deletable
- Post UX polish: tappable card body, bookmark top-only, delete footer-only, monospace ASCII body rendering
- Vote/save Teacher MERGE fix; nested API route param resolution
- Schema + graph-model updates for community labels/constraints
- Validation: lint, tsc, verify:neo4j, neo4j:test, neo4j:test-api — all pass

---

## 7. Next Work (recommended order)

1. **Merge Phase 8 PR** — `dev` → `main`
2. **`npm run neo4j:apply-schema`** on Aura if community constraints not yet applied
3. **Manual test** — two teacher accounts: post with images, vote, save, delete welcome post, group join, group chat
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
| `prompt_material/08-teacher-community.png` | Community feed on Home — **implemented** |
| `prompt_material/09-notes-verify.png` | Notes upload — implemented |
| `prompt_material/06-teaching-calendar.png` | Calendar — implemented |
| `prompt_material/05-core-recorder.png` | Recorder — implemented |

---

## 10. Dev workflow

### Commands

```bash
npm run lint && npx tsc --noEmit
npm run verify:neo4j && npm run neo4j:test && npm run neo4j:test-api
npm run neo4j:apply-schema    # after Phase 8 — community constraints
npm run start:go -- --clear
```

### Phase 8 test checklist

1. **Home** — no dashboard error; stats inside Recent Activity; Community Feed visible without scroll
2. **Welcome post** — ASCII guide pinned; bookmark top; delete footer only; delete once → does not return
3. **Demo seed** — set `COMMUNITY_DEMO_SEED=true`; open Home → realistic teacher posts appear
4. **Community** — create post with images; upvote/downvote/toggle save; share link copies `acharyaapp://...`
5. **Comments** — open post detail; add comment; `commentCount` increments
6. **Groups** — create group; copy join code; second teacher joins with lowercase code
7. **Group chat** — send message; appears on poll refresh for other member

---

*Last updated: 2026-06-08 — Phase 8 committed on `dev`; all validation checks pass.*
