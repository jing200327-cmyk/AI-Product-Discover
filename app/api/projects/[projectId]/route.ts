import { z } from "zod";
import {
  errorResponse,
  handleApiError,
  successResponse
} from "@/lib/api/response";
import { getProjectById } from "@/lib/repositories/projectRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ProjectParamsSchema = z
  .object({
    projectId: z.string().trim().min(1)
  })
  .strict();

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = ProjectParamsSchema.parse(await context.params);
    const project = await getProjectById(params.projectId);

    if (!project) {
      return errorResponse(
        {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found"
        },
        {
          status: 404
        }
      );
    }

    return successResponse(project);
  } catch (error) {
    return handleApiError(error);
  }
}
