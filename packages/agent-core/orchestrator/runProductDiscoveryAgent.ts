import { randomUUID } from "node:crypto";
import { AgentStateSchema } from "../../shared/schemas";
import type {
  AgentState,
  ClarificationAnswer,
  ProductIdeaInput,
  TraceEvent
} from "../../shared/types";
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
import { createInitialAgentState } from "../state/createInitialState";
import { createDefaultToolRegistry } from "../tools";
import { isEvidenceInsufficient, needsClarification } from "./conditions";
import {
  routeAgentState,
  type RouteContext,
  type RouteNodeName
} from "./route";

export type AgentEvent = {
  stage: string;
  message: string;
  stateSnapshot: AgentState;
};

export type RunProductDiscoveryAgentOptions = {
  autoAnswerClarification?: boolean;
  maxSupplementalSearches?: number;
  maxRewriteAttempts?: number;
  deps?: Partial<AgentNodeDeps>;
  onEvent?: (event: AgentEvent) => Promise<void> | void;
};

const nodeMap: Record<RouteNodeName, AgentNode> = {
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
};

const createDefaultDeps = (): AgentNodeDeps => ({
  llmProvider: createDefaultLlmProvider(),
  modelRouter: createDefaultModelRouter(),
  toolRegistry: createDefaultToolRegistry(),
  traceLogger: {
    record() {
      return undefined;
    }
  }
});

const createTraceId = (): string => `trace_${Date.now().toString(36)}_${randomUUID()}`;

const emit = async (
  options: RunProductDiscoveryAgentOptions,
  event: AgentEvent
): Promise<void> => {
  await options.onEvent?.(event);
};

const mergeDeps = (overrides?: Partial<AgentNodeDeps>): AgentNodeDeps => ({
  ...createDefaultDeps(),
  ...overrides
});

async function autoAnswerClarification(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  if (!needsClarification(state)) {
    return state;
  }

  const startedAt = new Date();
  const clarificationAnswers: ClarificationAnswer[] = state.clarificationQuestions.map(
    (question) => ({
      questionId: question.id,
      answer: `Mock answer: ${question.question}`,
      isMock: true
    })
  );
  const endedAt = new Date();
  const event: TraceEvent = {
    traceId: createTraceId(),
    runId: state.runId,
    stage: "clarification",
    nodeName: "autoAnswerClarification",
    status: "success",
    input: state.clarificationQuestions,
    output: clarificationAnswers,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime()
  };

  await deps.traceLogger.record(event);

  return AgentStateSchema.parse({
    ...state,
    clarificationAnswers,
    trace: [...state.trace, event],
    updatedAt: endedAt.toISOString()
  });
}

export async function runProductDiscoveryAgent(
  input: ProductIdeaInput,
  options: RunProductDiscoveryAgentOptions = {}
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  let state = createInitialAgentState(input);
  const routeContext: RouteContext = {
    autoAnswerClarification: options.autoAnswerClarification ?? false,
    supplementalSearchCount: 0,
    maxSupplementalSearches: options.maxSupplementalSearches ?? 2,
    rewriteCount: 0,
    maxRewriteAttempts: options.maxRewriteAttempts ?? 1
  };

  await emit(options, {
    stage: state.stage,
    message: "Agent initialized",
    stateSnapshot: state
  });

  for (let step = 0; step < 64; step += 1) {
    let decision = routeAgentState(state, routeContext);

    if (
      decision === "waiting_for_clarification" &&
      routeContext.autoAnswerClarification
    ) {
      state = await autoAnswerClarification(state, deps);
      await emit(options, {
        stage: state.stage,
        message: "Clarification questions auto-answered with mock answers",
        stateSnapshot: state
      });
      decision = routeAgentState(state, routeContext);
    }

    if (decision === "waiting_for_clarification") {
      await emit(options, {
        stage: state.stage,
        message: "Waiting for clarification answers",
        stateSnapshot: state
      });
      return state;
    }

    if (decision === "done") {
      await emit(options, {
        stage: state.stage,
        message: "Agent completed",
        stateSnapshot: state
      });
      return state;
    }

    if (
      decision === "searchQueryNode" &&
      isEvidenceInsufficient(state) &&
      state.evidence.length > 0
    ) {
      routeContext.supplementalSearchCount += 1;
    }

    if (decision === "rewriteNode") {
      routeContext.rewriteCount += 1;
    }

    await emit(options, {
      stage: state.stage,
      message: `Running ${decision}`,
      stateSnapshot: state
    });

    state = await nodeMap[decision](state, deps);

    if (
      decision === "clarificationNode" &&
      routeContext.autoAnswerClarification &&
      needsClarification(state)
    ) {
      state = await autoAnswerClarification(state, deps);
      await emit(options, {
        stage: state.stage,
        message: "Clarification questions auto-answered with mock answers",
        stateSnapshot: state
      });
    }

    await emit(options, {
      stage: state.stage,
      message: `Finished ${decision}`,
      stateSnapshot: state
    });
  }

  throw new Error("Agent orchestration exceeded max step count");
}
