import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { resolveRouteParam } from "@/lib/api-route-params";
import { createPostComment, listPostComments } from "@/lib/graph/community";
import type { CreateCommentInput } from "@/types/community";

export async function GET(
  request: Request,
  context?: { postId?: string; params?: { postId?: string } },
): Promise<Response> {
  try {
    await requireAuth(request);
    const postId = await resolveRouteParam(request, context, "postId", "posts");

    if (!postId?.trim()) {
      return Response.json({ error: "postId is required" }, { status: 400 });
    }

    const comments = await listPostComments(postId.trim());

    return Response.json({
      comments,
      count: comments.length,
      message: "Live comments from AuraDB",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEO4J")) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    return authErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context?: { postId?: string; params?: { postId?: string } },
): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const postId = await resolveRouteParam(request, context, "postId", "posts");
    const body = (await request.json()) as CreateCommentInput;

    if (!postId?.trim()) {
      return Response.json({ error: "postId is required" }, { status: 400 });
    }

    if (!body.body?.trim()) {
      return Response.json({ error: "body is required" }, { status: 400 });
    }

    if (!body.displayName?.trim()) {
      return Response.json({ error: "displayName is required" }, { status: 400 });
    }

    const comment = await createPostComment(userId, postId.trim(), body);

    return Response.json(
      {
        comment,
        message: "Comment created in AuraDB",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEO4J")) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    return authErrorResponse(error);
  }
}
