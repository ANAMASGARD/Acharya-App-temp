import { parseDateKey, toDateKey } from "@/lib/calendar/date-utils";

/**
 * Computes consecutive calendar-day teaching streak from distinct session dates.
 * Streak is active only if the teacher taught today or yesterday.
 */
export function computeTeachingStreak(sessionDateKeys: readonly string[]): number {
  if (sessionDateKeys.length === 0) {
    return 0;
  }

  const dateSet = new Set(sessionDateKeys);
  const today = new Date();
  const todayKey = toDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  let startKey: string | null = null;

  if (dateSet.has(todayKey)) {
    startKey = todayKey;
  } else if (dateSet.has(yesterdayKey)) {
    startKey = yesterdayKey;
  } else {
    return 0;
  }

  let streak = 0;
  const cursor = parseDateKey(startKey);

  while (dateSet.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
