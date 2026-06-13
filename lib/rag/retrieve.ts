import { runReadQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import { embedText } from "@/lib/rag/embeddings";
import type { RetrievalDebugMatch } from "@/types/question-paper";

export type RetrievedChunk = Readonly<{
  chunkId: string;
  text: string;
  chapterId: string;
  chapterTitle: string;
  bookId: string;
  bookTitle: string;
  vectorScore: number;
  keywordBoost: number;
  finalScore: number;
}>;

type RawRow = Readonly<{
  chunk: Record<string, unknown>;
  chapter: Record<string, unknown>;
  book: Record<string, unknown>;
  score: number;
}>;

const VECTOR_INDEX = "chunk_embedding";
const ANN_MULTIPLIER = 3;

function tokenizeForBoost(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 4);
}

function keywordBoost(
  queryText: string,
  chapterTitle: string,
  chunkText: string,
): number {
  const tokens = new Set(tokenizeForBoost(queryText));
  if (tokens.size === 0) {
    return 0;
  }

  const haystack = `${chapterTitle} ${chunkText}`.toLowerCase();
  let hits = 0;

  for (const token of tokens) {
    if (haystack.includes(token)) {
      hits += 1;
    }
  }

  return Math.min(0.25, hits * 0.04);
}

export async function hybridRetrieveCurriculumChunks(input: {
  embedding: number[];
  bookIds: readonly string[];
  classLevel: string;
  subject: string;
  queryText: string;
  limit?: number;
}): Promise<{ matches: RetrievedChunk[]; debug: RetrievalDebugMatch[] }> {
  const limit = input.limit ?? 12;
  const annK = limit * ANN_MULTIPLIER;

  const rows = await runReadQuery<RawRow>(
    `
    CALL db.index.vector.queryNodes($indexName, $topK, $embedding)
    YIELD node AS chunk, score
    OPTIONAL MATCH (chunk)-[:IN_CHAPTER]->(ch:Chapter)-[:PART_OF]->(book:CurriculumBook)
    RETURN chunk { .* } AS chunk, ch { .* } AS chapter, book { .* } AS book, score
    ORDER BY score DESC
  `,
    {
      indexName: VECTOR_INDEX,
      topK: annK,
      embedding: input.embedding,
    },
  );

  const bookIdSet = new Set(input.bookIds);
  const debug: RetrievalDebugMatch[] = [];
  const ranked: RetrievedChunk[] = [];

  for (const row of rows) {
    const chunk = serializeNeo4jValue(row.chunk) as Record<string, unknown>;
    const chapter = serializeNeo4jValue(row.chapter) as Record<string, unknown>;
    const book = serializeNeo4jValue(row.book) as Record<string, unknown>;

    const bookId = String(book.bookId ?? "");
    const classLevel = String(book.classLevel ?? "");
    const subject = String(book.subject ?? "").toLowerCase();
    const survivedGraphFilter =
      bookIdSet.has(bookId) &&
      classLevel === input.classLevel &&
      subject === input.subject.toLowerCase();

    const chapterTitle = String(chapter.title ?? chapter.chapterId ?? "");
    const chunkText = String(chunk.text ?? "");
    const vectorScore = typeof row.score === "number" ? row.score : 0;
    const boost = keywordBoost(input.queryText, chapterTitle, chunkText);
    const finalScore = vectorScore + (survivedGraphFilter ? boost : 0);

    debug.push({
      chunkId: String(chunk.chunkId ?? ""),
      chapterTitle,
      bookTitle: String(book.title ?? bookId),
      vectorScore,
      keywordBoost: boost,
      finalScore,
      survivedGraphFilter,
    });

    if (!survivedGraphFilter) {
      continue;
    }

    ranked.push({
      chunkId: String(chunk.chunkId ?? ""),
      text: chunkText,
      chapterId: String(chapter.chapterId ?? ""),
      chapterTitle,
      bookId,
      bookTitle: String(book.title ?? bookId),
      vectorScore,
      keywordBoost: boost,
      finalScore,
    });
  }

  ranked.sort((a, b) => b.finalScore - a.finalScore);

  return {
    matches: ranked.slice(0, limit),
    debug,
  };
}

