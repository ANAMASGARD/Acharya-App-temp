import { apiFetch } from "@/lib/api-client";
import type { CurriculumAvailabilityResponse } from "@/types/curriculum";
import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef, useState } from "react";

function availabilityKey(classLevel: string, subject: string): string {
  return `${classLevel}:${subject.toLowerCase()}`;
}

type UseCurriculumAvailabilityResult = Readonly<{
  isReady: (classLevel: string, subject: string) => boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}>;

export function useCurriculumAvailability(
  enabled = true,
): UseCurriculumAvailabilityResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [readyKeys, setReadyKeys] = useState<ReadonlySet<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getTokenRef.current();
      const response = await apiFetch<CurriculumAvailabilityResponse>(
        "/api/curriculum/availability",
        { token },
      );
      const keys = new Set(
        response.slots.map((slot) =>
          availabilityKey(slot.classLevel, slot.subject),
        ),
      );
      setReadyKeys(keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load availability");
      setReadyKeys(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isReady = useCallback(
    (classLevel: string, subject: string): boolean => {
      return readyKeys.has(availabilityKey(classLevel, subject));
    },
    [readyKeys],
  );

  return { isReady, isLoading, error, refresh };
}
