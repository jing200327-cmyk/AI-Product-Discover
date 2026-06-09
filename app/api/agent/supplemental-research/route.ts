import { z } from "zod";
import { handleApiError, successResponse } from "@/lib/api/response";
import { saveAgentRunResult } from "@/lib/repositories/taskRepository";
import { runSupplementalResearchRound } from "@/packages/agent-core/orchestrator";
import { AgentStateSchema } from "@/packages/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SupplementalResearchInputSchema = z
  .object({
    projectId: z.string().trim().min(1),
    state: AgentStateSchema
  })
  .strict();

export async function POST(request: Request) {
  try {
    const input = SupplementalResearchInputSchema.parse(await request.json());
    const state = await runSupplementalResearchRound(input.state);
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
