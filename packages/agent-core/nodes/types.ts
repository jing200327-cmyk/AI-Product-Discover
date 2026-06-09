import type { AgentState, TraceEvent } from "../../shared/types";
import type { ToolRegistryExecutor } from "../tools";

export type { ToolRegistryExecutor } from "../tools";

export type LlmProvider = {
  complete(input: {
    prompt: string;
    nodeName: string;
    model: string;
    state: AgentState;
    traceLogger?: TraceLogger;
  }): Promise<string>;
};

export type ModelRouter = {
  selectModel(input: { nodeName: string; state: AgentState }): string;
};

export type TraceLogger = {
  record(event: TraceEvent): Promise<void> | void;
};

export type AgentNodeDeps = {
  llmProvider: LlmProvider;
  modelRouter: ModelRouter;
  toolRegistry: ToolRegistryExecutor;
  traceLogger: TraceLogger;
};

export type AgentNode = (
  state: AgentState,
  deps: AgentNodeDeps
) => Promise<AgentState>;
