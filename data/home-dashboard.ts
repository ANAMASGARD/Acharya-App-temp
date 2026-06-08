import type { HomeDashboardContent } from "@/types/home-dashboard";

/** Static copy only — Home screen uses live Aura data via use-home-dashboard. */
const HOME_DASHBOARD_CONTENT: HomeDashboardContent = {
  stats: null,
  recentActivity: [],
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
