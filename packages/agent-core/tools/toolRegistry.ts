import { randomUUID } from "node:crypto";
import type { AgentError, TraceEvent } from "../../shared/types";
import type {
  ToolCallOptions,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolRegistryExecutor
} from "./types";

const createTraceId = (): string => `trace_${Date.now().toString(36)}_${randomUUID()}`;

const toAgentError = (
  toolName: string,
  error: unknown,
  code = "TOOL_FAILED"
): AgentError => ({
  code: `${toolName.toUpperCase()}_${code}`,
  message: error instanceof Error ? error.message : "Unknown tool error",
  cause: error instanceof Error && error.stack ? error.stack : undefined
});

const withTimeout = async <TOutput>(
  task: Promise<TOutput>,
  timeoutMs: number,
  toolName: string
): Promise<TOutput> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Tool ${toolName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

export class ToolRegistry implements ToolRegistryExecutor {
  private readonly tools = new Map<string, ToolDefinition<unknown, unknown>>();

  constructor(tools: ToolDefinition<unknown, unknown>[] = []) {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  register(tool: ToolDefinition<unknown, unknown>): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition<unknown, unknown> | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition<unknown, unknown>[] {
    return [...this.tools.values()];
  }

  async execute<TOutput>(
    name: string,
    input: unknown,
    options: ToolCallOptions
  ): Promise<ToolExecutionResult<TOutput>> {
    const startedAt = new Date();
    const tool = this.tools.get(name);

    if (!tool) {
      const error = toAgentError(name, new Error(`Tool "${name}" is not registered`));
      const traceEvent = this.createTraceEvent(
        name,
        input,
        options,
        startedAt,
        null,
        "degraded",
        error
      );
      await this.recordTrace(options, traceEvent);

      return {
        status: "degraded",
        output: undefined as TOutput,
        error,
        traceEvent
      };
    }

    const parsedInput = tool.inputSchema.safeParse(input);
    const safeInput = parsedInput.success ? parsedInput.data : input;

    if (!parsedInput.success) {
      const error = toAgentError(name, parsedInput.error, "INPUT_INVALID");
      const degradedOutput = tool.outputSchema.parse(
        tool.createDegradedOutput(safeInput, error)
      ) as TOutput;
      const traceEvent = this.createTraceEvent(
        name,
        input,
        options,
        startedAt,
        degradedOutput,
        "degraded",
        error
      );
      await this.recordTrace(options, traceEvent);

      return {
        status: "degraded",
        output: degradedOutput,
        error,
        traceEvent
      };
    }

    const context: ToolExecutionContext = {
      state: options.state
    };
    let lastError: AgentError | undefined;

    for (let attempt = 0; attempt <= tool.retry; attempt += 1) {
      try {
        const rawOutput = await withTimeout(
          Promise.resolve(tool.handler(parsedInput.data, context)),
          tool.timeoutMs,
          name
        );
        const output = tool.outputSchema.parse(rawOutput) as TOutput;
        const traceEvent = this.createTraceEvent(
          name,
          parsedInput.data,
          options,
          startedAt,
          output,
          "success"
        );
        await this.recordTrace(options, traceEvent);

        return {
          status: "success",
          output,
          traceEvent
        };
      } catch (error) {
        lastError = toAgentError(name, error);
      }
    }

    const error = lastError ?? toAgentError(name, new Error("Tool failed without error"));
    const degradedOutput = tool.outputSchema.parse(
      tool.createDegradedOutput(parsedInput.data, error)
    ) as TOutput;
    const traceEvent = this.createTraceEvent(
      name,
      parsedInput.data,
      options,
      startedAt,
      degradedOutput,
      "degraded",
      error
    );
    await this.recordTrace(options, traceEvent);

    return {
      status: "degraded",
      output: degradedOutput,
      error,
      traceEvent
    };
  }

  private createTraceEvent(
    name: string,
    input: unknown,
    options: ToolCallOptions,
    startedAt: Date,
    output: unknown,
    status: "success" | "degraded",
    error?: AgentError
  ): TraceEvent {
    const endedAt = new Date();

    return {
      traceId: createTraceId(),
      runId: options.state.runId,
      stage: options.state.stage,
      nodeName: `tool:${name}`,
      status,
      input: {
        toolName: name,
        payload: input
      },
      output,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - startedAt.getTime(),
      error
    };
  }

  private async recordTrace(
    options: ToolCallOptions,
    event: TraceEvent
  ): Promise<void> {
    try {
      await options.traceLogger.record(event);
    } catch {
      // Tool trace logging is best-effort; degraded output still returns to the node.
    }
  }
}
