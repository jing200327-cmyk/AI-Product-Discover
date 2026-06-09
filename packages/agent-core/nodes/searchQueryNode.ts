import type { AgentState } from "../../shared/types";
import { runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

export async function searchQueryNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "searchQueryNode",
    traceStage: "search_query",
    input: state.researchPlan,
    execute: async () => {
      const baseKeywords = state.researchPlan?.keywords.length
        ? state.researchPlan.keywords
        : [state.input.idea];
      const searchQueries = baseKeywords.slice(0, 5).map((keyword) => `${keyword} 竞品 用户 痛点`);

      return { searchQueries };
    }
  });
}
