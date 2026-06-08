import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import {
  createCommunityGroup,
  listTeacherGroups,
} from "@/lib/graph/community";
import type { CreateGroupInput } from "@/types/community";

export async function GET(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const groups = await listTeacherGroups(userId);

    return Response.json({
      groups,
      count: groups.length,
      message: "Live community groups from AuraDB",
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
    const body = (await request.json()) as CreateGroupInput;

    if (!body.name?.trim()) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    if (!body.displayName?.trim()) {
      return Response.json({ error: "displayName is required" }, { status: 400 });
    }

    const group = await createCommunityGroup(userId, body);

    return Response.json(
      {
        group,
        message: "Community group created in AuraDB",
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
