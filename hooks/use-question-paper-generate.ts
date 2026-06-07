import { apiFetch } from "@/lib/api-client";
import type { CurriculumSelection } from "@/types/curriculum";
import type {
  Difficulty,
  PaperType,
  QuestionPaperGenerateResult,
} from "@/types/question-paper";
import { useAuth } from "@clerk/expo";
import { useCallback, useMemo, useRef, useState } from "react";

type UseQuestionPaperGenerateResult = Readonly<{
  canGenerate: boolean;
  isGenerating: boolean;
  error: string | null;
  result: QuestionPaperGenerateResult | null;
  generate: () => Promise<void>;
  clearResult: () => void;
}>;

export function useQuestionPaperGenerate(input: {
  selection: CurriculumSelection | null;
  selectedBookIds: readonly string[];
  paperType: PaperType;
  difficulty: Difficulty;
  chapterIds?: readonly string[];
}): UseQuestionPaperGenerateResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionPaperGenerateResult | null>(null);

  const canGenerate = useMemo(
    () =>
      Boolean(
        input.selection &&
          input.selectedBookIds.length > 0 &&
          !isGenerating,
      ),
    [input.selectedBookIds.length, input.selection, isGenerating],
  );

  const generate = useCallback(async (): Promise<void> => {
    if (!input.selection || input.selectedBookIds.length === 0) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const token = await getTokenRef.current();
      const response = await apiFetch<QuestionPaperGenerateResult>(
        "/api/notes/generate",
        {
          token,
          method: "POST",
          body: {
            classLevel: input.selection.classId,
            subject: input.selection.subjectId,
            bookIds: [...input.selectedBookIds],
            paperType: input.paperType,
            difficulty: input.difficulty,
            chapterIds: input.chapterIds?.length ? [...input.chapterIds] : undefined,
          },
        },
      );

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [
    input.chapterIds,
    input.difficulty,
    input.paperType,
    input.selectedBookIds,
    input.selection,
  ]);

  const clearResult = useCallback((): void => {
    setResult(null);
    setError(null);
  }, []);

  return {
    canGenerate,
    isGenerating,
    error,
    result,
    generate,
    clearResult,
  };
}
