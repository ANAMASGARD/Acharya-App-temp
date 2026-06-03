# Acharya — Neo4j Aura graph model

AuraDB stores **product data only** — recordings, transcripts, reports, RAG chunks, chat context, verification results. **Clerk handles all authentication.** Aura never stores passwords, OTP state, or login profiles.

The Clerk user ID (`clerkId`) is used **only as a foreign key** on graph nodes so teacher-owned data can be queried. A minimal `Teacher` anchor node (just `clerkId`) is created lazily on the first product write (e.g. saving a session), not at sign-in.

## Node labels

| Label | Key property | Purpose |
|-------|--------------|---------|
| `Teacher` | `clerkId` | Data anchor only — Clerk user ID reference, not auth storage |
| `Session` | `sessionId` | One recorded class |
| `Transcript` | `transcriptId` | Merged STT output for a session |
| `Report` | `reportId` | Gemini teaching analysis for a session |
| `CurriculumBook` | `bookId` | NCERT / curriculum source book |
| `Chapter` | `chapterId` | Chapter within a book |
| `Chunk` | `chunkId` | Text chunk (+ `embedding` for vector search) |
| `VerificationReport` | `verificationId` | Notes verification output |

## Relationships (feature-driving)

| Pattern | Powers |
|---------|--------|
| `(Teacher)-[:TAUGHT]->(Session)` | Calendar, dashboard, session history |
| `(Session)-[:HAS_TRANSCRIPT]->(Transcript)` | Report pipeline, replay |
| `(Session)-[:HAS_REPORT]->(Report)` | Scores, feedback UI |
| `(Chapter)-[:PART_OF]->(CurriculumBook)` | Curriculum navigation |
| `(Chunk)-[:IN_CHAPTER]->(Chapter)` | Scoped RAG by class/subject |
| `(Chunk)-[:SIMILAR_TO]->(Chunk)` | Notes vs curriculum alignment (optional, query-derived) |
| `(Teacher)-[:UPLOADED]->(Chunk)` | Teacher notes chunks |
| `(Teacher)-[:REQUESTED]->(VerificationReport)` | Notes verification history |
| `(VerificationReport)-[:CHECKED_AGAINST]->(Chunk)` | Graph trace for judges / demo |

## Example queries (live Aura — not mocks)

**Teacher session history (calendar):**

```cypher
MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session)
RETURN s.sessionId, s.topic, s.recordedAt, s.score
ORDER BY s.recordedAt DESC
LIMIT 20
```

**RAG: similar curriculum chunks:**

```cypher
CALL db.index.vector.queryNodes('chunk_embedding', $topK, $queryEmbedding)
YIELD node AS chunk, score
MATCH (chunk)-[:IN_CHAPTER]->(ch:Chapter)-[:PART_OF]->(book:CurriculumBook)
WHERE book.subject = $subject AND book.classLevel = $classLevel
RETURN chunk, ch, book, score
ORDER BY score DESC
```

**Notes verification path:**

```cypher
MATCH (t:Teacher { clerkId: $clerkId })-[:UPLOADED]->(note:Chunk)
MATCH (note)-[:SIMILAR_TO]->(ref:Chunk)-[:IN_CHAPTER]->(ch:Chapter)
RETURN note, ref, ch, note.text AS noteText, ref.text AS refText
```

## Apply schema

```bash
# After Aura instance is running and .env has NEO4J_* vars
cypher-shell -a "$NEO4J_URI" -u "$NEO4J_USERNAME" -p "$NEO4J_PASSWORD" -f neo4j/schema.cypher
```

## Health check (API)

`GET /api/health/neo4j` — runs live Cypher on Aura (`verifyConnectivity` + counts). Use for hackathon demo of real queries.
