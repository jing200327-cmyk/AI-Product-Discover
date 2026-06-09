import { randomUUID } from "node:crypto";
import { AgentStateSchema } from "../../shared/schemas";
import type {
  AgentError,
  AgentStage,
  AgentState,
  TraceEvent
} from "../../shared/types";
import type { AgentNodeDeps } from "./types";

type RunAgentNodeInput = {
  state: AgentState;
  deps: AgentNodeDeps;
  nodeName: string;
  traceStage: AgentStage;
  stateStage?: AgentStage;
  input: unknown;
  execute: () => Promise<Partial<AgentState>>;
};

const createTraceId = (): string => `trace_${Date.now().toString(36)}_${randomUUID()}`;

const toAgentError = (
  error: unknown,
  nodeName: string,
  stage: AgentStage
): AgentError => ({
  code: `${nodeName.toUpperCase()}_FAILED`,
  message: error instanceof Error ? error.message : "Unknown agent node error",
  stage,
  cause: error instanceof Error && error.stack ? error.stack : undefined
});

const recordTrace = async (
  deps: AgentNodeDeps,
  event: TraceEvent
): Promise<void> => {
  try {
    await deps.traceLogger.record(event);
  } catch {
    // Trace logger failures should not hide the node result already stored in state.
  }
};

export async function runAgentNode({
  state,
  deps,
  nodeName,
  traceStage,
  stateStage,
  input,
  execute
}: RunAgentNodeInput): Promise<AgentState> {
  const startedAt = new Date();

  try {
    const patch = await execute();
    const endedAt = new Date();
    const nextStage = stateStage ?? traceStage;
    const { trace: patchTrace, ...eventOutput } = patch;
    const event: TraceEvent = {
      traceId: createTraceId(),
      runId: state.runId,
      stage: traceStage,
      nodeName,
      status: "success",
      input,
      output: eventOutput,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - startedAt.getTime()
    };

    await recordTrace(deps, event);

    return AgentStateSchema.parse({
      ...state,
      ...patch,
      stage: nextStage,
      currentStage: nextStage,
      updatedAt: endedAt.toISOString(),
      trace: [...(patchTrace ?? state.trace), event]
    });
  } catch (error) {
    const endedAt = new Date();
    const agentError = toAgentError(error, nodeName, traceStage);
    const event: TraceEvent = {
      traceId: createTraceId(),
      runId: state.runId,
      stage: traceStage,
      nodeName,
      status: "error",
      input,
      output: null,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - startedAt.getTime(),
      error: agentError
    };

    await recordTrace(deps, event);

    return AgentStateSchema.parse({
      ...state,
      stage: traceStage,
      currentStage: traceStage,
      updatedAt: endedAt.toISOString(),
      trace: [...state.trace, event],
      errors: [...state.errors, agentError]
    });
  }
}

export async function completeWithPrompt(
  deps: AgentNodeDeps,
  state: AgentState,
  nodeName: string,
  prompt: string
): Promise<string> {
  const model = deps.modelRouter.selectModel({ nodeName, state });

  return deps.llmProvider.complete({
    prompt,
    nodeName,
    model,
    state,
    traceLogger: deps.traceLogger
  });
}
