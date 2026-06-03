export type ActivityAvatarKind = "letter" | "icon";

export type RecentActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  timeAgo: string;
  avatarKind: ActivityAvatarKind;
  avatarLetter?: string;
};

export type NotesGapsContent = {
  title: string;
  body: string;
  ctaLabel: string;
};

export type StartSessionContent = {
  title: string;
  body: string;
};

export type HomeDashboardContent = {
  streakDays: number;
  recentActivity: RecentActivityItem[];
  notesGaps: NotesGapsContent;
  startSession: StartSessionContent;
};
