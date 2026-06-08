import { runReadQuery, runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import neo4j from "neo4j-driver";
import type {
  CommunityPost,
  CommunityPostImage,
  CreatePostInput,
} from "@/types/community";
import { upsertTeacherProfile } from "@/lib/graph/community/teacher-profile";

type PostRow = Readonly<{
  post: Record<string, unknown>;
  author: Record<string, unknown> | null;
  viewerVote: unknown;
  viewerSaved: unknown;
  groupId: unknown;
  groupName: unknown;
  images: unknown;
}>;

function mapPostImages(value: unknown): CommunityPostImage[] {
  const serialized = serializeNeo4jValue(value);

  if (!Array.isArray(serialized)) {
    return [];
  }

  return serialized
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const image = item as Record<string, unknown>;
      const imageId = String(image.imageId ?? "").trim();

      if (!imageId || imageId === "null") {
        return null;
      }

      return {
        imageId,
        mimeType: String(image.mimeType ?? "image/jpeg"),
        fileName: String(image.fileName ?? "image"),
        sortOrder: toNumber(image.sortOrder),
      };
    })
    .filter((item): item is CommunityPostImage => item !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function toIsoString(value: unknown): string {
  const serialized = serializeNeo4jValue(value);
  return typeof serialized === "string" ? serialized : new Date().toISOString();
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  return 0;
}

function mapPostRow(row: PostRow, viewerClerkId: string): CommunityPost {
  const post = serializeNeo4jValue(row.post) as Record<string, unknown>;
  const author = serializeNeo4jValue(row.author) as Record<string, unknown> | null;

  const viewerVoteRaw = serializeNeo4jValue(row.viewerVote);
  const viewerVote =
    viewerVoteRaw === 1 || viewerVoteRaw === -1 ? viewerVoteRaw : null;

  return {
    postId: String(post.postId ?? ""),
    title: String(post.title ?? ""),
    body: String(post.body ?? ""),
    subjectTag: String(post.subjectTag ?? "General"),
    linkUrl: post.linkUrl ? String(post.linkUrl) : null,
    images: mapPostImages(row.images),
    demoSeed: Boolean(post.demoSeed),
    demoWelcome: Boolean(post.demoWelcome),
    score: toNumber(post.score),
    commentCount: toNumber(post.commentCount),
    createdAt: toIsoString(post.createdAt),
    authorClerkId: String(author?.clerkId ?? ""),
    authorDisplayName: String(author?.displayName ?? "Teacher"),
    authorAvatarLetter: String(author?.avatarLetter ?? "T"),
    authorImageUrl: author?.imageUrl ? String(author.imageUrl) : null,
    groupId: row.groupId ? String(serializeNeo4jValue(row.groupId)) : null,
    groupName: row.groupName ? String(serializeNeo4jValue(row.groupName)) : null,
    viewerVote,
    viewerSaved: Boolean(serializeNeo4jValue(row.viewerSaved)),
  };
}

export async function listCommunityPosts(
  clerkId: string,
  options: Readonly<{ limit?: number; groupId?: string | null }> = {},
): Promise<CommunityPost[]> {
  const safeLimit = Math.min(50, Math.max(1, Math.floor(options.limit ?? 20)));
  const groupId = options.groupId?.trim() || null;

  const rows = await runReadQuery<PostRow>(
    `
    MATCH (p:CommunityPost)
    OPTIONAL MATCH (author:Teacher)-[:AUTHORED]->(p)
    OPTIONAL MATCH (viewer:Teacher { clerkId: $clerkId })-[vote:VOTED]->(p)
    OPTIONAL MATCH (viewer)-[saved:SAVED]->(p)
    OPTIONAL MATCH (p)-[:IN_GROUP]->(g:CommunityGroup)
    WHERE ($groupId IS NULL OR g.groupId = $groupId)
    OPTIONAL MATCH (p)-[:HAS_IMAGE]->(img:CommunityPostImage)
    WITH p, author, vote, saved, g, img
    ORDER BY img.sortOrder ASC
    WITH p, author, vote, saved, g,
         collect(
           CASE
             WHEN img IS NULL THEN null
             ELSE img { .imageId, .mimeType, .fileName, .sortOrder }
           END
         ) AS images
    RETURN p { .* } AS post,
           author { .clerkId, .displayName, .avatarLetter, .imageUrl } AS author,
           vote.value AS viewerVote,
           saved IS NOT NULL AS viewerSaved,
           g.groupId AS groupId,
           g.name AS groupName,
           images
    ORDER BY coalesce(p.demoWelcome, false) DESC, p.createdAt DESC
    LIMIT $limit
    `,
    { clerkId, groupId, limit: neo4j.int(safeLimit) },
  );

  return rows.map((row) => mapPostRow(row, clerkId));
}

export async function getCommunityPost(
  clerkId: string,
  postId: string,
): Promise<CommunityPost | null> {
  const rows = await runReadQuery<PostRow>(
    `
    MATCH (p:CommunityPost { postId: $postId })
    OPTIONAL MATCH (author:Teacher)-[:AUTHORED]->(p)
    OPTIONAL MATCH (viewer:Teacher { clerkId: $clerkId })-[vote:VOTED]->(p)
    OPTIONAL MATCH (viewer)-[saved:SAVED]->(p)
    OPTIONAL MATCH (p)-[:IN_GROUP]->(g:CommunityGroup)
    OPTIONAL MATCH (p)-[:HAS_IMAGE]->(img:CommunityPostImage)
    WITH p, author, vote, saved, g, img
    ORDER BY img.sortOrder ASC
    WITH p, author, vote, saved, g,
         collect(
           CASE
             WHEN img IS NULL THEN null
             ELSE img { .imageId, .mimeType, .fileName, .sortOrder }
           END
         ) AS images
    RETURN p { .* } AS post,
           author { .clerkId, .displayName, .avatarLetter, .imageUrl } AS author,
           vote.value AS viewerVote,
           saved IS NOT NULL AS viewerSaved,
           g.groupId AS groupId,
           g.name AS groupName,
           images
    LIMIT 1
    `,
    { clerkId, postId },
  );

  const row = rows[0];
  return row ? mapPostRow(row, clerkId) : null;
}

export async function createCommunityPost(
  clerkId: string,
  input: CreatePostInput,
): Promise<CommunityPost> {
  const postId = crypto.randomUUID();
  const groupId = input.groupId?.trim() || null;

  await upsertTeacherProfile(clerkId, input.displayName, input.imageUrl);

  const images = input.images ?? [];

  await runWriteQuery(
    `
    MATCH (t:Teacher { clerkId: $clerkId })
    CREATE (p:CommunityPost {
      postId: $postId,
      title: $title,
      body: $body,
      subjectTag: $subjectTag,
      linkUrl: $linkUrl,
      score: 0,
      commentCount: 0,
      createdAt: datetime()
    })
    CREATE (t)-[:AUTHORED]->(p)
    WITH p
    OPTIONAL MATCH (g:CommunityGroup { groupId: $groupId })
    WHERE $groupId IS NOT NULL
    FOREACH (_ IN CASE WHEN g IS NOT NULL THEN [1] ELSE [] END |
      CREATE (p)-[:IN_GROUP]->(g)
    )
    `,
    {
      clerkId,
      postId,
      title: input.title.trim(),
      body: input.body.trim(),
      subjectTag: input.subjectTag.trim() || "General",
      linkUrl: input.linkUrl?.trim() || null,
      groupId,
    },
  );

  if (images.length > 0) {
    await runWriteQuery(
      `
      MATCH (p:CommunityPost { postId: $postId })
      UNWIND $images AS image
      CREATE (img:CommunityPostImage {
        imageId: image.imageId,
        mimeType: image.mimeType,
        fileName: image.fileName,
        sortOrder: image.sortOrder
      })
      CREATE (p)-[:HAS_IMAGE]->(img)
      `,
      {
        postId,
        images: images.map((image) => ({
          imageId: image.imageId,
          mimeType: image.mimeType,
          fileName: image.fileName,
          sortOrder: neo4j.int(image.sortOrder),
        })),
      },
    );
  }

  const post = await getCommunityPost(clerkId, postId);

  if (!post) {
    throw new Error("Failed to create community post");
  }

  return post;
}
