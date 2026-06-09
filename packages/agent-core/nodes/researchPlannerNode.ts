import type { AgentState, ResearchPlan } from "../../shared/types";
import { researchPlanPrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

export async function researchPlannerNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "researchPlannerNode",
    traceStage: "research_plan",
    input: state.context ?? state.input,
    execute: async () => {
      await completeWithPrompt(
        deps,
        state,
        "generateResearchPlan",
        researchPlanPrompt.buildPrompt(state.context ?? state.input)
      );

      const researchPlan: ResearchPlan = {
        goals: [
          "验证目标用户是否存在明确的产品发现痛点",
          "识别直接竞品、间接竞品和替代方案",
          "为 MVP PRD 和页面结构提供证据基础"
        ],
        keywords: [
          state.input.idea,
          "AI product discovery agent",
          "AI 产品经理 工具",
          "竞品分析 AI",
          "MVP PRD generator"
        ],
        questions: [
          "目标用户当前如何完成产品发现和竞品研究？",
          "现有工具在哪些环节无法形成可开发 PRD？",
          "哪些输出必须有证据支撑，哪些可以先用模型推断？"
        ],
        targetMarkets: ["AI 产品管理", "创业产品验证", "独立开发者工具", "咨询交付工具"],
        competitorCategories: ["AI 搜索研究工具", "PRD 文档生成工具", "竞品分析工具", "产品工作台"]
      };

      return { researchPlan };
    }
  });
}
