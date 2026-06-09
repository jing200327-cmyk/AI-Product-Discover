import {
  AgentStateSchema,
  ProductIdeaInputSchema
} from "../../shared/schemas";
import type { AgentState, ProductIdeaInput } from "../../shared/types";

const createId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID()}`;

export function createInitialAgentState(input: ProductIdeaInput): AgentState {
  const parsedInput = ProductIdeaInputSchema.parse(input);
  const now = new Date().toISOString();
  const runId = createId("run");

  const state: AgentState = {
    runId,
    stage: "idea_input",
    currentStage: "idea_input",
    input: parsedInput,
    context: null,
    targetUserIdentification: null,
    productDiscoveryProfile: null,
    usageScenario: null,
    realProblem: null,
    currentAlternative: null,
    painIntensity: null,
    clarificationQuestions: [],
    clarificationAnswers: [],
    researchPlan: null,
    searchQueries: [],
    sources: [],
    evidence: [],
    competitors: [],
    personas: [],
    mvpPrd: null,
    pages: [],
    evaluation: null,
    rewriteRequired: false,
    rewrittenOutput: null,
    exports: null,
    trace: [
      {
        traceId: createId("trace"),
        runId,
        stage: "idea_input",
        nodeName: "createInitialAgentState",
        status: "success",
        input: parsedInput,
        output: {
          stage: "idea_input",
          currentStage: "idea_input"
        },
        startedAt: now,
        endedAt: now,
        durationMs: 0
      }
    ],
    errors: [],
    createdAt: now,
    updatedAt: now
  };

  return AgentStateSchema.parse(state);
}
