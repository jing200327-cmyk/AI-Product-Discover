import type { AgentState } from "../../shared/types";

export function needsClarification(state: AgentState): boolean {
  const requiredQuestionIds = state.clarificationQuestions
    .filter((question) => question.required)
    .map((question) => question.id);
  const answeredQuestionIds = new Set(
    state.clarificationAnswers.map((answer) => answer.questionId)
  );

  return requiredQuestionIds.some((questionId) => !answeredQuestionIds.has(questionId));
}

export function needsSearch(state: AgentState): boolean {
  return state.searchQueries.length === 0 || state.sources.length === 0;
}

export function isEvidenceInsufficient(state: AgentState): boolean {
  const factCount = state.evidence.filter((item) => item.kind === "fact").length;
  const averageRelevance =
    state.sources.length > 0
      ? state.sources.reduce((sum, source) => sum + source.relevanceScore, 0) /
        state.sources.length
      : 0;

  return state.sources.length < 3 || factCount < 2 || averageRelevance < 0.55;
}

export function isEvaluationPassed(state: AgentState): boolean {
  return (state.evaluation?.totalScore ?? 0) >= 75;
}

export function shouldRewrite(state: AgentState): boolean {
  return state.rewriteRequired && !isEvaluationPassed(state);
}
