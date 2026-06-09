import type { AgentState, CompetitorItem } from "../../shared/types";
import { competitorAnalysisPrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

export async function competitorAnalystNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "competitorAnalystNode",
    traceStage: "competitor_analysis",
    input: state.evidence,
    execute: async () => {
      await completeWithPrompt(
        deps,
        state,
        "generateCompetitorAnalysis",
        competitorAnalysisPrompt.buildPrompt(state.evidence)
      );

      const evidenceIds = state.evidence.map((item) => item.id);
      const competitors: CompetitorItem[] = [
        {
          id: "comp_ai_research",
          name: "AI 搜索/研究助手类产品",
          category: "间接竞品",
          targetUsers: ["研究人员", "产品经理", "知识工作者"],
          coreFeatures: ["问题检索", "来源总结", "引用整理"],
          strengths: ["研究速度快", "适合开放问题探索"],
          weaknesses: ["通常不直接产出可开发 PRD 和页面结构"],
          pricing: "待验证",
          evidenceIds
        },
        {
          id: "comp_prd_generator",
          name: "PRD 文档生成类工具",
          category: "直接竞品",
          targetUsers: ["产品经理", "创业团队"],
          coreFeatures: ["需求整理", "PRD 生成", "文档协作"],
          strengths: ["贴近产品交付文档"],
          weaknesses: ["市场和竞品证据链通常较弱"],
          pricing: "待验证",
          evidenceIds
        },
        {
          id: "comp_template_workflow",
          name: "竞品分析模板和咨询交付流程",
          category: "替代方案",
          targetUsers: ["咨询顾问", "创业者", "独立开发者"],
          coreFeatures: ["模板填报", "表格分析", "人工总结"],
          strengths: ["灵活、易调整"],
          weaknesses: ["耗时较长，Trace 和自动化能力有限"],
          pricing: "待验证",
          evidenceIds
        }
      ];

      return { competitors };
    }
  });
}
