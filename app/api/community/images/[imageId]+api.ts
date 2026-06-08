import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { resolveRouteParam } from "@/lib/api-route-params";
import { readCommunityPostImage } from "@/lib/community/post-image-storage";

export async function GET(
  request: Request,
  context?: { imageId?: string; params?: { imageId?: string } },
): Promise<Response> {
  try {
    await requireAuth(request);
    const imageId = await resolveRouteParam(request, context, "imageId", "images");
    const safeImageId = imageId?.trim();

    if (!safeImageId) {
      return Response.json({ error: "imageId is required" }, { status: 400 });
    }

    const image = await readCommunityPostImage(safeImageId);

    if (!image) {
      return Response.json({ error: "Image not found" }, { status: 404 });
    }

    return new Response(new Uint8Array(image.buffer), {
      status: 200,
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
