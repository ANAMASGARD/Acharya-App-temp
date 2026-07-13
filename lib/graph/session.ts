import { runReadQuery, runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import type { SessionDetail } from "@/types/calendar";
import type { CreateSessionInput, SessionNode } from "@/types/graph";
import type { TeachingReport } from "@/types/recorder";

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
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const rows = await runReadQuery<SessionRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session)-[:HAS_REPORT]->(:Report)
    RETURN s { .* } AS session
    ORDER BY s.recordedAt DESC
    LIMIT $limit
    `,
    { clerkId, limit: safeLimit },
  );

  return rows.map((row) => serializeNeo4jValue(row.session) as SessionNode);
}

type SessionDetailRow = Readonly<{
  session: Record<string, unknown>;
  report: Record<string, unknown> | null;
  transcript: Record<string, unknown> | null;
  classNotes: Record<string, unknown> | null;
}>;

function parseReportJson(value: unknown): TeachingReport | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as TeachingReport;
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && value !== null) {
    return value as TeachingReport;
  }

  return null;
}

export async function getSessionDetail(
  clerkId: string,
  sessionId: string,
): Promise<SessionDetail | null> {
  const [row] = await runReadQuery<SessionDetailRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session { sessionId: $sessionId })
    OPTIONAL MATCH (s)-[:HAS_REPORT]->(rp:Report)
    OPTIONAL MATCH (s)-[:HAS_TRANSCRIPT]->(tr:Transcript)
    OPTIONAL MATCH (s)-[:HAS_CLASS_NOTES]->(cn:ClassNotes)
    RETURN s { .* } AS session, rp { .* } AS report, tr { .* } AS transcript, cn { .* } AS classNotes
    `,
    { clerkId, sessionId },
  );

  if (!row) {
    return null;
  }

  const session = serializeNeo4jValue(row.session) as SessionNode;
  const reportNode = row.report
    ? (serializeNeo4jValue(row.report) as { json?: unknown })
    : null;
  const transcriptNode = row.transcript
    ? (serializeNeo4jValue(row.transcript) as { text?: string })
    : null;

  const transcriptText = transcriptNode?.text?.trim() ?? "";
  const transcriptPreview =
    transcriptText.length > 0 ? transcriptText.slice(0, 280) : null;

  const classNotesNode = row.classNotes
    ? (serializeNeo4jValue(row.classNotes) as { text?: string })
    : null;
  const classNotesText = classNotesNode?.text?.trim() ?? "";
  const classNotes = classNotesText.length > 0 ? classNotesText : null;

  return {
    session,
    report: reportNode ? parseReportJson(reportNode.json) : null,
    transcriptPreview,
    classNotes,
  };
}
