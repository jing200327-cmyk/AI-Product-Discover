import { z } from "zod";
import {
  errorResponse,
  handleApiError,
  successResponse
} from "@/lib/api/response";
import { getLatestExportArtifact } from "@/lib/repositories/artifactRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ExportParamsSchema = z
  .object({
    projectId: z.string().trim().min(1)
  })
  .strict();

const ExportQuerySchema = z
  .object({
    format: z.enum(["markdown", "json"])
  })
  .strict();

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const params = ExportParamsSchema.parse(await context.params);
    const query = ExportQuerySchema.parse({
      format: new URL(request.url).searchParams.get("format")
    });
    const artifact = await getLatestExportArtifact({
      projectId: params.projectId,
      format: query.format
    });

    if (!artifact) {
      return errorResponse(
        {
          code: "EXPORT_NOT_FOUND",
          message: `No ${query.format} export found for this project`
        },
        {
          status: 404
        }
      );
    }

    return successResponse({
      format: query.format,
      content: artifact.content,
      artifact
    });
  } catch (error) {
    return handleApiError(error);
  }
}
