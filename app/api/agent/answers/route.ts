import { z } from "zod";
import { handleApiError, successResponse } from "@/lib/api/response";
import { saveAgentRunResult } from "@/lib/repositories/taskRepository";
import { continueProductDiscoveryWorkflow } from "@/packages/agent-core/orchestrator";
import { AgentStateSchema } from "@/packages/shared/schemas";
import type { UserAnswer } from "@/packages/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AnswerInputSchema = z
  .object({
    questionId: z.string().trim().min(1),
    answer: z.union([
      z.string().trim().min(1),
      z.array(z.string().trim().min(1)).min(1)
    ])
  })
  .strict();

const SubmitAnswersInputSchema = z
  .object({
    projectId: z.string().trim().min(1),
    state: AgentStateSchema,
    answers: z.array(AnswerInputSchema).min(1)
  })
  .strict();

export async function POST(request: Request) {
  try {
    const input = SubmitAnswersInputSchema.parse(await request.json());
    const answeredAt = new Date().toISOString();
    const answers: UserAnswer[] = input.answers.map((answer) => ({
      ...answer,
      answeredAt
    }));
    const state = await continueProductDiscoveryWorkflow(input.state, answers);
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
