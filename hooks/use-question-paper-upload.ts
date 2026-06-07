import {
  ACCEPTED_NOTE_MIMES,
  isAcceptedNotesFile,
  isWithinSizeLimit,
  MAX_NOTES_UPLOAD_BYTES,
  normalizeImageAsset,
  normalizePickerAsset,
} from "@/lib/notes-file-validation";
import type { NotesUploadError, NotesUploadFile } from "@/types/notes-verification";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";

type UseQuestionPaperUploadResult = Readonly<{
  selectedFile: NotesUploadFile | null;
  isPicking: boolean;
  error: NotesUploadError | null;
  pickDocument: () => Promise<void>;
  pickImage: () => Promise<void>;
  takePhoto: () => Promise<void>;
  clearFile: () => void;
  clearError: () => void;
}>;

function validateSize(sizeBytes: number | null | undefined): NotesUploadError | null {
  if (!isWithinSizeLimit(sizeBytes)) {
    return "too_large";
  }

  return null;
}

export function useQuestionPaperUpload(): UseQuestionPaperUploadResult {
  const [selectedFile, setSelectedFile] = useState<NotesUploadFile | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<NotesUploadError | null>(null);

  const pickDocument = useCallback(async (): Promise<void> => {
    if (isPicking) {
      return;
    }

    setIsPicking(true);
    setError(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...ACCEPTED_NOTE_MIMES],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const normalized = normalizePickerAsset(result.assets[0]);

      if (!isAcceptedNotesFile(normalized.name, normalized.mimeType)) {
        setError("unsupported_type");
        return;
      }

      const sizeError = validateSize(normalized.sizeBytes);
      if (sizeError) {
        setError(sizeError);
        return;
      }

      setSelectedFile(normalized);
    } catch {
      setError("pick_failed");
    } finally {
      setIsPicking(false);
    }
  }, [isPicking]);

  const pickImage = useCallback(async (): Promise<void> => {
    if (isPicking) {
      return;
    }

    setIsPicking(true);
    setError(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("pick_failed");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const normalized = normalizeImageAsset({
        uri: asset.uri,
        fileName: asset.fileName ?? `question-paper-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
        sizeBytes: asset.fileSize ?? null,
      });

      const sizeError = validateSize(normalized.sizeBytes);
      if (sizeError) {
        setError(sizeError);
        return;
      }

      setSelectedFile(normalized);
    } catch {
      setError("pick_failed");
    } finally {
      setIsPicking(false);
    }
  }, [isPicking]);

  const takePhoto = useCallback(async (): Promise<void> => {
    if (isPicking) {
      return;
    }

    setIsPicking(true);
    setError(null);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("pick_failed");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const normalized = normalizeImageAsset({
        uri: asset.uri,
        fileName: asset.fileName ?? `question-paper-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
        sizeBytes: asset.fileSize ?? null,
      });

      const sizeError = validateSize(normalized.sizeBytes);
      if (sizeError) {
        setError(sizeError);
        return;
      }

      setSelectedFile(normalized);
    } catch {
      setError("pick_failed");
    } finally {
      setIsPicking(false);
    }
  }, [isPicking]);

  const clearFile = useCallback((): void => {
    setSelectedFile(null);
    setError(null);
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    selectedFile,
    isPicking,
    error,
    pickDocument,
    pickImage,
    takePhoto,
    clearFile,
    clearError,
  };
}

export { MAX_NOTES_UPLOAD_BYTES };
