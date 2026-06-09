import type { AgentState } from "../../shared/types";
import { rewritePrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

export async function rewriteNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "rewriteNode",
    traceStage: "rewrite",
    input: {
      rewriteRequired: state.rewriteRequired,
      evaluation: state.evaluation,
      mvpPrd: state.mvpPrd
    },
    execute: async () => {
      await completeWithPrompt(
        deps,
        state,
        "rewriteResult",
        rewritePrompt.buildPrompt({
          rewriteRequired: state.rewriteRequired,
          evaluation: state.evaluation,
          mvpPrd: state.mvpPrd
        })
      );

      const rewrittenOutput = state.rewriteRequired
        ? "建议先收窄目标用户和 MVP 范围，补充真实搜索证据后重写竞品分析与 PRD 风险部分。"
        : "当前评分达到 75 分以上，暂不需要重写；后续可在接入真实搜索后优化证据质量。";

      return { rewrittenOutput };
    }
  });
}
