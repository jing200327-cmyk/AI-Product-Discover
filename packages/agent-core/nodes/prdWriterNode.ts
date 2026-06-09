import type { AgentState, MvpPrd } from "../../shared/types";
import { prdWriterPrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

export async function prdWriterNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "prdWriterNode",
    traceStage: "prd_generation",
    input: {
      context: state.context,
      competitors: state.competitors,
      personas: state.personas
    },
    execute: async () => {
      await completeWithPrompt(
        deps,
        state,
        "generateMvpPrd",
        prdWriterPrompt.buildPrompt({
          context: state.context,
          competitors: state.competitors,
          personas: state.personas
        })
      );

      const mvpPrd: MvpPrd = {
        title: "AI Product Discover MVP",
        problemStatement:
          state.context?.coreProblem ??
          "早期产品想法缺少从研究到 PRD 的结构化、可追踪工作流。",
        targetUsers: state.context?.targetUsers ?? ["AI 产品经理", "创业者", "独立开发者"],
        goals: [
          "输入产品想法后生成澄清问题、研究计划、竞品分析、用户画像、MVP PRD、页面结构和评测",
          "所有节点结果进入 Trace",
          "支持 Markdown 和 JSON 导出"
        ],
        nonGoals: ["不接真实 LLM", "不接数据库", "不实现登录、支付或多租户"],
        coreFeatures: [
          "产品想法结构化理解",
          "Mock 研究和证据归类",
          "竞品分析表生成",
          "用户画像生成",
          "MVP PRD 生成",
          "页面结构生成",
          "评测打分和导出"
        ],
        successMetrics: [
          "Mock Agent 全链路可运行",
          "每个节点都有 TraceEvent",
          "导出结果可被复制为 Markdown 或 JSON"
        ],
        risks: [
          "Mock 搜索不能代表真实市场事实",
          "用户画像当前主要来自模型推断",
          "评分可信度依赖后续真实证据质量"
        ]
      };

      return { mvpPrd };
    }
  });
}
