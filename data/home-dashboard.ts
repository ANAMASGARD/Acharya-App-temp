import type { HomeDashboardContent } from "@/types/home-dashboard";

const HOME_DASHBOARD_CONTENT: HomeDashboardContent = {
  streakDays: 7,
  recentActivity: [
    {
      id: "activity-1",
      title: "Recent Activity",
      subtitle: "Class recording reviewed",
      timeAgo: "5 hours ago",
      avatarKind: "letter",
      avatarLetter: "R",
    },
    {
      id: "activity-2",
      title: "Veriya Sherna",
      subtitle: "Notes verification completed",
      timeAgo: "5 hours ago",
      avatarKind: "icon",
    },
  ],
  notesGaps: {
    title: "Verified Notes Gaps",
    body:
      "Review curriculum-aligned gaps from your latest notes upload. See corrections and suggestions before your next class.",
    ctaLabel: "Verified Notes Gaps",
  },
  startSession: {
    title: "Start New Class Session",
    body:
      "Tap to begin recording your class. Acharya will transcribe, analyze, and prepare a teaching report when you finish.",
  },
};

export function getHomeDashboardContent(): HomeDashboardContent {
  return HOME_DASHBOARD_CONTENT;
}

export const homeDashboardContent = HOME_DASHBOARD_CONTENT;
