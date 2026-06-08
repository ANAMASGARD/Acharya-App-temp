import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { resolveRouteParam } from "@/lib/api-route-params";
import {
  deleteCommunityPost,
  getCommunityPost,
  listPostComments,
} from "@/lib/graph/community";

export async function GET(
  request: Request,
  context?: { postId?: string; params?: { postId?: string } },
): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const postId = await resolveRouteParam(request, context, "postId", "posts");

    if (!postId?.trim()) {
      return Response.json({ error: "postId is required" }, { status: 400 });
    }

    const post = await getCommunityPost(userId, postId.trim());

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    const comments = await listPostComments(postId.trim());

    return Response.json({
      post,
      comments,
      message: "Live community post from AuraDB",
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

    const deleted = await deleteCommunityPost(userId, postId.trim());

    if (!deleted) {
      return Response.json(
        { error: "Post not found or you cannot delete it" },
        { status: 403 },
      );
    }

    return Response.json({
      deleted: true,
      message: "Community post deleted",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEO4J")) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    return authErrorResponse(error);
  }
}
