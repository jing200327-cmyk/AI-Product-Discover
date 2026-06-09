import { z } from "zod";
import {
  errorResponse,
  handleApiError,
  successResponse
} from "@/lib/api/response";
import { createProject, listProjects } from "@/lib/repositories/projectRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateProjectInputSchema = z
  .object({
    name: z.string().trim().min(1),
    productIdea: z.string().trim().min(1)
  })
  .strict();

export async function POST(request: Request) {
  try {
    const input = CreateProjectInputSchema.parse(await request.json());
    const project = await createProject({
      name: input.name,
      productIdea: input.productIdea
    });

    return successResponse(project, {
      status: 201
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const projects = await listProjects();

    return successResponse(projects);
  } catch (error) {
    return errorResponse(
      {
        code: "PROJECT_LIST_FAILED",
        message: error instanceof Error ? error.message : "Failed to list projects"
      },
      {
        status: 500
      }
    );
  }
}
