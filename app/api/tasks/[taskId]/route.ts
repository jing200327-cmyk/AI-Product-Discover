import { z } from "zod";
import {
  errorResponse,
  handleApiError,
  successResponse
} from "@/lib/api/response";
import { getTaskById } from "@/lib/repositories/taskRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TaskParamsSchema = z
  .object({
    taskId: z.string().trim().min(1)
  })
  .strict();

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = TaskParamsSchema.parse(await context.params);
    const task = await getTaskById(params.taskId);

    if (!task) {
      return errorResponse(
        {
          code: "TASK_NOT_FOUND",
          message: "Task not found"
        },
        {
          status: 404
        }
      );
    }

    return successResponse(task);
  } catch (error) {
    return handleApiError(error);
  }
}
