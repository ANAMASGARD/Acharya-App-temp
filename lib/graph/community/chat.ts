import { runReadQuery, runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import neo4j from "neo4j-driver";
import type { CreateGroupMessageInput, GroupMessage } from "@/types/community";
import { upsertTeacherProfile } from "@/lib/graph/community/teacher-profile";

type MessageRow = Readonly<{
  message: Record<string, unknown>;
  author: Record<string, unknown> | null;
}>;

function mapMessageRow(row: MessageRow): GroupMessage {
  const message = serializeNeo4jValue(row.message) as Record<string, unknown>;
  const author = serializeNeo4jValue(row.author) as Record<string, unknown> | null;

  return {
    messageId: String(message.messageId ?? ""),
    body: String(message.body ?? ""),
    linkUrl: message.linkUrl ? String(message.linkUrl) : null,
    createdAt:
      typeof serializeNeo4jValue(message.createdAt) === "string"
        ? String(serializeNeo4jValue(message.createdAt))
        : new Date().toISOString(),
    authorClerkId: String(author?.clerkId ?? ""),
    authorDisplayName: String(author?.displayName ?? "Teacher"),
    authorAvatarLetter: String(author?.avatarLetter ?? "T"),
  };
}

export async function listGroupMessages(
  clerkId: string,
  groupId: string,
  limit = 50,
): Promise<GroupMessage[]> {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  const membership = await runReadQuery(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:MEMBER_OF]->(g:CommunityGroup { groupId: $groupId })
    RETURN g.groupId AS groupId
    LIMIT 1
    `,
    { clerkId, groupId },
  );

  if (membership.length === 0) {
    throw new Error("You must be a group member to view messages");
  }

  const rows = await runReadQuery<MessageRow>(
    `
    MATCH (g:CommunityGroup { groupId: $groupId })-[:HAS_MESSAGE]->(m:GroupMessage)
    OPTIONAL MATCH (author:Teacher)-[:AUTHORED]->(m)
    RETURN m { .* } AS message,
           author { .clerkId, .displayName, .avatarLetter } AS author
    ORDER BY m.createdAt ASC
    LIMIT $limit
    `,
    { groupId, limit: neo4j.int(safeLimit) },
  );

  return rows.map(mapMessageRow);
}

export async function createGroupMessage(
  clerkId: string,
  groupId: string,
  input: CreateGroupMessageInput,
): Promise<GroupMessage> {
  const messageId = crypto.randomUUID();

  await upsertTeacherProfile(clerkId, input.displayName);

  const membership = await runReadQuery(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:MEMBER_OF]->(g:CommunityGroup { groupId: $groupId })
    RETURN g.groupId AS groupId
    LIMIT 1
    `,
    { clerkId, groupId },
  );

  if (membership.length === 0) {
    throw new Error("You must be a group member to send messages");
  }

  await runWriteQuery(
    `
    MATCH (g:CommunityGroup { groupId: $groupId })
    MATCH (t:Teacher { clerkId: $clerkId })
    CREATE (m:GroupMessage {
      messageId: $messageId,
      body: $body,
      linkUrl: $linkUrl,
      createdAt: datetime()
    })
    CREATE (g)-[:HAS_MESSAGE]->(m)
    CREATE (t)-[:AUTHORED]->(m)
    `,
    {
      clerkId,
      groupId,
      messageId,
      body: input.body.trim(),
      linkUrl: input.linkUrl?.trim() || null,
    },
  );

  const rows = await runReadQuery<MessageRow>(
    `
    MATCH (m:GroupMessage { messageId: $messageId })
    OPTIONAL MATCH (author:Teacher)-[:AUTHORED]->(m)
    RETURN m { .* } AS message,
           author { .clerkId, .displayName, .avatarLetter } AS author
    `,
    { messageId },
  );

  const row = rows[0];

  if (!row) {
    throw new Error("Failed to create group message");
  }

  return mapMessageRow(row);
}
