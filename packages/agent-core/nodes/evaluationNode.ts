import { EvaluationResultSchema } from "../../shared/schemas";
import type {
  AgentState,
  EvaluationDimensionResult,
  EvaluationResult
} from "../../shared/types";
import { scoreProductDiscoveryOutput } from "../evaluation/scoreProductDiscoveryOutput";
import { evaluationPrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

const blendDimension = (
  baseline: EvaluationDimensionResult,
  judge: EvaluationDimensionResult
): EvaluationDimensionResult => ({
  score: Math.round(baseline.score * 0.7 + judge.score * 0.3),
  weight: baseline.weight,
  rationale: judge.rationale,
  deductions: [...new Set([...baseline.deductions, ...judge.deductions])],
  recommendations: [
    ...new Set([...baseline.recommendations, ...judge.recommendations])
  ]
});

const parseJudgeEvaluation = (raw: string): EvaluationResult | null => {
  try {
    const parsed = EvaluationResultSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const mergeEvaluation = (
  baseline: EvaluationResult,
  judge: EvaluationResult
): EvaluationResult => {
  const dimensionDetails = {
    completeness: blendDimension(
      baseline.dimensionDetails.completeness,
      judge.dimensionDetails.completeness
    ),
    credibility: blendDimension(
      baseline.dimensionDetails.credibility,
      judge.dimensionDetails.credibility
    ),
    differentiation: blendDimension(
      baseline.dimensionDetails.differentiation,
      judge.dimensionDetails.differentiation
    ),
    developability: blendDimension(
      baseline.dimensionDetails.developability,
      judge.dimensionDetails.developability
    ),
    clarity: blendDimension(
      baseline.dimensionDetails.clarity,
      judge.dimensionDetails.clarity
    )
  };
  const totalScore = Math.round(
    Object.values(dimensionDetails).reduce(
      (sum, dimension) => sum + dimension.score * (dimension.weight / 100),
      0
    )
  );

  return {
    totalScore,
    completenessScore: dimensionDetails.completeness.score,
    credibilityScore: dimensionDetails.credibility.score,
    differentiationScore: dimensionDetails.differentiation.score,
    developabilityScore: dimensionDetails.developability.score,
    clarityScore: dimensionDetails.clarity.score,
    dimensionDetails,
    graderMode: "hybrid",
    strengths: [...new Set([...baseline.strengths, ...judge.strengths])],
    deductionReasons: [
      ...new Set([...baseline.deductionReasons, ...judge.deductionReasons])
    ],
    risks: [...new Set([...baseline.risks, ...judge.risks])],
    recommendations: [
      ...new Set([...baseline.recommendations, ...judge.recommendations])
    ]
  };
};

export async function evaluationNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "evaluationNode",
    traceStage: "evaluation",
    input: {
      context: state.context,
      sources: state.sources,
      evidence: state.evidence,
      competitors: state.competitors,
      personas: state.personas,
      mvpPrd: state.mvpPrd,
      pages: state.pages,
      productDiscoveryProfile: state.productDiscoveryProfile
    },
    execute: async () => {
      const baseline = scoreProductDiscoveryOutput(state);
      const rawJudgeResult = await completeWithPrompt(
        deps,
        state,
        "evaluateProductIdea",
        evaluationPrompt.buildPrompt({
          context: state.context,
          sources: state.sources,
          evidence: state.evidence,
          competitors: state.competitors,
          personas: state.personas,
          mvpPrd: state.mvpPrd,
          pages: state.pages,
          productDiscoveryProfile: state.productDiscoveryProfile
        })
      );
      const judgeEvaluation = parseJudgeEvaluation(rawJudgeResult);
      const evaluation = judgeEvaluation
        ? mergeEvaluation(baseline, judgeEvaluation)
        : baseline;

      return {
        evaluation,
        rewriteRequired: evaluation.totalScore < 75
      };
    }
  });
}
