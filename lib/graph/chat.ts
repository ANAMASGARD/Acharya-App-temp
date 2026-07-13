import { runReadQuery, runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import type {
  ChatConversation,
  ChatConversationSummary,
  ChatMessage,
  ChatRole,
} from "@/types/chat";
import type { TeachingReport } from "@/types/recorder";

type ConversationRow = Readonly<{
  conversation: Record<string, unknown>;
}>;

type MessageRow = Readonly<{
  message: Record<string, unknown>;
}>;

type ContextRow = Readonly<{
  topic: string;
  subject: string;
  classLevel: string;
  score: number | null;
  reportJson: unknown;
}>;

function summarizeReport(json: unknown): string {
  if (typeof json === "string") {
    try {
      return summarizeReport(JSON.parse(json) as TeachingReport);
    } catch {
      return "";
    }
  }

  if (typeof json !== "object" || json === null) {
    return "";
  }

  const report = json as Partial<TeachingReport>;
  const parts = [
    report.topicSpecificFeedback,
    report.areasToImprove,
  ].filter((part) => typeof part === "string" && part.trim().length > 0);

  const combined = parts.join(" ").trim();
  return combined.length > 180 ? `${combined.slice(0, 177)}...` : combined;
}

export async function buildTeacherContextSnapshot(
  clerkId: string,
): Promise<string> {
  const rows = await runReadQuery<ContextRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session)-[:HAS_REPORT]->(r:Report)
    RETURN s.topic AS topic,
           s.subject AS subject,
           s.classLevel AS classLevel,
           s.score AS score,
           r.json AS reportJson
    ORDER BY s.recordedAt DESC
    LIMIT 3
    `,
    { clerkId },
  );

  if (rows.length === 0) {
    return "";
  }

  const lines = rows.map((row, index) => {
    const summary = summarizeReport(row.reportJson);
    const scoreLabel =
      row.score === null || row.score === undefined
        ? "no score"
        : `score ${row.score}`;
    const summarySuffix = summary ? ` — ${summary}` : "";

    return `${index + 1}. ${row.subject} Class ${row.classLevel}: "${row.topic}" (${scoreLabel})${summarySuffix}`;
  });

  return `Recent analyzed teaching sessions for this teacher:\n${lines.join("\n")}`;
}

export async function createConversation(
  clerkId: string,
): Promise<ChatConversation> {
  const conversationId = crypto.randomUUID();
  const contextSnapshot = await buildTeacherContextSnapshot(clerkId);
  const createdAt = new Date().toISOString();

  const [row] = await runWriteQuery<ConversationRow>(
    `
    MERGE (t:Teacher { clerkId: $clerkId })
    ON CREATE SET t.createdAt = datetime()
    CREATE (c:ChatConversation {
      conversationId: $conversationId,
      createdAt: datetime($createdAt),
      contextSnapshot: $contextSnapshot,
      teacherClerkId: $clerkId
    })
    CREATE (t)-[:HAS_CONVERSATION]->(c)
    RETURN c { .* } AS conversation
    `,
    { clerkId, conversationId, createdAt, contextSnapshot },
  );

  if (!row) {
    throw new Error("Failed to create ChatConversation in AuraDB");
  }

  const conversation = serializeNeo4jValue(row.conversation) as Record<
    string,
    unknown
  >;

  return {
    conversationId: String(conversation.conversationId),
    createdAt: String(conversation.createdAt ?? createdAt),
    contextSnapshot: String(conversation.contextSnapshot ?? contextSnapshot),
  };
}

export async function getConversationForTeacher(
  clerkId: string,
  conversationId: string,
): Promise<ChatConversation | null> {
  const [row] = await runReadQuery<ConversationRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:HAS_CONVERSATION]->(c:ChatConversation { conversationId: $conversationId })
    RETURN c { .* } AS conversation
    `,
    { clerkId, conversationId },
  );

  if (!row) {
    return null;
  }

  const conversation = serializeNeo4jValue(row.conversation) as Record<
    string,
    unknown
  >;

  return {
    conversationId: String(conversation.conversationId),
    createdAt: String(conversation.createdAt ?? ""),
    contextSnapshot: String(conversation.contextSnapshot ?? ""),
  };
}

