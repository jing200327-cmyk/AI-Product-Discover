import type {
  AgentState,
  EvaluationDimensionResult,
  EvaluationResult
} from "../../shared/types";

const clampScore = (score: number): number =>
  Math.max(0, Math.min(100, Math.round(score)));

const average = (values: number[]): number =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const createDimension = (
  score: number,
  weight: number,
  rationale: string,
  deductions: string[],
  recommendations: string[]
): EvaluationDimensionResult => ({
  score: clampScore(score),
  weight,
  rationale,
  deductions,
  recommendations
});

const scoreCompleteness = (state: AgentState): EvaluationDimensionResult => {
  const profile = state.productDiscoveryProfile;
  const checks = [
    Boolean(state.context || profile?.targetUsers.value.length),
    state.clarificationQuestions.length > 0 ||
      Boolean(profile?.clarificationQuestions.length),
    Boolean(state.researchPlan || profile?.step7ResearchPlan),
    state.evidence.length > 0,
    state.competitors.length > 0 ||
      Boolean(profile?.step10CompetitorAnalysisTable),
    state.personas.length > 0 || Boolean(profile?.step11UserPersonas),
    Boolean(state.mvpPrd || profile?.step12MvpPrd),
    state.pages.length > 0 || Boolean(profile?.step12MvpPrd?.mvpPrd.userFlow.length)
  ];
  const missing = [
    !state.context && !profile?.targetUsers.value.length && "产品理解",
    state.clarificationQuestions.length === 0 &&
      !profile?.clarificationQuestions.length &&
      "澄清问题",
    !state.researchPlan && !profile?.step7ResearchPlan && "研究计划",
    state.evidence.length === 0 && "证据摘要",
    state.competitors.length === 0 &&
      !profile?.step10CompetitorAnalysisTable &&
      "竞品分析",
    state.personas.length === 0 && !profile?.step11UserPersonas && "用户画像",
    !state.mvpPrd && !profile?.step12MvpPrd && "MVP PRD",
    state.pages.length === 0 &&
      !profile?.step12MvpPrd?.mvpPrd.userFlow.length &&
      "页面结构或用户流程"
  ].filter((item): item is string => Boolean(item));
  const score = (checks.filter(Boolean).length / checks.length) * 100;

  return createDimension(
    score,
    25,
    `已完成 ${checks.filter(Boolean).length}/${checks.length} 类核心产品发现产物。`,
    missing.map((item) => `缺少${item}`),
    missing.map((item) => `补充${item}并明确其与前序结论的关系`)
  );
};

const scoreCredibility = (state: AgentState): EvaluationDimensionResult => {
  const layeredEvidence = [
    ...(state.productDiscoveryProfile?.step8MarketAnalysis?.marketAnalysis
      .evidenceLayers ?? []),
    ...(state.productDiscoveryProfile?.step9CompetitorIdentification
      ?.competitorIdentification.evidenceLayers ?? []),
    ...(state.productDiscoveryProfile?.step10CompetitorAnalysisTable
      ?.competitorAnalysisTable.evidenceLayers ?? [])
  ];
  const facts =
    state.evidence.filter((item) => item.kind === "fact").length +
    layeredEvidence.filter((item) => item.layer === "fact").length;
  const assumptions =
    state.evidence.filter(
    (item) => item.kind === "assumption"
    ).length + layeredEvidence.filter((item) => item.layer === "assumption").length;
  const sourcedClaims = layeredEvidence.filter(
    (item) => item.sourceIds.length > 0 || item.sourceUrls.length > 0
  ).length;
  const verifiedClaims = layeredEvidence.filter(
    (item) =>
      item.layer === "fact" &&
      item.validationStatus === "verified" &&
      (item.sourceIds.length > 0 || item.sourceUrls.length > 0)
  ).length;
  const realSources = state.sources.filter(
    (source) =>
      source.sourceType !== "mock_search" &&
      !source.sourceType.includes("untrusted") &&
      !source.url?.startsWith("https://mock.local")
  );
  const relevance = average(state.sources.map((source) => source.relevanceScore));
  let score = 25;

  score += Math.min(25, realSources.length * 8);
  score += Math.min(25, facts * 8);
  score += Math.min(10, verifiedClaims * 2);
  score += Math.round(relevance * 20);
  score += state.evidence.length > 0 && assumptions <= facts ? 5 : 0;
  if (state.sources.length > 0 && realSources.length === 0) {
    score = Math.min(score, 55);
  }

  const deductions: string[] = [];
  const recommendations: string[] = [];

  if (realSources.length === 0) {
    deductions.push("当前来源均为 Mock 或未验证来源");
    recommendations.push("接入真实搜索来源，并保留标题、链接、发布时间与访问时间");
  }
  if (facts < 2) {
    deductions.push("可验证事实数量不足");
    recommendations.push("为关键市场、用户和竞品结论补充至少两条来源级事实");
  }
  if (assumptions > facts) {
    deductions.push("待验证假设多于已验证事实");
    recommendations.push("优先验证影响产品方向的高风险假设");
  }

  return createDimension(
    score,
    25,
    `包含 ${state.sources.length} 条来源、${facts} 条事实、${sourcedClaims} 条带来源结论和 ${assumptions} 条待验证假设。`,
    deductions,
    recommendations
  );
};

