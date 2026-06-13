import { apiMultipartFetch } from "@/lib/api-client";
import type { CurriculumSelection } from "@/types/curriculum";
import type { NotesUploadFile } from "@/types/notes-verification";
import type { QuestionPaperVerifyResult } from "@/types/question-paper";
import { useAuth } from "@clerk/expo";
import { useCallback, useMemo, useRef, useState } from "react";

type UseQuestionPaperVerifyResult = Readonly<{
  canVerify: boolean;
  isVerifying: boolean;
  error: string | null;
  result: QuestionPaperVerifyResult | null;
  verify: () => Promise<void>;
  clearResult: () => void;
}>;

export function useQuestionPaperVerify(input: {
  selectedFile: NotesUploadFile | null;
  selection: CurriculumSelection | null;
  selectedBookIds: readonly string[];
  selectedChapterIds?: readonly string[];
}): UseQuestionPaperVerifyResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionPaperVerifyResult | null>(null);

  const canVerify = useMemo(
    () =>
      Boolean(
        input.selectedFile &&
          input.selection &&
          input.selectedBookIds.length > 0 &&
          !isVerifying,
      ),
    [input.selectedBookIds.length, input.selectedFile, input.selection, isVerifying],
  );

  const verify = useCallback(async (): Promise<void> => {
    if (!input.selectedFile || !input.selection || input.selectedBookIds.length === 0) {
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const token = await getTokenRef.current();
      const formData = new FormData();

      formData.append("file", {
        uri: input.selectedFile.uri,
        name: input.selectedFile.name,
        type: input.selectedFile.mimeType ?? "application/octet-stream",
      } as unknown as Blob);

      formData.append("classLevel", input.selection.classId);
      formData.append("subject", input.selection.subjectId);

      for (const bookId of input.selectedBookIds) {
        formData.append("bookIds", bookId);
      }

      for (const chapterId of input.selectedChapterIds ?? []) {
        formData.append("chapterIds", chapterId);
      }

      const response = await apiMultipartFetch<QuestionPaperVerifyResult>(
        "/api/notes/verify",
        { token, formData },
      );

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  }, [
    input.selectedBookIds,
    input.selectedChapterIds,
    input.selectedFile,
    input.selection,
  ]);

  const clearResult = useCallback((): void => {
    setResult(null);
    setError(null);
  }, []);

  return {
    canVerify,
    isVerifying,
    error,
    result,
    verify,
    clearResult,
  };
}
