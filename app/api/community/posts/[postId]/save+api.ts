import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { resolveRouteParam } from "@/lib/api-route-params";
import { togglePostSave } from "@/lib/graph/community";

export async function POST(
  request: Request,
  context?: { postId?: string; params?: { postId?: string } },
): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const postId = await resolveRouteParam(request, context, "postId", "posts");

    if (!postId?.trim()) {
      return Response.json({ error: "postId is required" }, { status: 400 });
    }

    const result = await togglePostSave(userId, postId.trim(), true);

    return Response.json({
      ...result,
      message: "Post saved in AuraDB",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEO4J")) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    return authErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context?: { postId?: string; params?: { postId?: string } },
): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const postId = await resolveRouteParam(request, context, "postId", "posts");

    if (!postId?.trim()) {
      return Response.json({ error: "postId is required" }, { status: 400 });
    }

    const result = await togglePostSave(userId, postId.trim(), false);

    return Response.json({
      ...result,
      message: "Post unsaved in AuraDB",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEO4J")) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    return authErrorResponse(error);
  }
}
