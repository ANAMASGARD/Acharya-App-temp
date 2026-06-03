import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { createSession, listSessionsByTeacher } from "@/lib/graph/session";
import type { CreateSessionInput } from "@/types/graph";

export async function GET(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "20");
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
