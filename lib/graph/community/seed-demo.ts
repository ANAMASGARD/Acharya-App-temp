import { getOpenRouterConfig } from "@/lib/ai-config";
import { runReadQuery, runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";

type DemoPostSpec = Readonly<{
  demoSeedId: string;
  authorClerkId: string;
  authorDisplayName: string;
  authorAvatarLetter: string;
  title: string;
  body: string;
  subjectTag: string;
  score: number;
  commentCount: number;
  hoursAgo: number;
}>;

type CountRow = Readonly<{
  count: unknown;
}>;

const DEMO_SEED_ENABLED = process.env.COMMUNITY_DEMO_SEED === "true";

let seedInFlight: Promise<void> | null = null;

function toCount(value: unknown): number {
  const serialized = serializeNeo4jValue(value);
  return typeof serialized === "number" ? serialized : 0;
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();

  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    return JSON.parse(withoutFence);
  }

  return JSON.parse(trimmed);
}

function isDemoPostArray(value: unknown): value is DemoPostSpec[] {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  return value.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const record = item as Record<string, unknown>;
    return (
      typeof record.demoSeedId === "string" &&
      typeof record.authorClerkId === "string" &&
      typeof record.authorDisplayName === "string" &&
      typeof record.title === "string" &&
      typeof record.body === "string" &&
      typeof record.subjectTag === "string"
    );
  });
}

async function countRealCommunityPosts(): Promise<number> {
  const [row] = await runReadQuery<CountRow>(
    `
    MATCH (p:CommunityPost)
    WHERE coalesce(p.demoSeed, false) = false
    RETURN count(p) AS count
    `,
  );

  return toCount(row?.count);
}

async function countDemoSeedPosts(): Promise<number> {
  const [row] = await runReadQuery<CountRow>(
    `
    MATCH (p:CommunityPost)
    WHERE p.demoSeed = true
    RETURN count(p) AS count
    `,
  );

  return toCount(row?.count);
}

function fallbackDemoPosts(): DemoPostSpec[] {
  return [
    {
      demoSeedId: "demo-post-fractions-class6",
      authorClerkId: "demo:teacher:rani",
      authorDisplayName: "Rani",
      authorAvatarLetter: "R",
      title: "Teaching fractions effectively to Class 6 students",
      body:
        "I use paper folding and chapati-cutting demos before moving to the number line. Students grasp half and quarter faster when they see it in the kitchen first. What low-cost props do you use in your classroom?",
      subjectTag: "Mathematics",
      score: 42,
      commentCount: 3,
      hoursAgo: 3,
    },
    {
      demoSeedId: "demo-post-rural-science",
      authorClerkId: "demo:teacher:priya",
      authorDisplayName: "Priya",
      authorAvatarLetter: "P",
      title: "Low-cost science experiments for rural schools",
      body:
        "We built a simple water filter with sand, gravel, and a plastic bottle. Class 7 students tested turbidity before and after. Total cost was under ₹50 per group. Happy to share the worksheet I made in Hindi and English.",
      subjectTag: "Science",
      score: 38,
      commentCount: 5,
      hoursAgo: 5,
    },
    {
      demoSeedId: "demo-post-corcec-circle",
      authorClerkId: "demo:teacher:meena",
      authorDisplayName: "Meena",
      authorAvatarLetter: "M",
      title: "CORCEC reading circle ideas for mixed-age groups",
      body:
        "Our cluster runs a weekly CORCEC circle where older students read aloud and younger ones draw the story. Engagement went up once we let students pick folktales from their own district. Anyone else blending CORCEC with local language stories?",
      subjectTag: "CORCEC",
      score: 29,
      commentCount: 2,
      hoursAgo: 7,
    },
    {
      demoSeedId: "demo-post-engagement-tips",
      authorClerkId: "demo:teacher:anita",
      authorDisplayName: "Anita",
      authorAvatarLetter: "A",
      title: "Quick checks that keep the whole class listening",
      body:
        "Every 15 minutes I ask one student to explain the last idea in one sentence. It takes two minutes and stops the back-row drift. Pair it with a thumbs-up / thumbs-down check before you move on.",
      subjectTag: "General",
      score: 21,
      commentCount: 1,
      hoursAgo: 2,
    },
    {
      demoSeedId: "demo-post-hindi-grammar",
      authorClerkId: "demo:teacher:kavita",
      authorDisplayName: "Kavita",
      authorAvatarLetter: "K",
      title: "Making Hindi grammar less scary for Class 8",
      body:
        "I teach one grammar rule through a short dialogue students write themselves, then we underline the verb forms together. They remember it better than copying rules from the textbook. Would love more dialogue prompts if you have them.",
      subjectTag: "Hindi",
      score: 17,
      commentCount: 0,
      hoursAgo: 6,
    },
  ];
}

