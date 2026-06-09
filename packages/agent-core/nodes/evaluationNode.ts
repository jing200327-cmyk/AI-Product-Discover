import type { AgentState, EvaluationResult } from "../../shared/types";
import { evaluationPrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

export async function evaluationNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "evaluationNode",
    traceStage: "evaluation",
    input: {
      context: state.context,
      evidence: state.evidence,
      competitors: state.competitors,
      mvpPrd: state.mvpPrd
    },
    execute: async () => {
      await completeWithPrompt(
        deps,
        state,
        "evaluateProductIdea",
        evaluationPrompt.buildPrompt({
          context: state.context,
          evidence: state.evidence,
          competitors: state.competitors,
          mvpPrd: state.mvpPrd
        })
      );

      const evidenceQualityScore = state.sources.length >= 3 ? 76 : 58;
      const totalScore = Math.round((78 + 82 + 72 + 80 + evidenceQualityScore) / 5);
      const evaluation: EvaluationResult = {
        totalScore,
        marketScore: 78,
        userPainScore: 82,
        differentiationScore: 72,
        feasibilityScore: 80,
        evidenceQualityScore,
        strengths: [
          "MVP 链路清晰，能从想法推进到 PRD、页面结构和评分",
          "Trace 机制有利于解释每个节点的输入输出",
          "Mock Provider 让项目在无 API Key 情况下可运行"
        ],
        deductionReasons: [
          "当前研究来源来自 Mock Search，不能代表真实市场事实",
          "竞品分析以类别为主，缺少真实竞品逐项证据",
          "用户画像尚未经过访谈或行为数据验证"
        ],
        risks: [
          "真实搜索接入后可能改变竞品判断",
          "评分模型需要后续校准",
          "PRD 细节仍需结合真实用户反馈迭代"
        ],
        recommendations: [
          "下一步接入真实搜索 API 并保留 Mock 回退",
          "为每个竞品补充来源级证据",
          "增加用户澄清答案对研究计划和 PRD 的影响"
        ]
      };

      return {
        evaluation,
        rewriteRequired: totalScore < 75
      };
    }
  });
}
