import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import {
  createSession,
  getSessionDetail,
  listSessionsByTeacher,
} from "@/lib/graph/session";
import { updateSessionDuration } from "@/lib/graph/recorder";
import type { CreateSessionInput } from "@/types/graph";

export async function GET(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (sessionId?.trim()) {
      const detail = await getSessionDetail(userId, sessionId.trim());

      if (!detail) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      return Response.json({
        ...detail,
        message: "Live Cypher query on AuraDB",
      });
    }

    const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "100", 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 100;
    const sessions = await listSessionsByTeacher(userId, limit);

    return Response.json({
      sessions,
      count: sessions.length,
      message: "Live Cypher query on AuraDB",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEO4J")) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    return authErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const body = (await request.json()) as CreateSessionInput;

    if (!body.topic?.trim() || !body.subject?.trim() || !body.classLevel?.trim()) {
      return Response.json(
        { error: "topic, subject, and classLevel are required" },
        { status: 400 },
      );
    }

    const session = await createSession(userId, body);

    return Response.json(
      {
        session,
        message: "Session created in AuraDB with TAUGHT relationship",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NEO4J") || error.message.includes("Neo4j")) {
        return Response.json({ error: error.message }, { status: 503 });
      }
    }

    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const body = (await request.json()) as {
      sessionId?: string;
      durationSeconds?: number;
      expectedChunkCount?: number;
    };

    if (!body.sessionId?.trim()) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    if (typeof body.durationSeconds !== "number" || body.durationSeconds < 0) {
      return Response.json(
        { error: "durationSeconds must be a non-negative number" },
        { status: 400 },
      );
    }

    if (
      typeof body.expectedChunkCount !== "number" ||
      !Number.isInteger(body.expectedChunkCount) ||
      body.expectedChunkCount < 0
    ) {
      return Response.json(
        { error: "expectedChunkCount must be a non-negative integer" },
        { status: 400 },
      );
    }

    await updateSessionDuration(
      userId,
      body.sessionId,
      body.durationSeconds,
      body.expectedChunkCount,
    );

    return Response.json({
      sessionId: body.sessionId,
      durationSeconds: body.durationSeconds,
      message: "Session duration updated in AuraDB",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NEO4J") || error.message.includes("Neo4j")) {
        return Response.json({ error: error.message }, { status: 503 });
      }
    }

    return authErrorResponse(error);
  }
}
