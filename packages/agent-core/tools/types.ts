import type { z } from "zod";
import type { AgentError, AgentState, TraceEvent } from "../../shared/types";

export type PermissionLevel = "safe_read" | "external_write" | "high_risk";

export type ToolExecutionStatus = "success" | "degraded";

export type ToolExecutionContext = {
  state: AgentState;
};

export type ToolTraceLogger = {
  record(event: TraceEvent): Promise<void> | void;
};

export type ToolDefinition<TInput, TOutput> = {
  name: string;
  description: string;
  permissionLevel: PermissionLevel;
  timeoutMs: number;
  retry: number;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  handler: (
    input: TInput,
    context: ToolExecutionContext
  ) => Promise<TOutput> | TOutput;
  createDegradedOutput: (input: TInput, error: AgentError) => TOutput;
};

export type ToolCallOptions = {
  state: AgentState;
  traceLogger: ToolTraceLogger;
};

export type ToolExecutionResult<TOutput> = {
  status: ToolExecutionStatus;
  output: TOutput;
  error?: AgentError;
  traceEvent: TraceEvent;
};

export type ToolRegistryExecutor = {
  execute<TOutput>(
    name: string,
    input: unknown,
    options: ToolCallOptions
  ): Promise<ToolExecutionResult<TOutput>>;
};
