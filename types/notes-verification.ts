export type VerificationGapVariant = "coral" | "coralLight" | "neutral";

export type VerificationGap = Readonly<{
  id: string;
  title: string;
  body: string;
  variant: VerificationGapVariant;
}>;

export type NotesUploadFile = Readonly<{
  name: string;
  uri: string;
  mimeType: string | null;
  sizeBytes: number | null;
}>;

export type NotesUploadError = "unsupported_type" | "pick_failed" | "too_large";
