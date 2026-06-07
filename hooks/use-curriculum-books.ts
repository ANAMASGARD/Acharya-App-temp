import { apiFetch } from "@/lib/api-client";
import type { CurriculumBooksResponse, CurriculumBookSummary } from "@/types/question-paper";
import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef, useState } from "react";

type UseCurriculumBooksResult = Readonly<{
  books: readonly CurriculumBookSummary[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}>;

export function useCurriculumBooks(
  classLevel: string | null,
  subject: string | null,
): UseCurriculumBooksResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [books, setBooks] = useState<readonly CurriculumBookSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!classLevel || !subject) {
      setBooks([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getTokenRef.current();
      const params = new URLSearchParams({
        classLevel,
        subject,
      });
      const response = await apiFetch<CurriculumBooksResponse>(
        `/api/curriculum/books?${params.toString()}`,
        { token },
      );
      setBooks(response.books);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load books");
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, [classLevel, subject]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { books, isLoading, error, refresh };
}
