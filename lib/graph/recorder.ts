import { runReadQuery, runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import { mergeChunkTranscripts } from "@/lib/recording/transcript-merge";
import type { TeachingReport } from "@/types/recorder";

export type AudioChunkNode = Readonly<{
  chunkId: string;
  index: number;
  sttStatus: string;
  text: string;
  durationMs?: number;
  sessionId: string;
}>;

export type TranscriptNode = Readonly<{
  transcriptId: string;
  text: string;
  isComplete: boolean;
  chunkCount: number;
}>;

export type ReportNode = Readonly<{
  reportId: string;
  json: TeachingReport;
}>;

export type ClassNotesNode = Readonly<{
  notesId: string;
  text: string;
}>;

type ChunkRow = Readonly<{ chunk: Record<string, unknown> }>;

type TranscriptSourceRow = Readonly<{
  expectedChunkCount: unknown;
  chunks: Record<string, unknown>[];
  topic: unknown;
  subject: unknown;
  classLevel: unknown;
}>;

export type CanonicalTranscript = Readonly<{
  text: string;
  chunkCount: number;
  isComplete: boolean;
  topic: string;
  subject: string;
  classLevel: string;
}>;

export async function upsertAudioChunk(
  clerkId: string,
  sessionId: string,
  index: number,
  text: string,
  sttStatus: string,
): Promise<AudioChunkNode> {
  const chunkId = `${sessionId}-${index}`;

  const [row] = await runWriteQuery<ChunkRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session { sessionId: $sessionId })
    MERGE (ac:AudioChunk { chunkId: $chunkId })
    ON CREATE SET ac.createdAt = datetime()
    SET ac.index = $index,
        ac.text = $text,
        ac.sttStatus = $sttStatus,
        ac.sessionId = $sessionId,
        ac.updatedAt = datetime()
    MERGE (s)-[:HAS_CHUNK]->(ac)
    RETURN ac { .* } AS chunk
    `,
    { clerkId, sessionId, chunkId, index, text, sttStatus },
  );

  if (!row) {
    throw new Error("Failed to upsert AudioChunk in AuraDB");
  }

  return serializeNeo4jValue(row.chunk) as AudioChunkNode;
}

export async function updateSessionDuration(
  clerkId: string,
  sessionId: string,
  durationSeconds: number,
  expectedChunkCount: number,
): Promise<void> {
  await runWriteQuery(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session { sessionId: $sessionId })
    SET s.durationSeconds = $durationSeconds,
        s.expectedChunkCount = $expectedChunkCount,
        s.updatedAt = datetime()
    `,
    { clerkId, sessionId, durationSeconds, expectedChunkCount },
  );
}

export async function getCanonicalTranscript(
  clerkId: string,
  sessionId: string,
  allowPartial: boolean,
): Promise<CanonicalTranscript | null> {
  const [row] = await runReadQuery<TranscriptSourceRow>(
    `
    MATCH (:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session { sessionId: $sessionId })
    CALL (s) {
      OPTIONAL MATCH (s)-[:HAS_CHUNK]->(chunk:AudioChunk)
      WITH chunk ORDER BY chunk.index ASC
      RETURN collect(chunk { .index, .text, .sttStatus }) AS chunks
    }
    RETURN s.expectedChunkCount AS expectedChunkCount,
           s.topic AS topic,
           s.subject AS subject,
           s.classLevel AS classLevel,
           chunks
    `,
    { clerkId, sessionId },
  );

  if (!row) {
    return null;
  }

  const expectedValue = serializeNeo4jValue(row.expectedChunkCount);
  const expected =
    typeof expectedValue === "number" && expectedValue >= 0
      ? Math.floor(expectedValue)
      : null;
  const chunks = row.chunks
    .map((chunk) => serializeNeo4jValue(chunk) as Record<string, unknown>)
    .filter(
      (chunk): chunk is Record<string, unknown> & { index: number; text: string; sttStatus: string } =>
        typeof chunk.index === "number" &&
        typeof chunk.text === "string" &&
        typeof chunk.sttStatus === "string",
    )
    .sort((left, right) => left.index - right.index);
  const ready = chunks.filter(
    (chunk) => chunk.sttStatus === "done" || chunk.sttStatus === "empty",
  );
  const isComplete =
    expected !== null &&
    expected > 0 &&
    ready.length === expected &&
    ready.every((chunk, index) => chunk.index === index);

  const metadata = {
    topic: typeof row.topic === "string" ? row.topic : "",
    subject: typeof row.subject === "string" ? row.subject : "",
    classLevel: typeof row.classLevel === "string" ? row.classLevel : "",
  };

  if (!allowPartial && !isComplete) {
    return { text: "", chunkCount: ready.length, isComplete: false, ...metadata };
  }

  return {
    text: mergeChunkTranscripts(ready.map((chunk) => chunk.text)),
    chunkCount: ready.length,
    isComplete,
    ...metadata,
  };
}

export async function saveTranscriptReportAndNotes(
  clerkId: string,
  sessionId: string,
  transcriptText: string,
  isComplete: boolean,
  chunkCount: number,
  report: TeachingReport,
  classNotes: string,
): Promise<{ transcriptId: string; reportId: string; notesId: string }> {
  const transcriptId = `${sessionId}-transcript`;
  const reportId = `${sessionId}-report`;
  const notesId = `${sessionId}-notes`;

  await runWriteQuery(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session { sessionId: $sessionId })
    MERGE (s)-[:HAS_TRANSCRIPT]->(tr:Transcript { transcriptId: $transcriptId })
    ON CREATE SET tr.createdAt = datetime()
    SET tr.text = $transcriptText,
        tr.isComplete = $isComplete,
        tr.chunkCount = $chunkCount,
        tr.updatedAt = datetime()
    MERGE (s)-[:HAS_REPORT]->(rp:Report { reportId: $reportId })
    ON CREATE SET rp.createdAt = datetime()
    SET rp.json = $reportJson,
        rp.updatedAt = datetime()
    MERGE (s)-[:HAS_CLASS_NOTES]->(cn:ClassNotes { notesId: $notesId })
    ON CREATE SET cn.createdAt = datetime()
    SET cn.text = $classNotes,
        cn.updatedAt = datetime(),
        s.score = $overallScore,
        s.updatedAt = datetime()
    `,
    {
      clerkId,
      sessionId,
      transcriptId,
      reportId,
      notesId,
      transcriptText,
      isComplete,
      chunkCount,
      reportJson: JSON.stringify(report),
      classNotes,
      overallScore: report.overallScore,
    },
  );

  return { transcriptId, reportId, notesId };
}
