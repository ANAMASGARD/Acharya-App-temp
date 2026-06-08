import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { joinCommunityGroup } from "@/lib/graph/community";

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const body = (await request.json()) as {
      joinCode?: string;
      displayName?: string;
    };

    if (!body.joinCode?.trim()) {
      return Response.json({ error: "joinCode is required" }, { status: 400 });
    }

    if (!body.displayName?.trim()) {
      return Response.json({ error: "displayName is required" }, { status: 400 });
    }

    const group = await joinCommunityGroup(
      userId,
      body.joinCode,
      body.displayName,
    );

    return Response.json({
      group,
      message: "Joined community group in AuraDB",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NEO4J") || error.message.includes("Neo4j")) {
        return Response.json({ error: error.message }, { status: 503 });
      }

      if (error.message.includes("not found")) {
        return Response.json({ error: error.message }, { status: 404 });
      }
    }

    return authErrorResponse(error);
  }
}
