import { createInitialAgentState } from "../state/createInitialState";
import {
  clarificationNode,
  competitorAnalystNode,
  contextUpdateNode,
  currentAlternativeNode,
  evaluationNode,
  evidenceExtractorNode,
  exportNode,
  inputParserNode,
  pageStructureNode,
  painIntensityNode,
  personaNode,
  prdWriterNode,
  researchExecutorNode,
  researchPlannerNode,
  realProblemNode,
  rewriteNode,
  searchQueryNode,
  usageScenarioNode,
  type AgentNode,
  type AgentNodeDeps
} from "../nodes";
import { createDefaultLlmProvider, createDefaultModelRouter } from "../llm";
import { createDefaultToolRegistry } from "../tools";
import type { AgentState } from "../../shared/types";

const traceLogger: AgentNodeDeps["traceLogger"] = {
  record() {
    return undefined;
  }
};

const deps: AgentNodeDeps = {
  llmProvider: createDefaultLlmProvider(),
  modelRouter: createDefaultModelRouter(),
  toolRegistry: createDefaultToolRegistry(),
  traceLogger
};

const nodes: AgentNode[] = [
  inputParserNode,
  usageScenarioNode,
  realProblemNode,
  currentAlternativeNode,
  painIntensityNode,
  clarificationNode,
  contextUpdateNode,
  researchPlannerNode,
  searchQueryNode,
  researchExecutorNode,
  evidenceExtractorNode,
  competitorAnalystNode,
  personaNode,
  prdWriterNode,
  pageStructureNode,
  evaluationNode,
  rewriteNode,
  exportNode
];

async function runMockAgent(): Promise<AgentState> {
  let state = createInitialAgentState({
    idea: "一个帮助 AI 产品经理从产品想法生成竞品分析、MVP PRD、页面结构和评分的 Agent",
    targetAudience: "AI 产品经理、创业者、独立开发者和咨询顾问",
    constraints: ["先使用 Mock LLM", "先使用 Mock Search", "所有节点必须记录 Trace"]
  });

  for (const node of nodes) {
    state = await node(state, deps);
  }

  return state;
}

async function main(): Promise<void> {
  const finalState = await runMockAgent();

  console.log("\n=== MVP PRD ===");
  console.log(JSON.stringify(finalState.mvpPrd, null, 2));

  console.log("\n=== Page Structure ===");
  console.log(JSON.stringify(finalState.pages, null, 2));

  console.log("\n=== Evaluation ===");
  console.log(JSON.stringify(finalState.evaluation, null, 2));

  console.log("\n=== Rewrite Required ===");
  console.log(finalState.rewriteRequired);

  console.log("\n=== Export Preview ===");
  console.log(finalState.exports?.markdown.slice(0, 800));

  console.log("\n=== Mermaid ===");
  console.log(finalState.exports?.mermaid);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
