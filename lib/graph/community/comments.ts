import { runReadQuery, runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import type { CommunityComment, CreateCommentInput } from "@/types/community";
import { upsertTeacherProfile } from "@/lib/graph/community/teacher-profile";

type CommentRow = Readonly<{
  comment: Record<string, unknown>;
  author: Record<string, unknown> | null;
}>;

function mapCommentRow(row: CommentRow): CommunityComment {
  const comment = serializeNeo4jValue(row.comment) as Record<string, unknown>;
  const author = serializeNeo4jValue(row.author) as Record<string, unknown> | null;

  return {
    commentId: String(comment.commentId ?? ""),
    body: String(comment.body ?? ""),
    createdAt:
      typeof serializeNeo4jValue(comment.createdAt) === "string"
        ? String(serializeNeo4jValue(comment.createdAt))
        : new Date().toISOString(),
    authorClerkId: String(author?.clerkId ?? ""),
    authorDisplayName: String(author?.displayName ?? "Teacher"),
    authorAvatarLetter: String(author?.avatarLetter ?? "T"),
  };
}

export async function listPostComments(
  postId: string,
  limit = 50,
): Promise<CommunityComment[]> {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  const rows = await runReadQuery<CommentRow>(
    `
    MATCH (p:CommunityPost { postId: $postId })-[:HAS_COMMENT]->(c:CommunityComment)
    OPTIONAL MATCH (author:Teacher)-[:AUTHORED]->(c)
    RETURN c { .* } AS comment,
           author { .clerkId, .displayName, .avatarLetter } AS author
    ORDER BY c.createdAt ASC
    LIMIT $limit
    `,
    { postId, limit: safeLimit },
  );

  return rows.map(mapCommentRow);
}

export async function createPostComment(
  clerkId: string,
  postId: string,
  input: CreateCommentInput,
): Promise<CommunityComment> {
  const commentId = crypto.randomUUID();

  await upsertTeacherProfile(clerkId, input.displayName);

  await runWriteQuery(
    `
    MATCH (t:Teacher { clerkId: $clerkId })
    MATCH (p:CommunityPost { postId: $postId })
    CREATE (c:CommunityComment {
      commentId: $commentId,
      body: $body,
      createdAt: datetime()
    })
    CREATE (t)-[:AUTHORED]->(c)
    CREATE (p)-[:HAS_COMMENT]->(c)
    SET p.commentCount = coalesce(p.commentCount, 0) + 1
    `,
    {
      clerkId,
      postId,
      commentId,
      body: input.body.trim(),
    },
  );

  const rows = await runReadQuery<CommentRow>(
    `
    MATCH (c:CommunityComment { commentId: $commentId })
    OPTIONAL MATCH (author:Teacher)-[:AUTHORED]->(c)
    RETURN c { .* } AS comment,
           author { .clerkId, .displayName, .avatarLetter } AS author
    `,
    { commentId },
  );

  const row = rows[0];

  if (!row) {
    throw new Error("Failed to create comment");
  }

  return mapCommentRow(row);
}
