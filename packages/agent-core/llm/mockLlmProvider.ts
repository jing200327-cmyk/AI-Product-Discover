import type { LlmProvider } from "../nodes";

export class MockLLMProvider implements LlmProvider {
  async complete({ nodeName }: Parameters<LlmProvider["complete"]>[0]): Promise<string> {
    return `Mock LLM response for ${nodeName}`;
  }
}
