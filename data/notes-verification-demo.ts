import type { VerificationGap } from "@/types/notes-verification";

export const DEMO_VERIFICATION_GAPS: readonly VerificationGap[] = [
  {
    id: "gap-1",
    title: "Curriculum Gaps",
    body: "Your notes mention photosynthesis but skip the role of chlorophyll in light-dependent reactions.",
    variant: "coral",
  },
  {
    id: "gap-2",
    title: "Verification Suggestions",
    body: "Add a short example comparing C3 and C4 pathways to align with the NCERT chapter sequence.",
    variant: "coralLight",
  },
  {
    id: "gap-3",
    title: "Terminology Check",
    body: "Use 'stomatal conductance' instead of 'stomata opening rate' to match the reference textbook.",
    variant: "neutral",
  },
] as const;
