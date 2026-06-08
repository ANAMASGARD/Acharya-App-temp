import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { resolveRouteParam } from "@/lib/api-route-params";
import { setPostVote } from "@/lib/graph/community";

export async function POST(
  request: Request,
  context?: { postId?: string; params?: { postId?: string } },
): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const postId = await resolveRouteParam(request, context, "postId", "posts");
    const body = (await request.json()) as { value?: number };

    if (!postId?.trim()) {
      return Response.json({ error: "postId is required" }, { status: 400 });
    }

    if (body.value !== 1 && body.value !== -1) {
      return Response.json(
        { error: "value must be 1 (upvote) or -1 (downvote)" },
        { status: 400 },
      );
    }

    const action = body.value === 1 ? "up" : "down";
    const result = await setPostVote(userId, postId.trim(), action);

    return Response.json({
      ...result,
      message: "Vote updated in AuraDB",
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

    const result = await setPostVote(userId, postId.trim(), "remove");

    return Response.json({
      ...result,
      message: "Vote removed in AuraDB",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEO4J")) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    return authErrorResponse(error);
  }
}
