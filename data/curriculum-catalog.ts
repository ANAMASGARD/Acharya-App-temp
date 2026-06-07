import { RECORDER_CLASS_LEVELS, RECORDER_SUBJECTS } from "@/data/recorder-options";
import type { CurriculumClass } from "@/types/curriculum";

const SUBJECT_MAP = Object.fromEntries(
  RECORDER_SUBJECTS.map((subject) => [subject.id, subject.label]),
) as Record<string, string>;

const CLASS_SUBJECT_IDS: Record<string, readonly string[]> = {
  "class-7": ["mathematics", "science"],
  "class-8": ["mathematics", "science"],
  "class-9": ["mathematics", "science", "social-science"],
  "class-10": ["mathematics", "science", "social-science"],
  "class-11": ["physics", "chemistry", "mathematics"],
  "class-12": ["physics", "chemistry", "biology"],
};

const CLASS_IDS = new Set([
  "class-7",
  "class-8",
  "class-9",
  "class-10",
  "class-11",
  "class-12",
]);

function buildClass(classId: string, label: string): CurriculumClass {
  const subjectIds = CLASS_SUBJECT_IDS[classId] ?? [];

  return {
    id: classId,
    label,
    subjects: subjectIds.map((subjectId) => ({
      id: subjectId,
      label: SUBJECT_MAP[subjectId] ?? subjectId,
      status: "pending",
    })),
  };
}

export const CURRICULUM_CATALOG: readonly CurriculumClass[] =
  RECORDER_CLASS_LEVELS.filter((level) => CLASS_IDS.has(level.id)).map((level) =>
    buildClass(level.id, level.label),
  );
