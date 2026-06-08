import { runReadQuery, runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";

type DeleteRow = Readonly<{
  deleted: unknown;
}>;

function toCount(value: unknown): number {
  const serialized = serializeNeo4jValue(value);
  return typeof serialized === "number" ? serialized : 0;
}

export async function deleteCommunityPost(
  clerkId: string,
  postId: string,
): Promise<boolean> {
  const safePostId = postId.trim();

  if (!safePostId) {
    return false;
  }

  const rows = await runWriteQuery<DeleteRow>(
    `
    MATCH (p:CommunityPost { postId: $postId })
    OPTIONAL MATCH (author:Teacher)-[:AUTHORED]->(p)
    WITH p, author
    WHERE author.clerkId = $clerkId OR coalesce(p.demoSeed, false) = true
    OPTIONAL MATCH (p)-[:HAS_COMMENT]->(c:CommunityComment)
    OPTIONAL MATCH (p)-[:HAS_IMAGE]->(img:CommunityPostImage)
    DETACH DELETE c, img, p
    RETURN 1 AS deleted
    `,
    { clerkId, postId: safePostId },
  );

  return rows.length > 0;
}

export async function canDeleteCommunityPost(
  clerkId: string,
  postId: string,
): Promise<boolean> {
  const rows = await runReadQuery<Readonly<{ allowed: unknown }>>(
    `
    MATCH (p:CommunityPost { postId: $postId })
    OPTIONAL MATCH (author:Teacher)-[:AUTHORED]->(p)
    RETURN (author.clerkId = $clerkId OR coalesce(p.demoSeed, false) = true) AS allowed
    `,
    { clerkId, postId: postId.trim() },
  );

  return Boolean(serializeNeo4jValue(rows[0]?.allowed));
}
