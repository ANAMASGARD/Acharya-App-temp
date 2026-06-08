import { runWriteQuery } from "@/lib/neo4j";

export function resolveAvatarLetter(displayName: string): string {
  const trimmed = displayName.trim();
  return (trimmed.charAt(0) || "T").toUpperCase();
}

export async function upsertTeacherProfile(
  clerkId: string,
  displayName: string,
  imageUrl?: string | null,
): Promise<void> {
  const safeName = displayName.trim() || "Teacher";
  const avatarLetter = resolveAvatarLetter(safeName);
  const safeImageUrl = imageUrl?.trim() || null;

  await runWriteQuery(
    `
    MERGE (t:Teacher { clerkId: $clerkId })
    ON CREATE SET t.createdAt = datetime()
    SET t.displayName = $displayName,
        t.avatarLetter = $avatarLetter,
        t.imageUrl = CASE
          WHEN $imageUrl IS NOT NULL THEN $imageUrl
          ELSE t.imageUrl
        END
    `,
    { clerkId, displayName: safeName, avatarLetter, imageUrl: safeImageUrl },
  );
}
