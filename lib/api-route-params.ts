function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Expo Router API routes may pass dynamic segments as the second argument
 * directly ({ postId }) or nested under params (sync or Promise).
 * Fall back to parsing the request URL when needed.
 */
export async function resolveRouteParam(
  request: Request,
  context: unknown,
  paramName: string,
  parentSegment?: string,
): Promise<string | null> {
  if (context && typeof context === "object") {
    const record = context as Record<string, unknown>;
    const direct = record[paramName];

    if (typeof direct === "string" && direct.trim()) {
      return decodeParam(direct.trim());
    }

    if (record.params) {
      const params =
        record.params instanceof Promise ? await record.params : record.params;

      if (params && typeof params === "object") {
        const nested = (params as Record<string, unknown>)[paramName];

        if (typeof nested === "string" && nested.trim()) {
          return decodeParam(nested.trim());
        }
      }
    }
  }

  if (parentSegment) {
    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    const parentIndex = segments.indexOf(parentSegment);

    if (parentIndex >= 0) {
      const value = segments[parentIndex + 1];

      if (value && value.trim()) {
        return decodeParam(value.trim());
      }
    }
  }

  return null;
}