const scoreDifferentiation = (state: AgentState): EvaluationDimensionResult => {
  const profileRows =
    state.productDiscoveryProfile?.step10CompetitorAnalysisTable
      ?.competitorAnalysisTable.rows ?? [];
  const competitorCount = Math.max(state.competitors.length, profileRows.length);
  const competitorsWithWeaknesses = Math.max(
    state.competitors.filter((item) => item.weaknesses.length > 0).length,
    profileRows.filter((item) => item.weaknesses.length > 0).length
  );
  const competitorsWithEvidence = Math.max(
    state.competitors.filter((item) => item.evidenceIds.length > 0).length,
    profileRows.filter((item) => item.evidence.length > 0 || item.sourceUrl).length
  );
  const distinctFeatures = new Set(
    state.mvpPrd?.coreFeatures.map((feature) => feature.trim().toLowerCase()) ??
      state.productDiscoveryProfile?.step12MvpPrd?.mvpPrd.featureScope.map(
        (feature) => feature.name.trim().toLowerCase()
      ) ??
      []
  ).size;
  let score = 25;

  score += Math.min(30, competitorCount * 8);
  score += Math.min(20, competitorsWithWeaknesses * 7);
  score += Math.min(15, competitorsWithEvidence * 5);
  score += Math.min(10, distinctFeatures * 2);

  const deductions: string[] = [];
  const recommendations: string[] = [];

  if (competitorCount < 3) {
    deductions.push("竞品与替代方案覆盖不足");
    recommendations.push("至少对比直接竞品、间接竞品和现实替代方案");
  }
  if (competitorsWithWeaknesses === 0) {
    deductions.push("尚未从竞品弱点推导差异化机会");
    recommendations.push("将竞品弱点映射为可验证的差异化产品假设");
  }
  if (competitorsWithEvidence === 0) {
    deductions.push("竞品判断缺少来源证据");
    recommendations.push("为竞品能力与弱点补充来源级证据");
  }

  return createDimension(
    score,
    20,
    `分析了 ${competitorCount} 个竞品或替代方案，其中 ${competitorsWithWeaknesses} 个包含弱点判断。`,
    deductions,
    recommendations
  );
};