export async function getLatestConversationForTeacher(
  clerkId: string,
): Promise<ChatConversation | null> {
  const [row] = await runReadQuery<ConversationRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:HAS_CONVERSATION]->(c:ChatConversation)
    RETURN c { .* } AS conversation
    ORDER BY c.createdAt DESC
    LIMIT 1
    `,
    { clerkId },
  );

  if (!row) {
    return null;
  }

  const conversation = serializeNeo4jValue(row.conversation) as Record<
    string,
    unknown
  >;

  return {
    conversationId: String(conversation.conversationId),
    createdAt: String(conversation.createdAt ?? ""),
    contextSnapshot: String(conversation.contextSnapshot ?? ""),
  };
}

export async function getOrCreateConversation(
  clerkId: string,
  conversationId?: string | null,
): Promise<ChatConversation> {
  const trimmedId = conversationId?.trim();

  if (trimmedId) {
    const existing = await getConversationForTeacher(clerkId, trimmedId);

    if (existing) {
      return existing;
    }

    return createConversation(clerkId);
  }

  const latest = await getLatestConversationForTeacher(clerkId);

  if (latest) {
    return latest;
  }

  return createConversation(clerkId);
}

/** Ensures a conversation node exists for the given id (used by voice transcript sync). */
export async function ensureConversationForTeacher(
  clerkId: string,
  conversationId: string,
): Promise<ChatConversation> {
  const existing = await getConversationForTeacher(clerkId, conversationId);

  if (existing) {
    return existing;
  }

  const contextSnapshot = await buildTeacherContextSnapshot(clerkId);
  const createdAt = new Date().toISOString();

  const [row] = await runWriteQuery<ConversationRow>(
    `
    MERGE (t:Teacher { clerkId: $clerkId })
    ON CREATE SET t.createdAt = datetime()
    MERGE (c:ChatConversation { conversationId: $conversationId })
    ON CREATE SET
      c.createdAt = datetime($createdAt),
      c.contextSnapshot = $contextSnapshot,
      c.teacherClerkId = $clerkId
    MERGE (t)-[:HAS_CONVERSATION]->(c)
    RETURN c { .* } AS conversation
    `,
    { clerkId, conversationId, createdAt, contextSnapshot },
  );

  if (!row) {
    throw new Error("Failed to ensure ChatConversation in AuraDB");
  }

  const conversation = serializeNeo4jValue(row.conversation) as Record<
    string,
    unknown
  >;

  return {
    conversationId: String(conversation.conversationId),
    createdAt: String(conversation.createdAt ?? createdAt),
    contextSnapshot: String(conversation.contextSnapshot ?? contextSnapshot),
  };
}

type ConversationSummaryRow = Readonly<{
  conversationId: string;
  createdAt: unknown;
  preview: string | null;
  displayTitle: string | null;
  messageCount: number | { toNumber: () => number };
}>;

function toTitle(preview: string): string {
  const line = preview.split("\n")[0]?.trim() ?? preview.trim();

  if (!line) {
    return "Chat";
  }

  return line.length > 42 ? `${line.slice(0, 39)}…` : line;
}

export async function listConversationsForTeacher(
  clerkId: string,
  limit = 30,
): Promise<ChatConversationSummary[]> {
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));

  const rows = await runReadQuery<ConversationSummaryRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:HAS_CONVERSATION]->(c:ChatConversation)
    OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:ChatMessage)
    WITH c, m
    ORDER BY m.createdAt ASC
    WITH c, collect(m) AS rawMessages
    WITH c, [msg IN rawMessages WHERE msg IS NOT NULL] AS messages
    WHERE size(messages) > 0
    WITH c, messages,
         head([msg IN messages WHERE msg.role = 'user' | msg.content]) AS userPreview,
         head([msg IN messages | msg.content]) AS firstPreview
    RETURN c.conversationId AS conversationId,
           c.createdAt AS createdAt,
           c.displayTitle AS displayTitle,
           size(messages) AS messageCount,
           coalesce(userPreview, firstPreview, '') AS preview
    ORDER BY c.createdAt DESC
    LIMIT $limit
    `,
    { clerkId, limit: safeLimit },
  );

  return rows.map((row) => {
    const preview = String(row.preview ?? "").trim();
    const customTitle = row.displayTitle?.trim() ?? "";
    const messageCount =
      typeof row.messageCount === "number"
        ? row.messageCount
        : row.messageCount.toNumber();

    return {
      conversationId: String(row.conversationId),
      createdAt: String(serializeNeo4jValue(row.createdAt) ?? ""),
      preview,
      title: customTitle || toTitle(preview),
      messageCount,
    };
  });
}

