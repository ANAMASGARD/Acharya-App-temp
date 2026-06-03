import { runReadQuery, runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import type { CreateSessionInput, SessionNode } from "@/types/graph";

type SessionRow = Readonly<{
  session: Record<string, unknown>;
}>;

export async function createSession(
  clerkId: string,
  input: CreateSessionInput,
): Promise<SessionNode> {
  const sessionId = crypto.randomUUID();
  const recordedAt = input.recordedAt ?? new Date().toISOString();

  const [row] = await runWriteQuery<SessionRow>(
    `
    MERGE (t:Teacher { clerkId: $clerkId })
    ON CREATE SET t.createdAt = datetime()
    CREATE (s:Session {
      sessionId: $sessionId,
      topic: $topic,
      subject: $subject,
      classLevel: $classLevel,
      recordedAt: datetime($recordedAt),
      durationSeconds: $durationSeconds,
      score: $score,
      teacherClerkId: $clerkId
    })
    CREATE (t)-[:TAUGHT]->(s)
    RETURN s { .* } AS session
    `,
    {
      clerkId,
      sessionId,
      topic: input.topic,
      subject: input.subject,
      classLevel: input.classLevel,
      recordedAt,
      durationSeconds: input.durationSeconds ?? 0,
      score: input.score ?? null,
    },
  );

  if (!row) {
    throw new Error("Failed to create Session node in AuraDB");
  }

  return serializeNeo4jValue(row.session) as SessionNode;
}

export async function listSessionsByTeacher(
  clerkId: string,
  limit = 20,
): Promise<SessionNode[]> {
  const rows = await runReadQuery<SessionRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session)
    RETURN s { .* } AS session
    ORDER BY s.recordedAt DESC
    LIMIT $limit
    `,
    { clerkId, limit },
  );

  return rows.map((row) => serializeNeo4jValue(row.session) as SessionNode);
}