const scoreDevelopability = (state: AgentState): EvaluationDimensionResult => {
  const prd = state.mvpPrd;
  const discoveryPrd = state.productDiscoveryProfile?.step12MvpPrd?.mvpPrd;
  const pages = state.pages;
  let score = 15;

  if (prd || discoveryPrd) {
    score += 15;
    score += Math.min(
      15,
      (prd?.coreFeatures.length ?? discoveryPrd?.featureScope.length ?? 0) * 3
    );
    score += Math.min(
      10,
      (prd?.successMetrics.length ?? discoveryPrd?.successMetrics.length ?? 0) * 4
    );
    score += Math.min(
      10,
      (prd?.risks.length ?? discoveryPrd?.risks.length ?? 0) * 3
    );
    score += (prd?.nonGoals.length ?? discoveryPrd?.outOfScope.length ?? 0) > 0 ? 10 : 0;
    score += (discoveryPrd?.acceptanceCriteria.length ?? 0) > 0 ? 10 : 0;
  }
  if (pages.length > 0) {
    score += 10;
    score += pages.every(
      (page) =>
        page.fields.length > 0 &&
        page.operations.length > 0 &&
        page.states.length > 0 &&
        page.exceptions.length > 0
    )
      ? 15
      : 5;
  }

  const deductions: string[] = [];
  const recommendations: string[] = [];

  if (!prd && !discoveryPrd) {
    deductions.push("缺少可开发的 MVP PRD");
    recommendations.push("补充功能范围、非目标、成功指标和风险");
  } else if (
    (prd?.coreFeatures.length ?? discoveryPrd?.featureScope.length ?? 0) > 8
  ) {
    deductions.push("MVP 核心功能数量偏多，存在范围失控风险");
    recommendations.push("将 MVP 核心功能收敛至能够验证关键假设的最小集合");
  }
  if (pages.length === 0) {
    deductions.push("缺少页面结构与交互状态");
    recommendations.push("补充页面字段、操作、状态、异常和跳转");
  }

  return createDimension(
    score,
    20,
    `PRD 包含 ${prd?.coreFeatures.length ?? discoveryPrd?.featureScope.length ?? 0} 项核心功能、${prd?.successMetrics.length ?? discoveryPrd?.successMetrics.length ?? 0} 项成功指标和 ${pages.length || discoveryPrd?.userFlow.length || 0} 个页面或流程规格。`,
    deductions,
    recommendations
  );
};

const scoreClarity = (state: AgentState): EvaluationDimensionResult => {
  const structuredOutputs = [
    state.context || state.productDiscoveryProfile?.targetUsers,
    state.researchPlan || state.productDiscoveryProfile?.step7ResearchPlan,
    state.mvpPrd || state.productDiscoveryProfile?.step12MvpPrd,
    state.productDiscoveryProfile?.step10CompetitorAnalysisTable
  ].filter(Boolean).length;
  const traceCoverage = state.trace.length > 0 ? 20 : 0;
  const errorPenalty = Math.min(30, state.errors.length * 10);
  const score = 45 + structuredOutputs * 10 + traceCoverage - errorPenalty;
  const deductions =
    state.errors.length > 0
      ? [`流程中存在 ${state.errors.length} 个未解决错误`]
      : [];

  return createDimension(
    score,
    10,
    `核心输出采用结构化对象，当前记录 ${state.trace.length} 条 Trace。`,
    deductions,
    deductions.length > 0 ? ["修复错误并确保输出字段可被后续节点直接消费"] : []
  );
};

export function scoreProductDiscoveryOutput(state: AgentState): EvaluationResult {
  const completeness = scoreCompleteness(state);
  const credibility = scoreCredibility(state);
  const differentiation = scoreDifferentiation(state);
  const developability = scoreDevelopability(state);
  const clarity = scoreClarity(state);
  const dimensions = {
    completeness,
    credibility,
    differentiation,
    developability,
    clarity
  };
  const totalScore = clampScore(
    Object.values(dimensions).reduce(
      (sum, dimension) => sum + dimension.score * (dimension.weight / 100),
      0
    )
  );
  const deductionReasons = Object.values(dimensions).flatMap(
    (dimension) => dimension.deductions
  );
  const recommendations = Object.values(dimensions).flatMap(
    (dimension) => dimension.recommendations
  );

  return {
    totalScore,
    completenessScore: completeness.score,
    credibilityScore: credibility.score,
    differentiationScore: differentiation.score,
    developabilityScore: developability.score,
    clarityScore: clarity.score,
    dimensionDetails: dimensions,
    graderMode: "deterministic",
    strengths: Object.entries(dimensions)
      .filter(([, dimension]) => dimension.score >= 80)
      .map(([name, dimension]) => `${name}: ${dimension.rationale}`),
    deductionReasons,
    risks: deductionReasons.slice(0, 5),
    recommendations
  };
}
