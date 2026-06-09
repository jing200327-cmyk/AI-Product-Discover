import type { AgentState, ProductContext } from "../../shared/types";
import { runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

export async function contextUpdateNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "contextUpdateNode",
    traceStage: "product_context",
    input: {
      context: state.context,
      clarificationQuestions: state.clarificationQuestions,
      clarificationAnswers: state.clarificationAnswers
    },
    execute: async () => {
      const existingContext = state.context;
      const context: ProductContext = {
        summary: existingContext?.summary ?? state.input.idea,
        targetUsers: existingContext?.targetUsers ?? [
          state.input.targetAudience ?? "AI 产品经理、创业者、独立开发者和咨询顾问"
        ],
        coreProblem:
          existingContext?.coreProblem ??
          state.input.problem ??
          "早期产品想法缺少结构化发现流程和可追踪证据。",
        valueProposition:
          existingContext?.valueProposition ??
          "用 Agent 工作流把产品想法转化为研究、PRD、页面结构和评测。",
        assumptions: [
          ...(existingContext?.assumptions ?? []),
          state.clarificationAnswers.length > 0
            ? `已收到 ${state.clarificationAnswers.length} 个澄清回答，其中 mock 回答仅用于本地流程演示。`
            : "澄清问题尚未由真实用户回答，当前上下文更新属于待验证假设。"
        ]
      };

      return { context };
    }
  });
}
