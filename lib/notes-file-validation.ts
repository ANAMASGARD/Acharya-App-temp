import type { DocumentPickerAsset } from "expo-document-picker";

import type { NotesUploadFile } from "@/types/notes-verification";

export const ACCEPTED_NOTE_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

export const ACCEPTED_NOTE_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-word",
] as const;

function getExtension(name: string): string {
  const dotIndex = name.lastIndexOf(".");

  if (dotIndex < 0) {
    return "";
  }

  return name.slice(dotIndex).toLowerCase();
}

function matchesAcceptedExtension(name: string): boolean {
  const extension = getExtension(name);

  return ACCEPTED_NOTE_EXTENSIONS.some((accepted) => accepted === extension);
}

function matchesAcceptedMime(mimeType: string | null | undefined): boolean {
  if (!mimeType) {
    return false;
  }

  const normalized = mimeType.toLowerCase();

  return ACCEPTED_NOTE_MIMES.some(
    (accepted) => accepted === normalized || normalized.startsWith(`${accepted};`),
  );
}

export function isAcceptedNotesFile(
  name: string,
  mimeType?: string | null,
): boolean {
  return matchesAcceptedExtension(name) || matchesAcceptedMime(mimeType);
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function normalizePickerAsset(
  asset: DocumentPickerAsset,
): NotesUploadFile {
  const mimeType =
    asset.mimeType ??
    (asset.file?.type && asset.file.type.length > 0 ? asset.file.type : null);

  const sizeBytes =
    typeof asset.size === "number"
      ? asset.size
      : typeof asset.file?.size === "number"
        ? asset.file.size
        : null;

  return {
    name: asset.name,
    uri: asset.uri,
    mimeType,
    sizeBytes,
  };
}

export function getNotesUploadErrorMessage(
  error: "unsupported_type" | "pick_failed" | "too_large",
): string {
  switch (error) {
    case "unsupported_type":
      return "Please upload a PDF or Word document.";
    case "too_large":
      return "This file is too large. Try a smaller document.";
    case "pick_failed":
    default:
      return "Could not open the file picker. Please try again.";
  }
}
