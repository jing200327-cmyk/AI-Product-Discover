import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AgentError, TraceEvent } from "../../shared/types";
import type { LlmProvider, TraceLogger } from "../nodes";
import { MockLLMProvider } from "./mockLlmProvider";

const DeepSeekTextSchema = z.string().trim().min(1);

type DeepSeekProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
  fallbackProvider?: LlmProvider;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
};

type DeepSeekChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekChatChoice = {
  message?: {
    content?: string;
  };
};

type DeepSeekResponseBody = {
  choices?: DeepSeekChatChoice[];
  error?: {
    message?: string;
  };
};

const jsonOutputNodeNames = new Set([
  "input_parser",
  "target_user_identification",
  "research_plan",
  "evidence_extractor",
  "evaluation",
  "usage_scenario_analysis",
  "real_problem_analysis",
  "current_alternative_analysis",
  "pain_intensity_analysis",
  "understandProductIdea",
  "analyzeUsageScenario",
  "analyzeRealProblem",
  "analyzeCurrentAlternative",
  "analyzePainIntensity",
  "generateResearchPlan",
  "generateSearchSummary",
  "evaluateProductIdea",
  "inputParserNode",
  "usageScenarioNode",
  "realProblemNode",
  "currentAlternativeNode",
  "painIntensityNode",
  "researchPlannerNode",
  "evidenceExtractorNode",
  "evaluationNode"
]);

const createTraceId = (): string => `trace_${Date.now().toString(36)}_${randomUUID()}`;

const stripJsonFence = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const repairJsonText = (text: string, requireJson: boolean): string => {
  const stripped = stripJsonFence(text);

  if (!stripped.startsWith("{") && !stripped.startsWith("[")) {
    if (requireJson) {
      throw new Error("DeepSeek response was expected to be JSON but was plain text");
    }

    return stripped;
  }

  try {
    return JSON.stringify(JSON.parse(stripped));
  } catch {
    const start = stripped.search(/[\[{]/);
    const end = Math.max(stripped.lastIndexOf("}"), stripped.lastIndexOf("]"));

    if (start >= 0 && end > start) {
      return JSON.stringify(JSON.parse(stripped.slice(start, end + 1)));
    }

    throw new Error("DeepSeek response looked like JSON but could not be parsed");
  }
};

const normalizeDeepSeekText = (text: string, requireJson: boolean): string =>
  DeepSeekTextSchema.parse(repairJsonText(text, requireJson));

const extractDeepSeekText = (body: DeepSeekResponseBody): string => {
  const text = body.choices
    ?.map((choice) => choice.message?.content)
    .filter((content): content is string => Boolean(content))
    .join("\n")
    .trim();

  if (text) {
    return text;
  }

  throw new Error(body.error?.message ?? "DeepSeek response did not include text output");
};

const isJsonOutputNode = (nodeName: string): boolean =>
  jsonOutputNodeNames.has(nodeName);

const appendJsonInstruction = (prompt: string, nodeName: string): string => {
  if (!isJsonOutputNode(nodeName)) {
    return prompt;
  }

  return `${prompt}

Output valid JSON only. Do not output Markdown.`;
};

const toAgentError = (error: unknown): AgentError => ({
  code: "DEEPSEEK_PROVIDER_FAILED",
  message: error instanceof Error ? error.message : "Unknown DeepSeek provider error",
  cause: error instanceof Error && error.stack ? error.stack : undefined
});

const recordDegradedTrace = async (
  traceLogger: TraceLogger | undefined,
  input: Parameters<LlmProvider["complete"]>[0],
  startedAt: Date,
  error: AgentError
): Promise<void> => {
  if (!traceLogger) {
    return;
  }

  const endedAt = new Date();
  const event: TraceEvent = {
    traceId: createTraceId(),
    runId: input.state.runId,
    stage: input.state.stage,
    nodeName: "llm:deepseek",
    status: "degraded",
    input: {
      nodeName: input.nodeName,
      model: input.model,
      jsonOutput: isJsonOutputNode(input.nodeName)
    },
    output: {
      provider_fallback: true,
      from: "DeepSeekProvider",
      to: "MockLLMProvider"
    },
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime(),
    error
  };

  try {
    await traceLogger.record(event);
  } catch {
    // Trace logging is best-effort; fallback output should still be returned.
  }
};

export class DeepSeekProvider implements LlmProvider {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fallbackProvider: LlmProvider;
  private readonly timeoutMs: number;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(options: DeepSeekProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY;
    this.baseUrl = options.baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
    this.fallbackProvider = options.fallbackProvider ?? new MockLLMProvider();
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.temperature = options.temperature ?? 0.2;
    this.maxTokens = options.maxTokens ?? 4096;
  }

  async complete(input: Parameters<LlmProvider["complete"]>[0]): Promise<string> {
    if (!this.apiKey) {
      return this.fallbackProvider.complete(input);
    }

    const startedAt = new Date();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const messages: DeepSeekChatMessage[] = [
        {
          role: "user",
          content: appendJsonInstruction(input.prompt, input.nodeName)
        }
      ];
      const response = await fetch(
        `${this.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: input.model,
            messages,
            temperature: this.temperature,
            max_tokens: this.maxTokens,
            stream: false,
            response_format: isJsonOutputNode(input.nodeName)
              ? { type: "json_object" }
              : undefined,
            thinking: {
              type: "disabled"
            }
          }),
          signal: controller.signal
        }
      );

      const body = (await response.json()) as DeepSeekResponseBody;

      if (!response.ok) {
        throw new Error(body.error?.message ?? `DeepSeek request failed with ${response.status}`);
      }

      return normalizeDeepSeekText(
        extractDeepSeekText(body),
        isJsonOutputNode(input.nodeName)
      );
    } catch (error) {
      await recordDegradedTrace(input.traceLogger, input, startedAt, toAgentError(error));
      return this.fallbackProvider.complete(input);
    } finally {
      clearTimeout(timeout);
    }
  }
}
