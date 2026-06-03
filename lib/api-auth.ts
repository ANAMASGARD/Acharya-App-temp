import { verifyToken } from "@clerk/backend";

export class ApiAuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
  }
}

export type AuthContext = Readonly<{
  userId: string;
}>;

export async function requireAuth(request: Request): Promise<AuthContext> {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new ApiAuthError(
      "Missing CLERK_SECRET_KEY on server. Add it to .env for API routes.",
      500,
    );
  }

  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiAuthError("Missing Authorization Bearer token", 401);
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = await verifyToken(token, { secretKey });
    const userId = payload.sub;

    if (!userId) {
      throw new ApiAuthError("Invalid session token", 401);
    }

    return { userId };
  } catch (error) {
    if (error instanceof ApiAuthError) {
      throw error;
    }

    throw new ApiAuthError("Invalid or expired session token", 401);
  }
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof ApiAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unauthorized";
  return Response.json({ error: message }, { status: 401 });
}
