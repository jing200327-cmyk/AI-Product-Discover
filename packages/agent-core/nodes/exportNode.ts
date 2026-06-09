import type { AgentState, ExportResult } from "../../shared/types";
import type { JsonExportOutput } from "../tools/jsonExportTool";
import type { MarkdownExportOutput } from "../tools/markdownExportTool";
import type { MermaidOutput } from "../tools/mermaidTool";
import { runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

export async function exportNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "exportNode",
    traceStage: "export",
    stateStage: "completed",
    input: {
      mvpPrd: state.mvpPrd,
      pages: state.pages,
      evaluation: state.evaluation
    },
    execute: async () => {
      const markdownResult = await deps.toolRegistry.execute<MarkdownExportOutput>(
        "markdownExport",
        state,
        {
          state,
          traceLogger: deps.traceLogger
        }
      );
      const jsonResult = await deps.toolRegistry.execute<JsonExportOutput>(
        "jsonExport",
        state,
        {
          state,
          traceLogger: deps.traceLogger
        }
      );
      const mermaidResult = await deps.toolRegistry.execute<MermaidOutput>(
        "mermaid",
        {
          pageStructure: state.pages
        },
        {
          state,
          traceLogger: deps.traceLogger
        }
      );
      const exports: ExportResult = {
        markdown: markdownResult.output.markdown,
        json: jsonResult.output.json,
        mermaid: mermaidResult.output.mermaid
      };
      const toolErrors = [
        markdownResult.error,
        jsonResult.error,
        mermaidResult.error
      ].filter((error) => error !== undefined);

      return {
        exports,
        trace: [
          ...state.trace,
          markdownResult.traceEvent,
          jsonResult.traceEvent,
          mermaidResult.traceEvent
        ],
        errors: [...state.errors, ...toolErrors]
      };
    }
  });
}
