import { z } from "zod";
import { handleApiError, successResponse } from "@/lib/api/response";
import { saveAgentRunResult } from "@/lib/repositories/taskRepository";
import { runProductDiscoveryStartWorkflow } from "@/packages/agent-core/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RunAgentInputSchema = z
  .object({
    projectId: z.string().trim().min(1),
    productIdea: z.string().trim().min(1),
    autoAnswerClarification: z.boolean().optional()
  })
  .strict();

export async function POST(request: Request) {
  try {
    const input = RunAgentInputSchema.parse(await request.json());
    const state = await runProductDiscoveryStartWorkflow(
      {
        idea: input.productIdea
      }
    );
    const task = await saveAgentRunResult(state, {
      projectId: input.projectId
    });

    return successResponse({
      state,
      task
    });
  } catch (error) {
    return handleApiError(error);
  }
}
