import type { AgentState, PersonaItem } from "../../shared/types";
import { personaPrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

export async function personaNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "personaNode",
    traceStage: "persona_generation",
    input: {
      context: state.context,
      evidence: state.evidence
    },
    execute: async () => {
      await completeWithPrompt(
        deps,
        state,
        "generateUserPersonas",
        personaPrompt.buildPrompt({
          context: state.context,
          evidence: state.evidence
        })
      );

      const personas: PersonaItem[] = [
        {
          id: "persona_pm",
          name: "林然",
          segment: "AI 产品经理",
          goals: ["快速判断产品想法是否值得推进", "形成可开发的 MVP PRD"],
          pains: ["研究、竞品、PRD 分散在多个工具", "难以追踪哪些结论有证据支持"],
          behaviors: ["频繁使用文档、表格和 AI 工具整理需求", "需要向团队解释产品决策依据"],
          jobsToBeDone: ["当我收到一个新产品想法时，帮我在短时间内形成可评审的产品发现材料。"]
        },
        {
          id: "persona_founder",
          name: "周宁",
          segment: "早期创业者 / 独立开发者",
          goals: ["找到最小可行切入点", "明确首版页面和功能范围"],
          pains: ["缺少系统产品方法", "容易跳过验证直接开发"],
          behaviors: ["偏好轻量工具", "希望结果能直接转成开发任务"],
          jobsToBeDone: ["当我有一个产品灵感时，帮我把它拆成竞品、用户、PRD 和页面结构。"]
        }
      ];

      return { personas };
    }
  });
}
