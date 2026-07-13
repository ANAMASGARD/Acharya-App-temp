import { computeTeachingStreak } from "@/lib/dashboard/streak";
import { toDateKey } from "@/lib/calendar/date-utils";
import { runReadQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import type { DashboardActivityItem, DashboardResponse } from "@/types/community";

type StatsRow = Readonly<{
  classesThisWeek: unknown;
  classesThisMonth: unknown;
  notesVerifiedCount: unknown;
  averageScore: unknown;
}>;

type SessionDateRow = Readonly<{
  sessionDate: unknown;
}>;

type SessionActivityRow = Readonly<{
  sessionId: string;
  topic: string;
  subject: string;
  classLevel: string;
  recordedAt: unknown;
}>;

type VerificationActivityRow = Readonly<{
  verificationId: string;
  mode: string;
  subject: string;
  classLevel: string;
  createdAt: unknown;
}>;

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

function toIsoString(value: unknown): string {
  const serialized = serializeNeo4jValue(value);

  if (typeof serialized === "string") {
    return serialized;
  }

  return new Date().toISOString();
}

function toDateKeyFromNeo4j(value: unknown): string | null {
  const iso = toIsoString(value);
  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toDateKey(parsed);
}

export async function getTeacherDashboard(
  clerkId: string,
  activityLimit = 5,
): Promise<DashboardResponse> {
  const safeLimit = Math.min(20, Math.max(1, Math.floor(activityLimit)));

  const [statsRow] = await runReadQuery<StatsRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })
    OPTIONAL MATCH (t)-[:TAUGHT]->(s:Session)
    WITH t,
         count(CASE WHEN s.recordedAt >= datetime() - duration({days: 7}) THEN 1 END) AS classesThisWeek,
         count(CASE WHEN date(s.recordedAt) >= date(datetime({year: date().year, month: date().month, day: 1})) THEN 1 END) AS classesThisMonth,
         avg(CASE WHEN s.score IS NOT NULL THEN s.score END) AS averageScore
    OPTIONAL MATCH (t)-[:REQUESTED]->(v:VerificationReport)
    WITH classesThisWeek, classesThisMonth, averageScore, count(v) AS notesVerifiedCount
    RETURN classesThisWeek,
           classesThisMonth,
           notesVerifiedCount,
           averageScore
    `,
    { clerkId },
  );

  const sessionDateRows = await runReadQuery<SessionDateRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session)
    WHERE s.recordedAt >= datetime() - duration({days: 90})
    RETURN DISTINCT date(s.recordedAt) AS sessionDate
    ORDER BY sessionDate DESC
    `,
    { clerkId },
  );

  const sessionDateKeys = sessionDateRows
    .map((row) => toDateKeyFromNeo4j(row.sessionDate))
    .filter((key): key is string => key !== null);

  const streakDays = computeTeachingStreak(sessionDateKeys);

  const sessionRows = await runReadQuery<SessionActivityRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session)-[:HAS_REPORT]->(:Report)
    RETURN s.sessionId AS sessionId,
           s.topic AS topic,
           s.subject AS subject,
           s.classLevel AS classLevel,
           s.recordedAt AS recordedAt
    ORDER BY s.recordedAt DESC
    LIMIT $limit
    `,
    { clerkId, limit: safeLimit },
  );

  const verificationRows = await runReadQuery<VerificationActivityRow>(
    `
    MATCH (t:Teacher { clerkId: $clerkId })-[:REQUESTED]->(v:VerificationReport)
    RETURN v.verificationId AS verificationId,
           v.mode AS mode,
           v.subject AS subject,
           v.classLevel AS classLevel,
           v.createdAt AS createdAt
    ORDER BY v.createdAt DESC
    LIMIT $limit
    `,
    { clerkId, limit: safeLimit },
  );

  const sessionActivity: DashboardActivityItem[] = sessionRows.map((row) => ({
    id: row.sessionId,
    kind: "session",
    title: row.topic,
    subtitle: `${row.subject} · Class ${row.classLevel}`,
    occurredAt: toIsoString(row.recordedAt),
    deepLink: "/(tabs)/calendar",
  }));

  const verificationActivity: DashboardActivityItem[] = verificationRows.map(
    (row) => ({
      id: row.verificationId,
      kind: "verification",
      title:
        row.mode === "verify"
          ? "Verified question paper"
          : "Generated question paper",
      subtitle: `${row.subject} · Class ${row.classLevel}`,
      occurredAt: toIsoString(row.createdAt),
      deepLink: row.mode === "verify" ? "/notes/upload" : "/notes/generate",
    }),
  );

  const recentActivity = [...sessionActivity, ...verificationActivity]
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime(),
    )
    .slice(0, safeLimit);

  return {
    stats: {
      classesThisWeek: toNumber(statsRow?.classesThisWeek),
      classesThisMonth: toNumber(statsRow?.classesThisMonth),
      notesVerifiedCount: toNumber(statsRow?.notesVerifiedCount),
      averageScore:
        statsRow?.averageScore === null || statsRow?.averageScore === undefined
          ? null
          : Math.round(toNumber(statsRow.averageScore)),
      streakDays,
    },
    recentActivity,
  };
}
