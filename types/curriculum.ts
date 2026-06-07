export type CurriculumSubjectStatus = "pending" | "ready";

export type CurriculumSubject = Readonly<{
  id: string;
  label: string;
  status: CurriculumSubjectStatus;
}>;

export type CurriculumClass = Readonly<{
  id: string;
  label: string;
  subjects: readonly CurriculumSubject[];
}>;

export type CurriculumSelection = Readonly<{
  classId: string;
  classLabel: string;
  subjectId: string;
  subjectLabel: string;
}>;
