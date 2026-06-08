import type { SessionNode } from "@/types/graph";
import type { TeachingReport } from "@/types/recorder";

export type CalendarSession = SessionNode;

export type SessionDetail = Readonly<{
  session: SessionNode;
  report: TeachingReport | null;
  transcriptPreview: string | null;
  classNotes: string | null;
}>;
