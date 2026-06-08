import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { resolveRouteParam } from "@/lib/api-route-params";
import { getGroupDetail } from "@/lib/graph/community";

export async function GET(
  request: Request,
  context?: { groupId?: string; params?: { groupId?: string } },
): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const groupId = await resolveRouteParam(request, context, "groupId", "groups");

    if (!groupId?.trim()) {
      return Response.json({ error: "groupId is required" }, { status: 400 });
    }

    const group = await getGroupDetail(userId, groupId.trim());

    if (!group) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }

    return Response.json({
      group,
      message: "Live community group from AuraDB",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEO4J")) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    return authErrorResponse(error);
  }
}
