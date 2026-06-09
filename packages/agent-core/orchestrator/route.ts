import type { AgentState } from "../../shared/types";
import {
  isEvidenceInsufficient,
  needsClarification,
  needsSearch,
  shouldRewrite
} from "./conditions";

export type RouteNodeName =
  | "inputParserNode"
  | "usageScenarioNode"
  | "realProblemNode"
  | "currentAlternativeNode"
  | "painIntensityNode"
  | "clarificationNode"
  | "contextUpdateNode"
  | "researchPlannerNode"
  | "searchQueryNode"
  | "researchExecutorNode"
  | "evidenceExtractorNode"
  | "competitorAnalystNode"
  | "personaNode"
  | "prdWriterNode"
  | "pageStructureNode"
  | "evaluationNode"
  | "rewriteNode"
  | "exportNode";

export type RouteDecision = RouteNodeName | "waiting_for_clarification" | "done";

export type RouteContext = {
  autoAnswerClarification: boolean;
  supplementalSearchCount: number;
  maxSupplementalSearches: number;
  rewriteCount: number;
  maxRewriteAttempts: number;
};

const hasSuccessfulNode = (state: AgentState, nodeName: string): boolean =>
  state.trace.some((event) => event.nodeName === nodeName && event.status === "success");

const lastNodeName = (state: AgentState): string | undefined =>
  state.trace[state.trace.length - 1]?.nodeName;

export function routeAgentState(
  state: AgentState,
  context: RouteContext
): RouteDecision {
  if (!hasSuccessfulNode(state, "inputParserNode")) {
    return "inputParserNode";
  }

  if (!hasSuccessfulNode(state, "usageScenarioNode")) {
    return "usageScenarioNode";
  }

  if (!hasSuccessfulNode(state, "realProblemNode")) {
    return "realProblemNode";
  }

  if (!hasSuccessfulNode(state, "currentAlternativeNode")) {
    return "currentAlternativeNode";
  }

  if (!hasSuccessfulNode(state, "painIntensityNode")) {
    return "painIntensityNode";
  }

  if (!hasSuccessfulNode(state, "clarificationNode")) {
    return "clarificationNode";
  }

  if (needsClarification(state) && !context.autoAnswerClarification) {
    return "waiting_for_clarification";
  }

  if (!hasSuccessfulNode(state, "contextUpdateNode")) {
    return "contextUpdateNode";
  }

  if (!hasSuccessfulNode(state, "researchPlannerNode")) {
    return "researchPlannerNode";
  }

  if (!hasSuccessfulNode(state, "searchQueryNode")) {
    return "searchQueryNode";
  }

  if (needsSearch(state) || lastNodeName(state) === "searchQueryNode") {
    return "researchExecutorNode";
  }

  if (
    !hasSuccessfulNode(state, "evidenceExtractorNode") ||
    lastNodeName(state) === "researchExecutorNode"
  ) {
    return "evidenceExtractorNode";
  }

  if (
    isEvidenceInsufficient(state) &&
    context.supplementalSearchCount < context.maxSupplementalSearches
  ) {
    return "searchQueryNode";
  }

  if (!hasSuccessfulNode(state, "competitorAnalystNode")) {
    return "competitorAnalystNode";
  }

  if (!hasSuccessfulNode(state, "personaNode")) {
    return "personaNode";
  }

  if (!hasSuccessfulNode(state, "prdWriterNode")) {
    return "prdWriterNode";
  }

  if (!hasSuccessfulNode(state, "pageStructureNode")) {
    return "pageStructureNode";
  }

  if (!hasSuccessfulNode(state, "evaluationNode")) {
    return "evaluationNode";
  }

  if (shouldRewrite(state) && context.rewriteCount < context.maxRewriteAttempts) {
    return "rewriteNode";
  }

  if (!hasSuccessfulNode(state, "exportNode")) {
    return "exportNode";
  }

  return "done";
}
