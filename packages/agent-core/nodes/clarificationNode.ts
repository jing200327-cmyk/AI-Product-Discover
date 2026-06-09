import type { AgentState, ClarificationQuestion } from "../../shared/types";
import { clarificationPrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

export async function clarificationNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "clarificationNode",
    traceStage: "clarification",
    input: state.context ?? state.input,
    execute: async () => {
      await completeWithPrompt(
        deps,
        state,
        "generateClarificationQuestions",
        clarificationPrompt.buildPrompt(state.context ?? state.input)
      );

      const clarificationQuestions: ClarificationQuestion[] = [
        {
          id: "cq_target_user",
          question: "最优先服务的第一类用户是谁？",
          reason: "目标用户会影响研究关键词、竞品范围、PRD 功能优先级和页面结构。",
          required: true
        },
        {
          id: "cq_primary_output",
          question: "用户最希望 Agent 首先产出的结果是竞品分析、PRD，还是页面结构？",
          reason: "MVP 需要聚焦一个最高频、最高价值的核心产物。",
          required: true
        },
        {
          id: "cq_validation_depth",
          question: "当前阶段需要轻量 Mock 研究，还是需要后续接入真实搜索进行证据验证？",
          reason: "研究深度决定证据质量、评分可信度和后续 API 替换范围。",
          required: false
        }
      ];

      return { clarificationQuestions };
    }
  });
}
