import { runReadQuery, runWriteQuery } from "@/lib/neo4j";
import { embedText, embedTexts } from "@/lib/rag/embeddings";
import { sarvamChatCompletion } from "@/lib/sarvam";

/**
 * Graph-native long-term agent memory (mem0-style) on Neo4j.
 *
 * Durable facts about a teacher are extracted from chat turns, embedded, and
 * stored as `Memory` nodes linked to the `Teacher`. Recall is a vector search
 * over `memory_embedding` filtered to the teacher, injected into the system
 * prompt so the coach is stateful and personalized across conversations.
 */

const MEMORY_INDEX = "memory_embedding";

/** Durable memory categories the extractor is allowed to emit. */
export type MemoryKind =
  | "subject"
  | "class"
  | "preference"
  | "struggle"
  | "goal"
  | "fact";

const MEMORY_KINDS: readonly MemoryKind[] = [
  "subject",
  "class",
  "preference",
  "struggle",
  "goal",
  "fact",
];

export type TeacherMemory = Readonly<{
  text: string;
  kind: MemoryKind;
  score: number;
}>;

type RecallRow = Readonly<{
  text: string;
  kind: string;
  score: number;
}>;

const EXTRACTION_SYSTEM_PROMPT = `You extract durable long-term memory facts about a TEACHER from one chat exchange.

Return ONLY a JSON array (no prose, no markdown). Each item: { "text": string, "kind": one of ["subject","class","preference","struggle","goal","fact"] }.

Rules:
- Capture only STABLE facts worth remembering across future chats: subjects/classes they teach, recurring teaching struggles, stated goals, lasting preferences, or durable personal facts.
- Do NOT capture one-off questions, greetings, the assistant's advice, or anything transient.
- Write each fact as a short third-person statement about the teacher (e.g. "Teaches Class 6 Science", "Struggles to keep large classes engaged").
- If nothing durable is present, return [].
- At most 3 items. English statements even if the chat is in another language.`;

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseMemoryArray(raw: string): { text: string; kind: MemoryKind }[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const out: { text: string; kind: MemoryKind }[] = [];

  for (const item of parsed) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text.trim() : "";
    const kindRaw = typeof record.kind === "string" ? record.kind.trim() : "fact";
    const kind = (MEMORY_KINDS as readonly string[]).includes(kindRaw)
      ? (kindRaw as MemoryKind)
      : "fact";

    if (text.length >= 4 && text.length <= 300) {
      out.push({ text, kind });
    }
  }

  return out.slice(0, 3);
}

/**
 * Extract durable facts from the latest exchange and upsert them as Memory
 * nodes. Best-effort: callers should not await on the hot path and must catch.
 */
export async function extractAndStoreMemories(input: {
  clerkId: string;
  conversationId: string;
  userMessage: string;
  assistantMessage: string;
}): Promise<number> {
  const userMessage = input.userMessage.trim();

  // Too little signal to bother extracting memory from.
  if (userMessage.length < 12) {
    return 0;
  }

  const raw = await sarvamChatCompletion({
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Teacher said:\n${userMessage}\n\nAcharya replied:\n${input.assistantMessage.trim().slice(0, 1200)}`,
      },
    ],
    maxTokens: 400,
    temperature: 0,
    contentOnly: true,
  });

  const facts = parseMemoryArray(raw);

  if (facts.length === 0) {
    return 0;
  }

  // Embed all extracted facts in a single request rather than one call each.
  const embeddings = await embedTexts(facts.map((fact) => fact.text));
  let stored = 0;

  for (let i = 0; i < facts.length; i += 1) {
    const fact = facts[i];
    const embedding = embeddings[i];

    await runWriteQuery(
      `
      MERGE (t:Teacher { clerkId: $clerkId })
        ON CREATE SET t.createdAt = datetime()
      MERGE (m:Memory { clerkId: $clerkId, normText: $normText })
        ON CREATE SET m.memoryId = $memoryId,
                      m.text = $text,
                      m.kind = $kind,
                      m.embedding = $embedding,
                      m.createdAt = datetime(),
                      m.sourceConversationId = $conversationId
        ON MATCH SET m.lastSeenAt = datetime()
      MERGE (t)-[:HAS_MEMORY]->(m)
      `,
      {
        clerkId: input.clerkId,
        normText: normalize(fact.text),
        memoryId: crypto.randomUUID(),
        text: fact.text,
        kind: fact.kind,
        embedding,
        conversationId: input.conversationId,
      },
    );

    stored += 1;
  }

  return stored;
}

/**
 * Recall the most relevant durable memories for a teacher given the current
 * query. Vector search is global, so we over-fetch then filter by clerkId.
 */
export async function recallMemories(
  clerkId: string,
  queryText: string,
  k = 6,
): Promise<TeacherMemory[]> {
  const trimmed = queryText.trim();

  if (!trimmed) {
    return [];
  }

  const embedding = await embedText(trimmed);
  const topK = Math.max(k * 5, 25);

  const rows = await runReadQuery<RecallRow>(
    `
    CALL db.index.vector.queryNodes($indexName, $topK, $embedding)
    YIELD node AS m, score
    WHERE m.clerkId = $clerkId
    RETURN m.text AS text, m.kind AS kind, score
    ORDER BY score DESC
    LIMIT $k
    `,
    { indexName: MEMORY_INDEX, topK, embedding, clerkId, k },
  );

  return rows.map((row) => ({
    text: String(row.text ?? ""),
    kind: (MEMORY_KINDS as readonly string[]).includes(String(row.kind))
      ? (row.kind as MemoryKind)
      : "fact",
    score: typeof row.score === "number" ? row.score : 0,
  }));
}

/** Render recalled memories as a system-prompt block. Empty string when none. */
export function formatMemoriesForPrompt(memories: readonly TeacherMemory[]): string {
  if (memories.length === 0) {
    return "";
  }

  const lines = memories.map((memory) => `- ${memory.text}`);
  return `What you remember about this teacher from past chats (use it to personalize, do not repeat it back verbatim):\n${lines.join("\n")}`;
}
