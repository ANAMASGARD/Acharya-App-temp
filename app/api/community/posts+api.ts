import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { parseCreatePostRequest } from "@/lib/community/parse-create-post";
import { saveCommunityPostImages } from "@/lib/community/post-image-storage";
import {
  createCommunityPost,
  ensureAcharyaWelcomePost,
  listCommunityPosts,
  seedDemoCommunityPostsIfNeeded,
} from "@/lib/graph/community";

export async function GET(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const url = new URL(request.url);
    const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 20;
    const groupId = url.searchParams.get("groupId");

    await ensureAcharyaWelcomePost();
    await seedDemoCommunityPostsIfNeeded();

    const posts = await listCommunityPosts(userId, {
      limit,
      groupId: groupId?.trim() || null,
    });

    return Response.json({
      posts,
      count: posts.length,
      message: "Live community feed from AuraDB",
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
    const { input, imageFiles } = await parseCreatePostRequest(request);

    if (!input.title?.trim() || !input.body?.trim()) {
      return Response.json(
        { error: "title and body are required" },
        { status: 400 },
      );
    }

    if (!input.displayName?.trim()) {
      return Response.json({ error: "displayName is required" }, { status: 400 });
    }

    const savedImages = await saveCommunityPostImages(imageFiles);

    const post = await createCommunityPost(userId, {
      ...input,
      imageUrl: input.imageUrl?.trim() || null,
      images: savedImages,
    });

    return Response.json(
      {
        post,
        message: "Community post created in AuraDB",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NEO4J")) {
        return Response.json({ error: error.message }, { status: 503 });
      }

      if (
        error.message.includes("Unsupported image") ||
        error.message.includes("too large") ||
        error.message.includes("attach up to")
      ) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    }

    return authErrorResponse(error);
  }
}
