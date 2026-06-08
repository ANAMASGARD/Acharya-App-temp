import { generateJoinCode, normalizeJoinCode } from "@/lib/community/join-code";
import { runReadQuery, runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import type {
  CommunityGroup,
  CommunityGroupDetail,
  CommunityGroupMember,
  CreateGroupInput,
} from "@/types/community";
import { upsertTeacherProfile } from "@/lib/graph/community/teacher-profile";

type GroupRow = Readonly<{
  group: Record<string, unknown>;
  memberCount: unknown;
  isMember: unknown;
}>;

type MemberRow = Readonly<{
  clerkId: string;
  displayName: unknown;
  avatarLetter: unknown;
  role: unknown;
  joinedAt: unknown;
}>;

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

function mapGroupRow(row: GroupRow): CommunityGroup {
  const group = serializeNeo4jValue(row.group) as Record<string, unknown>;

  return {
    groupId: String(group.groupId ?? ""),
    name: String(group.name ?? ""),
    joinCode: String(group.joinCode ?? ""),
    description: String(group.description ?? ""),
    subjectTag: group.subjectTag ? String(group.subjectTag) : null,
    createdAt: toIsoString(group.createdAt),
    memberCount: toNumber(row.memberCount),
    isMember: Boolean(serializeNeo4jValue(row.isMember)),
  };
}

export async function listTeacherGroups(
  clerkId: string,
): Promise<CommunityGroup[]> {
  const rows = await runReadQuery<GroupRow>(
    `
    MATCH (g:CommunityGroup)
    OPTIONAL MATCH (member:Teacher)-[:MEMBER_OF]->(g)
    WITH g, count(member) AS memberCount
    OPTIONAL MATCH (viewer:Teacher { clerkId: $clerkId })-[:MEMBER_OF]->(g)
    RETURN g { .* } AS group,
           memberCount,
           viewer IS NOT NULL AS isMember
    ORDER BY g.createdAt DESC
    `,
    { clerkId },
  );

  return rows.map(mapGroupRow);
}

export async function getGroupDetail(
  clerkId: string,
  groupId: string,
): Promise<CommunityGroupDetail | null> {
  const rows = await runReadQuery<GroupRow>(
    `
    MATCH (g:CommunityGroup { groupId: $groupId })
    OPTIONAL MATCH (member:Teacher)-[:MEMBER_OF]->(g)
    WITH g, count(member) AS memberCount
    OPTIONAL MATCH (viewer:Teacher { clerkId: $clerkId })-[:MEMBER_OF]->(g)
    RETURN g { .* } AS group,
           memberCount,
           viewer IS NOT NULL AS isMember
    `,
    { clerkId, groupId },
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  const memberRows = await runReadQuery<MemberRow>(
    `
    MATCH (g:CommunityGroup { groupId: $groupId })<-[rel:MEMBER_OF]-(t:Teacher)
    RETURN t.clerkId AS clerkId,
           t.displayName AS displayName,
           t.avatarLetter AS avatarLetter,
           rel.role AS role,
           rel.joinedAt AS joinedAt
    ORDER BY rel.joinedAt ASC
    `,
    { groupId },
  );

  const members: CommunityGroupMember[] = memberRows.map((member) => ({
    clerkId: member.clerkId,
    displayName: String(serializeNeo4jValue(member.displayName) ?? "Teacher"),
    avatarLetter: String(serializeNeo4jValue(member.avatarLetter) ?? "T"),
    role: String(serializeNeo4jValue(member.role) ?? "member"),
    joinedAt: toIsoString(member.joinedAt),
  }));

  return {
    ...mapGroupRow(row),
    members,
  };
}

export async function createCommunityGroup(
  clerkId: string,
  input: CreateGroupInput,
): Promise<CommunityGroup> {
  const groupId = crypto.randomUUID();
  const joinCode = generateJoinCode();

  await upsertTeacherProfile(clerkId, input.displayName);

  await runWriteQuery(
    `
    MATCH (t:Teacher { clerkId: $clerkId })
    CREATE (g:CommunityGroup {
      groupId: $groupId,
      name: $name,
      joinCode: $joinCode,
      description: $description,
      subjectTag: $subjectTag,
      createdAt: datetime()
    })
    CREATE (t)-[:MEMBER_OF { role: 'owner', joinedAt: datetime() }]->(g)
    `,
    {
      clerkId,
      groupId,
      name: input.name.trim(),
      joinCode,
      description: input.description.trim(),
      subjectTag: input.subjectTag?.trim() || null,
    },
  );

  const detail = await getGroupDetail(clerkId, groupId);

  if (!detail) {
    throw new Error("Failed to create community group");
  }

  return detail;
}

export async function joinCommunityGroup(
  clerkId: string,
  rawJoinCode: string,
  displayName: string,
): Promise<CommunityGroup> {
  const joinCode = normalizeJoinCode(rawJoinCode);

  if (joinCode.length < 4) {
    throw new Error("Join code is too short");
  }

  await upsertTeacherProfile(clerkId, displayName);

  const rows = await runReadQuery<Readonly<{ groupId: string }>>(
    `
    MATCH (g:CommunityGroup { joinCode: $joinCode })
    MATCH (t:Teacher { clerkId: $clerkId })
    MERGE (t)-[rel:MEMBER_OF]->(g)
    ON CREATE SET rel.role = 'member', rel.joinedAt = datetime()
    RETURN g.groupId AS groupId
    `,
    { clerkId, joinCode },
  );

  const groupId = rows[0]?.groupId;

  if (!groupId) {
    throw new Error("Group not found for that join code");
  }

  const detail = await getGroupDetail(clerkId, groupId);

  if (!detail) {
    throw new Error("Failed to join community group");
  }

  return detail;
}
