import { runInWriteTransaction, runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import type { ManagedTransaction } from "neo4j-driver";
import type { VoteResponse, VoteValue } from "@/types/community";

type VoteRow = Readonly<{
  oldVote: unknown;
}>;

function toVoteValue(value: unknown): VoteValue | null {
  const serialized = serializeNeo4jValue(value);
  return serialized === 1 || serialized === -1 ? serialized : null;
}

function computeVoteDelta(
  oldVote: VoteValue | null,
  action: "up" | "down" | "remove",
): { delta: number; newVote: VoteValue | null; shouldChange: boolean } {
  if (action === "remove") {
    if (oldVote === 1) {
      return { delta: -1, newVote: null, shouldChange: true };
    }

    if (oldVote === -1) {
      return { delta: 1, newVote: null, shouldChange: true };
    }

    return { delta: 0, newVote: null, shouldChange: false };
  }

  const requested: VoteValue = action === "up" ? 1 : -1;

  if (oldVote === requested) {
    return { delta: 0, newVote: requested, shouldChange: false };
  }

  if (oldVote === null) {
    return { delta: requested, newVote: requested, shouldChange: true };
  }

  if (oldVote === 1 && requested === -1) {
    return { delta: -2, newVote: requested, shouldChange: true };
  }

  return { delta: 2, newVote: requested, shouldChange: true };
}

async function readOldVote(
  tx: ManagedTransaction,
  clerkId: string,
  postId: string,
): Promise<VoteValue | null> {
  const result = await tx.run(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[vote:VOTED]->(p:CommunityPost { postId: $postId })
    RETURN vote.value AS oldVote
    `,
    { clerkId, postId },
  );

  const row = result.records[0]?.toObject() as VoteRow | undefined;
  return row ? toVoteValue(row.oldVote) : null;
}

export async function setPostVote(
  clerkId: string,
  postId: string,
  action: "up" | "down" | "remove",
): Promise<VoteResponse> {
  return runInWriteTransaction(async (tx) => {
    const oldVote = await readOldVote(tx, clerkId, postId);
    const { delta, newVote, shouldChange } = computeVoteDelta(oldVote, action);

    if (!shouldChange) {
      const scoreResult = await tx.run(
        `
        MATCH (p:CommunityPost { postId: $postId })
        RETURN p.score AS score
        `,
        { postId },
      );
      const scoreRow = scoreResult.records[0]?.toObject() as
        | Readonly<{ score: unknown }>
        | undefined;

      return {
        score: Number(serializeNeo4jValue(scoreRow?.score) ?? 0),
        viewerVote: oldVote,
      };
    }

    if (action === "remove") {
      await tx.run(
        `
        MATCH (p:CommunityPost { postId: $postId })
        OPTIONAL MATCH (t:Teacher { clerkId: $clerkId })-[vote:VOTED]->(p)
        FOREACH (_ IN CASE WHEN vote IS NOT NULL THEN [1] ELSE [] END | DELETE vote)
        SET p.score = coalesce(p.score, 0) + $delta
        `,
        { clerkId, postId, delta },
      );
    } else {
      await tx.run(
        `
        MERGE (t:Teacher { clerkId: $clerkId })
        ON CREATE SET
          t.createdAt = datetime(),
          t.displayName = 'Teacher',
          t.avatarLetter = 'T'
        WITH t
        MATCH (p:CommunityPost { postId: $postId })
        MERGE (t)-[vote:VOTED]->(p)
        SET vote.value = $newVote,
            p.score = coalesce(p.score, 0) + $delta
        RETURN p.score AS score
        `,
        { clerkId, postId, newVote, delta },
      );
    }

    const scoreResult = await tx.run(
      `
      MATCH (p:CommunityPost { postId: $postId })
      RETURN p.score AS score
      `,
      { postId },
    );
    const scoreRow = scoreResult.records[0]?.toObject() as
      | Readonly<{ score: unknown }>
      | undefined;

    return {
      score: Number(serializeNeo4jValue(scoreRow?.score) ?? 0),
      viewerVote: newVote,
    };
  });
}

export async function togglePostSave(
  clerkId: string,
  postId: string,
  save: boolean,
): Promise<{ viewerSaved: boolean }> {
  if (save) {
    await runWriteQuery(
      `
      MERGE (t:Teacher { clerkId: $clerkId })
      ON CREATE SET
        t.createdAt = datetime(),
        t.displayName = 'Teacher',
        t.avatarLetter = 'T'
      WITH t
      MATCH (p:CommunityPost { postId: $postId })
      MERGE (t)-[:SAVED]->(p)
      `,
      { clerkId, postId },
    );
  } else {
    await runWriteQuery(
      `
      MERGE (t:Teacher { clerkId: $clerkId })
      ON CREATE SET
        t.createdAt = datetime(),
        t.displayName = 'Teacher',
        t.avatarLetter = 'T'
      WITH t
      OPTIONAL MATCH (t)-[saved:SAVED]->(p:CommunityPost { postId: $postId })
      FOREACH (_ IN CASE WHEN saved IS NOT NULL THEN [1] ELSE [] END | DELETE saved)
      `,
      { clerkId, postId },
    );
  }

  return { viewerSaved: save };
}