async function generateDemoPostsWithLlm(): Promise<DemoPostSpec[]> {
  const { apiKey, model } = getOpenRouterConfig();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate realistic Indian teacher community forum posts for a school app. Return JSON only.",
        },
        {
          role: "user",
          content: `Generate exactly 5 teacher community posts as JSON object { "posts": [...] }.
Each post must have:
- demoSeedId (unique snake-case id)
- authorClerkId (format demo:teacher:firstname)
- authorDisplayName (Indian first name)
- authorAvatarLetter (first letter uppercase)
- title (specific teaching topic, no lorem ipsum)
- body (2-4 practical sentences)
- subjectTag (Mathematics, Science, CORCEC, Hindi, or General)
- score (integer 12-48)
- commentCount (integer 0-6)
- hoursAgo (integer 1-8)

Topics should feel like real teacher discussions: fractions, rural science labs, CORCEC reading, classroom engagement, grammar tips.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter demo seed failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenRouter demo seed returned empty content");
  }

  const parsed = parseJsonContent(content) as { posts?: unknown };
  const posts = Array.isArray(parsed.posts) ? parsed.posts : parsed;

  if (!isDemoPostArray(posts)) {
    throw new Error("OpenRouter demo seed returned invalid post shape");
  }

  return posts.map((post) => ({
    ...post,
    authorAvatarLetter:
      post.authorAvatarLetter ||
      post.authorDisplayName.charAt(0).toUpperCase() ||
      "T",
    score: Math.max(0, Math.floor(post.score ?? 0)),
    commentCount: Math.max(0, Math.floor(post.commentCount ?? 0)),
    hoursAgo: Math.max(1, Math.floor(post.hoursAgo ?? 1)),
  }));
}

async function writeDemoPosts(posts: readonly DemoPostSpec[]): Promise<void> {
  await runWriteQuery(
    `
    UNWIND $posts AS item
    MERGE (t:Teacher { clerkId: item.authorClerkId })
    ON CREATE SET t.createdAt = datetime()
    SET t.displayName = item.authorDisplayName,
        t.avatarLetter = item.authorAvatarLetter
    MERGE (p:CommunityPost { demoSeedId: item.demoSeedId })
    ON CREATE SET
      p.postId = randomUUID(),
      p.createdAt = datetime() - duration({hours: item.hoursAgo})
    SET p.title = item.title,
        p.body = item.body,
        p.subjectTag = item.subjectTag,
        p.score = item.score,
        p.commentCount = item.commentCount,
        p.demoSeed = true,
        p.linkUrl = null
    MERGE (t)-[:AUTHORED]->(p)
    `,
    {
      posts: posts.map((post) => ({
        demoSeedId: post.demoSeedId,
        authorClerkId: post.authorClerkId,
        authorDisplayName: post.authorDisplayName,
        authorAvatarLetter: post.authorAvatarLetter,
        title: post.title,
        body: post.body,
        subjectTag: post.subjectTag,
        score: post.score,
        commentCount: post.commentCount,
        hoursAgo: post.hoursAgo,
      })),
    },
  );
}

async function runDemoSeed(): Promise<void> {
  if (!DEMO_SEED_ENABLED) {
    return;
  }

  const realCount = await countRealCommunityPosts();
  if (realCount > 0) {
    return;
  }

  const demoCount = await countDemoSeedPosts();
  if (demoCount > 0) {
    return;
  }

  let posts: DemoPostSpec[];

  try {
    posts = await generateDemoPostsWithLlm();
  } catch {
    posts = fallbackDemoPosts();
  }

  await writeDemoPosts(posts);
}

export async function seedDemoCommunityPostsIfNeeded(): Promise<void> {
  if (!DEMO_SEED_ENABLED) {
    return;
  }

  if (!seedInFlight) {
    seedInFlight = runDemoSeed().finally(() => {
      seedInFlight = null;
    });
  }

  await seedInFlight;
}
