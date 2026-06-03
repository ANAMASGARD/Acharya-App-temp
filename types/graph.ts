export type TeacherAnchor = Readonly<{
  clerkId: string;
  createdAt?: string;
}>;

export type SessionNode = Readonly<{
  sessionId: string;
  topic: string;
  subject: string;
  classLevel: string;
  recordedAt: string;
  durationSeconds: number;
  score?: number;
  teacherClerkId: string;
}>;

export type CreateSessionInput = Readonly<{
  topic: string;
  subject: string;
  classLevel: string;
  durationSeconds?: number;
  score?: number;
  recordedAt?: string;
}>;
