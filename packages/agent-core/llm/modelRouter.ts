import type { ModelRouter } from "../nodes";

export type LlmProviderKind = "mock" | "deepseek";

export const getActiveLlmProviderKind = (): LlmProviderKind => {
  if (process.env.USE_MOCK_LLM === "true") {
    return "mock";
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return "mock";
  }

  return "deepseek";
};

export const shouldUseMockLlm = (): boolean =>
  getActiveLlmProviderKind() === "mock";

const isEvaluationNode = (nodeName: string): boolean =>
  ["evaluation", "evaluationNode", "evaluateProductIdea"].includes(nodeName);

const isRewriteNode = (nodeName: string): boolean =>
  ["rewrite", "rewriteNode", "rewriteResult"].includes(nodeName);

const isPrdWriterNode = (nodeName: string): boolean =>
  ["prd_writer", "prdWriterNode", "generateMvpPrd"].includes(nodeName);

export class EnvModelRouter implements ModelRouter {
  selectModel({ nodeName }: Parameters<ModelRouter["selectModel"]>[0]): string {
    const providerKind = getActiveLlmProviderKind();

    if (providerKind === "mock") {
      return "mock-model";
    }

    if (isEvaluationNode(nodeName) || isRewriteNode(nodeName)) {
      return process.env.DEEPSEEK_MODEL_EVAL || "deepseek-v4-pro";
    }

    if (isPrdWriterNode(nodeName)) {
      return process.env.DEEPSEEK_MODEL_PRD || "deepseek-v4-flash";
    }

    return process.env.DEEPSEEK_MODEL_DEFAULT || "deepseek-v4-flash";
  }
}
