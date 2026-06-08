import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { resolveRouteParam } from "@/lib/api-route-params";
import { createGroupMessage, listGroupMessages } from "@/lib/graph/community";
import type { CreateGroupMessageInput } from "@/types/community";

export async function GET(
  request: Request,
  context?: { groupId?: string; params?: { groupId?: string } },
): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const groupId = await resolveRouteParam(request, context, "groupId", "groups");
    const url = new URL(request.url);
    const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 50;

    if (!groupId?.trim()) {
      return Response.json({ error: "groupId is required" }, { status: 400 });
    }

    const messages = await listGroupMessages(userId, groupId.trim(), limit);

    return Response.json({
      messages,
      count: messages.length,
      message: "Live group messages from AuraDB",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NEO4J") || error.message.includes("Neo4j")) {
        return Response.json({ error: error.message }, { status: 503 });
      }

      if (error.message.includes("member")) {
        return Response.json({ error: error.message }, { status: 403 });
      }
    }

    return authErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context?: { groupId?: string; params?: { groupId?: string } },
): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const groupId = await resolveRouteParam(request, context, "groupId", "groups");
    const body = (await request.json()) as CreateGroupMessageInput;

    if (!groupId?.trim()) {
      return Response.json({ error: "groupId is required" }, { status: 400 });
    }

    if (!body.body?.trim()) {
      return Response.json({ error: "body is required" }, { status: 400 });
    }

    if (!body.displayName?.trim()) {
      return Response.json({ error: "displayName is required" }, { status: 400 });
    }

    const message = await createGroupMessage(userId, groupId.trim(), body);

    return Response.json(
      {
        message,
        messageText: "Group message created in AuraDB",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NEO4J") || error.message.includes("Neo4j")) {
        return Response.json({ error: error.message }, { status: 503 });
      }

      if (error.message.includes("member")) {
        return Response.json({ error: error.message }, { status: 403 });
      }
    }

    return authErrorResponse(error);
  }
}