export async function updateConversationTitleForTeacher(
  clerkId: string,
  conversationId: string,
  title: string,
): Promise<string> {
  const trimmed = title.trim();

  if (!trimmed) {
    throw new Error("Title cannot be empty");
  }

  if (trimmed.length > 80) {
    throw new Error("Title must be 80 characters or fewer");
  }

  const [row] = await runWriteQuery<{ conversationId: string }>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:HAS_CONVERSATION]->(c:ChatConversation { conversationId: $conversationId })
    SET c.displayTitle = $title
    RETURN c.conversationId AS conversationId
    `,
    { clerkId, conversationId, title: trimmed },
  );

  if (!row) {
    throw new Error("Conversation not found");
  }

  return trimmed;
}

export async function deleteConversationForTeacher(
  clerkId: string,
  conversationId: string,
): Promise<boolean> {
  const [row] = await runWriteQuery<{ deletedCount: number | { toNumber: () => number } }>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:HAS_CONVERSATION]->(c:ChatConversation { conversationId: $conversationId })
    OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:ChatMessage)
    WITH c, collect(m) AS messages
    FOREACH (msg IN messages | DETACH DELETE msg)
    DETACH DELETE c
    RETURN 1 AS deletedCount
    `,
    { clerkId, conversationId },
  );

  if (!row) {
    return false;
  }

  const deletedCount =
    typeof row.deletedCount === "number"
      ? row.deletedCount
      : row.deletedCount.toNumber();

  return deletedCount > 0;
}

export async function listMessages(
  clerkId: string,
  conversationId: string,
  limit = 50,
): Promise<ChatMessage[]> {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  const rows = await runReadQuery<MessageRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:HAS_CONVERSATION]->(c:ChatConversation { conversationId: $conversationId })
    MATCH (c)-[:HAS_MESSAGE]->(m:ChatMessage)
    RETURN m { .* } AS message
    ORDER BY m.createdAt ASC
    LIMIT $limit
    `,
    { clerkId, conversationId, limit: safeLimit },
  );

  return rows.map((row) => {
    const message = serializeNeo4jValue(row.message) as Record<string, unknown>;

    return {
      messageId: String(message.messageId),
      role: message.role as ChatRole,
      content: String(message.content ?? ""),
      createdAt: String(message.createdAt ?? ""),
    };
  });
}

export async function appendMessage(
  clerkId: string,
  conversationId: string,
  role: ChatRole,
  content: string,
): Promise<ChatMessage> {
  const messageId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const [row] = await runWriteQuery<MessageRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:HAS_CONVERSATION]->(c:ChatConversation { conversationId: $conversationId })
    CREATE (m:ChatMessage {
      messageId: $messageId,
      role: $role,
      content: $content,
      createdAt: datetime($createdAt)
    })
    CREATE (c)-[:HAS_MESSAGE]->(m)
    RETURN m { .* } AS message
    `,
    { clerkId, conversationId, messageId, role, content, createdAt },
  );

  if (!row) {
    throw new Error("Failed to append ChatMessage in AuraDB");
  }

  const message = serializeNeo4jValue(row.message) as Record<string, unknown>;

  return {
    messageId: String(message.messageId),
    role: message.role as ChatRole,
    content: String(message.content ?? ""),
    createdAt: String(message.createdAt ?? createdAt),
  };
}
