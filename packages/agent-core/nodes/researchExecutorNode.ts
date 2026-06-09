import type { AgentState, SourceItem } from "../../shared/types";
import { runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";
import type { MockSearchOutput } from "../tools/mockSearchTool";

const dedupeSources = (sources: SourceItem[]): SourceItem[] => {
  const seen = new Set<string>();

  return sources.filter((source) => {
    const key = source.url ?? source.title;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export async function researchExecutorNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "researchExecutorNode",
    traceStage: "market_research",
    input: state.searchQueries,
    execute: async () => {
      const result = await deps.toolRegistry.execute<MockSearchOutput>(
        "mockSearch",
        {
          searchQueries: state.searchQueries,
          limit: 3
        },
        {
          state,
          traceLogger: deps.traceLogger
        }
      );
      const sources = dedupeSources(result.output.sources);

      return {
        sources,
        trace: [...state.trace, result.traceEvent],
        errors: result.error ? [...state.errors, result.error] : state.errors
      };
    }
  });
}
