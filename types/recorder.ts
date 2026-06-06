export type RecorderPipelineStatus =
  | "idle"
  | "starting"
  | "recording"
  | "stopping"
  | "draining"
  | "ready"
  | "analyzing"
  | "completed"
  | "failed";

export type ChunkUploadStatus = "pending" | "uploading" | "done" | "failed";

export type ChunkSttStatus =
  | "pending"
  | "processing"
  | "done"
  | "empty"
  | "failed";

export type RecorderChunk = Readonly<{
  index: number;
  localUri: string;
  uploadStatus: ChunkUploadStatus;
  sttStatus: ChunkSttStatus;
  text: string;
  auraAcked: boolean;
  localFileDeleted: boolean;
  chunkId?: string;
}>;

export type TeachingReport = Readonly<{
  classroomEnvironment: string;
  whatWentWrong: string;
  areasToImprove: string;
  topicSpecificFeedback: string;
}>;

export const TEACHING_REPORT_JSON_SCHEMA = {
  name: "teaching_report",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "classroomEnvironment",
      "whatWentWrong",
      "areasToImprove",
      "topicSpecificFeedback",
    ],
    properties: {
      classroomEnvironment: { type: "string" },
      whatWentWrong: { type: "string" },
      areasToImprove: { type: "string" },
      topicSpecificFeedback: { type: "string" },
    },
  },
} as const;

export type SttChunkResponse = Readonly<{
  chunkIndex: number;
  transcript: string;
  chunkId: string;
  languageCode?: string;
}>;

export type AnalyzeResponse =
  | Readonly<{ report: TeachingReport }>
  | Readonly<{ error: { code: string; message: string } }>;

export type OpenRouterErrorCode =
  | "auth_config"
  | "model_unavailable"
  | "provider_unreachable"
  | "rate_limit"
  | "timeout"
  | "schema_invalid"
  | "unknown";
