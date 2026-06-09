import type { AgentState, EvidenceItem } from "../../shared/types";
import { searchSummaryPrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

export async function evidenceExtractorNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "evidenceExtractorNode",
    traceStage: "evidence_extraction",
    input: state.sources,
    execute: async () => {
      await completeWithPrompt(
        deps,
        state,
        "generateSearchSummary",
        searchSummaryPrompt.buildPrompt(state.sources)
      );

      const factEvidence = state.sources.slice(0, 3).map<EvidenceItem>((source, index) => ({
        id: `ev_fact_${index + 1}`,
        kind: "fact",
        claim: source.summary,
        confidence: 0.8,
        sourceIds: [source.id],
        note: "来自 Mock Search Tool 的来源摘要，真实环境需替换为可验证搜索结果。"
      }));
      const evidence: EvidenceItem[] = [
        ...factEvidence,
        {
          id: "ev_inference_1",
          kind: "inference",
          claim: "目标用户需要把研究、PRD、页面结构和评测放在同一个可追踪工作流中。",
          confidence: 0.58,
          sourceIds: factEvidence.map((item) => item.sourceIds[0]).filter(Boolean),
          note: "基于产品定位和 mock 来源的模型推断。"
        },
        {
          id: "ev_assumption_1",
          kind: "assumption",
          claim: "用户愿意接受先用 Mock 研究跑通流程，再逐步替换真实搜索 API。",
          confidence: 0.35,
          sourceIds: [],
          note: "待通过用户访谈或真实使用数据验证。"
        }
      ];

      return { evidence };
    }
  });
}
