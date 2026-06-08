import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { getTeacherDashboard } from "@/lib/graph/dashboard";

export async function GET(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const url = new URL(request.url);
    const parsedLimit = Number.parseInt(
      url.searchParams.get("activityLimit") ?? "5",
      10,
    );
    const activityLimit = Number.isFinite(parsedLimit) ? parsedLimit : 5;

    const dashboard = await getTeacherDashboard(userId, activityLimit);

    return Response.json({
      ...dashboard,
      message: "Live dashboard aggregation from AuraDB",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEO4J")) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    return authErrorResponse(error);
  }
}
