import type { LlmProvider } from "../nodes";
import { EnvModelRouter, shouldUseMockLlm } from "./modelRouter";
import { DeepSeekProvider } from "./deepseekProvider";
import { MockLLMProvider } from "./mockLlmProvider";

export { DeepSeekProvider } from "./deepseekProvider";
export {
  EnvModelRouter,
  getActiveLlmProviderKind,
  shouldUseMockLlm
} from "./modelRouter";
export type { LlmProviderKind } from "./modelRouter";
export { MockLLMProvider } from "./mockLlmProvider";
export { OpenAIProvider } from "./openaiProvider";

export function createDefaultLlmProvider(): LlmProvider {
  const mockProvider = new MockLLMProvider();

  if (shouldUseMockLlm()) {
    return mockProvider;
  }

  return new DeepSeekProvider({
    fallbackProvider: mockProvider
  });
}

export function createDefaultModelRouter(): EnvModelRouter {
  return new EnvModelRouter();
}
