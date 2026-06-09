import { z } from "zod";
import type { LlmProvider } from "../nodes";
import { MockLLMProvider } from "./mockLlmProvider";

const OpenAITextSchema = z.string().trim().min(1);

type OpenAIProviderOptions = {
  apiKey?: string;
  fallbackProvider?: LlmProvider;
  timeoutMs?: number;
};

type OpenAIResponseContent = {
  type?: string;
  text?: string;
};

type OpenAIResponseOutput = {
  content?: OpenAIResponseContent[];
};

type OpenAIResponseBody = {
  output_text?: string;
  output?: OpenAIResponseOutput[];
  error?: {
    message?: string;
  };
};

const stripJsonFence = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const repairJsonText = (text: string): string => {
  const stripped = stripJsonFence(text);

  if (!stripped.startsWith("{") && !stripped.startsWith("[")) {
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

    throw new Error("OpenAI response looked like JSON but could not be parsed");
  }
};

const normalizeOpenAIText = (text: string): string =>
  OpenAITextSchema.parse(repairJsonText(text));

const extractOpenAIText = (body: OpenAIResponseBody): string => {
  if (body.output_text) {
    return body.output_text;
  }

  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((item): item is string => Boolean(item))
    .join("\n")
    .trim();

  if (text) {
    return text;
  }

  throw new Error(body.error?.message ?? "OpenAI response did not include text output");
};

export class OpenAIProvider implements LlmProvider {
  private readonly apiKey?: string;
  private readonly fallbackProvider: LlmProvider;
  private readonly timeoutMs: number;

  constructor(options: OpenAIProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    this.fallbackProvider = options.fallbackProvider ?? new MockLLMProvider();
    this.timeoutMs = options.timeoutMs ?? 30000;
  }

  async complete(input: Parameters<LlmProvider["complete"]>[0]): Promise<string> {
    if (!this.apiKey) {
      return this.fallbackProvider.complete(input);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: input.model,
          input: input.prompt
        }),
        signal: controller.signal
      });

      const body = (await response.json()) as OpenAIResponseBody;

      if (!response.ok) {
        throw new Error(body.error?.message ?? `OpenAI request failed with ${response.status}`);
      }

      return normalizeOpenAIText(extractOpenAIText(body));
    } catch {
      return this.fallbackProvider.complete(input);
    } finally {
      clearTimeout(timeout);
    }
  }
}
