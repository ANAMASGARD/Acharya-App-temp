import { appendMessage, ensureConversationForTeacher } from "@/lib/graph/chat";
import { runWriteQuery } from "@/lib/neo4j";
import type { VoiceTranscriptBatchBody } from "@/types/voice";

type SyncResult = Readonly<{
  skipped: boolean;
  messageCount: number;
}>;

export async function syncVoiceTranscriptBatch(
  body: VoiceTranscriptBatchBody,
): Promise<SyncResult> {
  const { clerkId, conversationId, voiceSessionId, messages } = body;

  if (messages.length === 0) {
    return { skipped: true, messageCount: 0 };
  }

  await ensureConversationForTeacher(clerkId, conversationId);

  const [existing] = await runWriteQuery<{ transcriptSynced: boolean }>(
    `
    MERGE (vs:VoiceSession { voiceSessionId: $voiceSessionId })
    ON CREATE SET
      vs.conversationId = $conversationId,
      vs.clerkId = $clerkId,
      vs.transcriptSynced = false,
      vs.createdAt = datetime()
  RETURN coalesce(vs.transcriptSynced, false) AS transcriptSynced
    `,
    { voiceSessionId, conversationId, clerkId },
  );

  if (existing?.transcriptSynced) {
    return { skipped: true, messageCount: 0 };
  }

  for (const message of messages) {
    const trimmed = message.content.trim();

    if (!trimmed) {
      continue;
    }

    await appendMessage(clerkId, conversationId, message.role, trimmed);
  }

  await runWriteQuery(
    `
    MATCH (vs:VoiceSession { voiceSessionId: $voiceSessionId })
    SET vs.transcriptSynced = true,
        vs.syncedAt = datetime()
    `,
    { voiceSessionId },
  );

  return { skipped: false, messageCount: messages.length };
}
