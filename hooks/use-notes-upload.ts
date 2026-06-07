import {
  ACCEPTED_NOTE_MIMES,
  isAcceptedNotesFile,
  normalizePickerAsset,
} from "@/lib/notes-file-validation";
import type { NotesUploadError, NotesUploadFile } from "@/types/notes-verification";
import * as DocumentPicker from "expo-document-picker";
import { useCallback, useState } from "react";

type UseNotesUploadResult = Readonly<{
  selectedFile: NotesUploadFile | null;
  isPicking: boolean;
  error: NotesUploadError | null;
  canVerify: boolean;
  pickDocument: () => Promise<void>;
  clearFile: () => void;
  clearError: () => void;
}>;

export function useNotesUpload(): UseNotesUploadResult {
  const [selectedFile, setSelectedFile] = useState<NotesUploadFile | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<NotesUploadError | null>(null);

  const canVerify = false;

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
    canVerify,
    pickDocument,
    clearFile,
    clearError,
  };
}
