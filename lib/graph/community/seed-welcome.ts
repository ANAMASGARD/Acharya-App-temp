import {
  ACHARYA_WELCOME_AUTHOR,
  ACHARYA_WELCOME_DEMO_SEED_ID,
  ACHARYA_WELCOME_POST,
} from "@/lib/graph/community/welcome-post-content";
import { runWriteQuery } from "@/lib/neo4j";

export { ACHARYA_WELCOME_DEMO_SEED_ID } from "@/lib/graph/community/welcome-post-content";

/** Always upsert the official Acharya welcome guide — visible to every user. */
export async function ensureAcharyaWelcomePost(): Promise<void> {
  await runWriteQuery(
    `
    MERGE (t:Teacher { clerkId: $authorClerkId })
    ON CREATE SET t.createdAt = datetime()
    SET t.displayName = $authorDisplayName,
        t.avatarLetter = $authorAvatarLetter
    MERGE (p:CommunityPost { demoSeedId: $demoSeedId })
    ON CREATE SET
      p.postId = randomUUID(),
      p.createdAt = datetime(),
      p.score = 0,
      p.commentCount = 0,
      p.demoSeed = true,
      p.demoWelcome = true,
      p.linkUrl = null
    SET p.title = $title,
        p.body = $body,
        p.subjectTag = $subjectTag,
        p.demoSeed = true,
        p.demoWelcome = true
    MERGE (t)-[:AUTHORED]->(p)
    `,
    {
      demoSeedId: ACHARYA_WELCOME_DEMO_SEED_ID,
      authorClerkId: ACHARYA_WELCOME_AUTHOR.clerkId,
      authorDisplayName: ACHARYA_WELCOME_AUTHOR.displayName,
      authorAvatarLetter: ACHARYA_WELCOME_AUTHOR.avatarLetter,
      title: ACHARYA_WELCOME_POST.title,
      body: ACHARYA_WELCOME_POST.body,
      subjectTag: ACHARYA_WELCOME_POST.subjectTag,
    },
  );
}
