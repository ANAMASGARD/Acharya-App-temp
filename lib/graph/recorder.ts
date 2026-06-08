import { runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
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
): Promise<void> {
  await runWriteQuery(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session { sessionId: $sessionId })
    SET s.durationSeconds = $durationSeconds,
        s.updatedAt = datetime()
    `,
    { clerkId, sessionId, durationSeconds },
  );
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