export type AgentCurriculumMatch = Readonly<{
  text: string;
  chapterTitle: string;
  bookTitle: string;
  classLevel: string;
  subject: string;
  score: number;
}>;

/**
 * Relaxed curriculum search for the chat agent: embeds a free-text query and
 * runs vector search over all curriculum chunks, optionally narrowing by class
 * and/or subject. Unlike hybridRetrieveCurriculumChunks it does not require a
 * preselected set of bookIds, so the agent can ground answers on its own.
 */
export async function searchCurriculumForAgent(input: {
  query: string;
  classLevel?: string;
  subject?: string;
  limit?: number;
}): Promise<AgentCurriculumMatch[]> {
  const query = input.query.trim();

  if (!query) {
    return [];
  }

  const limit = input.limit ?? 6;
  const embedding = await embedText(query);

  const rows = await runReadQuery<RawRow>(
    `
    CALL db.index.vector.queryNodes($indexName, $topK, $embedding)
    YIELD node AS chunk, score
    MATCH (chunk)-[:IN_CHAPTER]->(ch:Chapter)-[:PART_OF]->(book:CurriculumBook)
    WHERE ($classLevel IS NULL OR book.classLevel = $classLevel)
      AND ($subject IS NULL OR toLower(book.subject) = toLower($subject))
    RETURN chunk { .* } AS chunk, ch { .* } AS chapter, book { .* } AS book, score
    ORDER BY score DESC
    LIMIT $limit
  `,
    {
      indexName: VECTOR_INDEX,
      topK: limit * ANN_MULTIPLIER,
      embedding,
      classLevel: input.classLevel ?? null,
      subject: input.subject ?? null,
      limit,
    },
  );

  return rows.map((row) => {
    const chunk = serializeNeo4jValue(row.chunk) as Record<string, unknown>;
    const chapter = serializeNeo4jValue(row.chapter) as Record<string, unknown>;
    const book = serializeNeo4jValue(row.book) as Record<string, unknown>;

    return {
      text: String(chunk.text ?? ""),
      chapterTitle: String(chapter.title ?? chapter.chapterId ?? ""),
      bookTitle: String(book.title ?? book.bookId ?? ""),
      classLevel: String(book.classLevel ?? ""),
      subject: String(book.subject ?? ""),
      score: typeof row.score === "number" ? row.score : 0,
    };
  });
}

export async function sampleCurriculumChunksForGeneration(input: {
  bookIds: readonly string[];
  classLevel: string;
  subject: string;
  chapterIds?: readonly string[];
  limit?: number;
}): Promise<RetrievedChunk[]> {
  const limit = input.limit ?? 24;

  const rows = await runReadQuery<RawRow>(
    `
    MATCH (book:CurriculumBook)<-[:PART_OF]-(ch:Chapter)<-[:IN_CHAPTER]-(chunk:Chunk)
    WHERE book.bookId IN $bookIds
      AND book.classLevel = $classLevel
      AND toLower(book.subject) = toLower($subject)
      AND ($chapterIds IS NULL OR ch.chapterId IN $chapterIds)
    RETURN chunk { .* } AS chunk, ch { .* } AS chapter, book { .* } AS book, 1.0 AS score
    ORDER BY ch.index ASC, chunk.chunkId ASC
    LIMIT $limit
  `,
    {
      bookIds: [...input.bookIds],
      classLevel: input.classLevel,
      subject: input.subject,
      chapterIds: input.chapterIds?.length ? [...input.chapterIds] : null,
      limit,
    },
  );

  return rows.map((row) => {
    const chunk = serializeNeo4jValue(row.chunk) as Record<string, unknown>;
    const chapter = serializeNeo4jValue(row.chapter) as Record<string, unknown>;
    const book = serializeNeo4jValue(row.book) as Record<string, unknown>;

    return {
      chunkId: String(chunk.chunkId ?? ""),
      text: String(chunk.text ?? ""),
      chapterId: String(chapter.chapterId ?? ""),
      chapterTitle: String(chapter.title ?? ""),
      bookId: String(book.bookId ?? ""),
      bookTitle: String(book.title ?? ""),
      vectorScore: 1,
      keywordBoost: 0,
      finalScore: 1,
    };
  });
}
