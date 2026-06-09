import { z } from "zod";
import {
  agentStages,
  evidenceKinds,
  traceStatuses,
  type AgentError,
  type AgentState,
  type ClarificationAnswer,
  type ClarificationQuestion,
  type CompetitorItem,
  type CurrentAlternativeAnalysis,
  type EvaluationResult,
  type EvidenceItem,
  type ExportResult,
  type MvpPrd,
  type PageSpec,
  type PersonaItem,
  type PainIntensityAnalysis,
  type ProductContext,
  type ProductDiscoveryProfile,
  type ProductIdeaInput,
  type ResearchPlan,
  type RealProblemAnalysis,
  type SourceItem,
  type Step3AnalysisResult,
  type Step4ClarificationResult,
  type Step7ResearchPlanResult,
  type Step8MarketAnalysisResult,
  type Step9CompetitorIdentificationResult,
  type Step10CompetitorAnalysisTableResult,
  type Step11UserPersonaResult,
  type Step12MvpPrdResult,
  type SupplementalResearchResult,
  type TargetUser,
  type TargetUserIdentificationResult,
  type TraceEvent,
  type UserAnswer,
  type UsageScenarioAnalysis,
  type UsageScenarioCandidate
} from "./types";

const IsoDateTimeSchema = z.string().datetime({ offset: true });
const NonEmptyTextSchema = z.string().trim().min(1);
const ScoreSchema = z.number().min(0).max(100);

export const AgentStageSchema = z.enum(agentStages);
export const EvidenceKindSchema = z.enum(evidenceKinds);
export const TraceStatusSchema = z.enum(traceStatuses);

export const ProductIdeaInputSchema = z
  .object({
    idea: NonEmptyTextSchema,
    targetAudience: NonEmptyTextSchema.optional(),
    problem: NonEmptyTextSchema.optional(),
    constraints: z.array(NonEmptyTextSchema).default([])
  })
  .strict() satisfies z.ZodType<ProductIdeaInput>;

export const ProductContextSchema = z
  .object({
    summary: NonEmptyTextSchema,
    targetUsers: z.array(NonEmptyTextSchema),
    coreProblem: NonEmptyTextSchema,
    valueProposition: NonEmptyTextSchema,
    assumptions: z.array(NonEmptyTextSchema)
  })
  .strict() satisfies z.ZodType<ProductContext>;

const ConfidenceLevelSchema = z.enum(["low", "medium", "high"]);
const MvpPrioritySchema = z.enum(["low", "medium", "high"]);

export const TargetUserSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    userType: z.enum([
      "core_user",
      "secondary_user",
      "influencer",
      "decision_maker"
    ]),
    description: NonEmptyTextSchema,
    evidenceType: z.enum([
      "keyword",
      "scenario_inference",
      "task_inference",
      "business_inference"
    ]),
    evidence: z.array(NonEmptyTextSchema).min(1),
    confidence: ConfidenceLevelSchema
  })
  .strict() satisfies z.ZodType<TargetUser>;

export const TargetUserIdentificationResultSchema = z
  .object({
    step: z.literal("step2"),
    title: z.literal("目标用户识别"),
    status: z.enum(["completed", "needs_more_info"]),
    targetUsers: z.array(TargetUserSchema),
    missingInfoPrompt: NonEmptyTextSchema.optional()
  })
  .strict() satisfies z.ZodType<TargetUserIdentificationResult>;

const EvidenceSourceSchema = z.enum([
  "user_input",
  "keyword",
  "scenario_inference",
  "task_inference",
  "business_inference",
  "agent_inference",
  "user_confirmed"
]);

const DiscoveryStatusSchema = z.enum([
  "idle",
  "running",
  "completed",
  "needs_input",
  "error"
]);

const DiscoveryFieldStatusSchema = z.enum([
  "inferred",
  "confirmed",
  "needs_input"
] as const);

const DiscoveryFieldSchema = <T extends z.ZodType>(valueSchema: T) =>
  z
    .object({
      value: valueSchema,
      confidence: ConfidenceLevelSchema,
      source: EvidenceSourceSchema,
      status: DiscoveryFieldStatusSchema,
      evidence: z.array(NonEmptyTextSchema)
    })
    .strict();

export const ScenarioItemSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    targetUser: NonEmptyTextSchema,
    trigger: NonEmptyTextSchema,
    userTask: NonEmptyTextSchema,
    expectedOutcome: NonEmptyTextSchema,
    evidence: z.array(NonEmptyTextSchema),
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const ProblemItemSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    description: NonEmptyTextSchema,
    affectedScenarioId: NonEmptyTextSchema,
    rootCause: NonEmptyTextSchema,
    impact: z.enum(["low", "medium", "high"]),
    evidence: z.array(NonEmptyTextSchema),
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const AlternativeItemSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    category: z.enum([
      "manual_work",
      "general_llm",
      "template",
      "spreadsheet",
      "human_help",
      "other"
    ]),
    howItWorks: NonEmptyTextSchema,
    limitation: NonEmptyTextSchema,
    evidence: z.array(NonEmptyTextSchema),
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const PainStrengthSchema = z
  .object({
    level: z.enum(["weak", "medium", "strong", "very_strong"]),
    score: z.number().min(1).max(5),
    reasons: z.array(NonEmptyTextSchema),
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const ProductBoundarySchema = z
  .object({
    coreTask: NonEmptyTextSchema,
    targetUser: NonEmptyTextSchema,
    primaryScenario: NonEmptyTextSchema,
    inScope: z.array(NonEmptyTextSchema),
    outOfScope: z.array(NonEmptyTextSchema),
    boundaryReason: NonEmptyTextSchema
  })
  .strict();

export const RealProblemSchema = z
  .object({
    id: NonEmptyTextSchema,
    title: NonEmptyTextSchema,
    description: NonEmptyTextSchema,
    relatedScenario: NonEmptyTextSchema,
    whyReal: NonEmptyTextSchema,
    featureImplication: NonEmptyTextSchema,
    evidence: z.array(NonEmptyTextSchema),
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const FalseProblemSchema = z
  .object({
    id: NonEmptyTextSchema,
    title: NonEmptyTextSchema,
    reason: NonEmptyTextSchema,
    boundary: z.enum([
      "too_broad",
      "adjacent_problem",
      "not_core_task",
      "not_actionable"
    ])
  })
  .strict();

export const AlternativeSolutionSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    type: z.enum([
      "manual",
      "template",
      "general_ai",
      "platform_feature",
      "consultant",
      "indirect_tool"
    ]),
    description: NonEmptyTextSchema,
    howItSolves: NonEmptyTextSchema,
    weakness: NonEmptyTextSchema,
    opportunity: NonEmptyTextSchema,
    evidence: z.array(NonEmptyTextSchema),
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const PainScoreSchema = z
  .object({
    importance: z.number().int().min(1).max(5),
    frequency: z.number().int().min(1).max(5),
    urgency: z.number().int().min(1).max(5),
    currentSolutionGap: z.number().int().min(1).max(5),
    consequence: z.number().int().min(1).max(5),
    willingnessToUse: z.number().int().min(1).max(5)
  })
  .strict();

export const PainStrengthResultSchema = z
  .object({
    level: z.enum(["low", "medium", "high"]),
    totalScore: z.number().int().min(6).max(30),
    maxScore: z.literal(30),
    score: PainScoreSchema,
    reason: NonEmptyTextSchema,
    keyDrivers: z.array(NonEmptyTextSchema),
    risks: z.array(NonEmptyTextSchema),
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const Step3GapResultSchema = z
  .object({
    missingFields: z.array(NonEmptyTextSchema),
    lowConfidenceFields: z.array(NonEmptyTextSchema),
    suggestedClarificationTargets: z.array(NonEmptyTextSchema)
  })
  .strict();

export const Step3AnalysisResultSchema = z
  .object({
    productBoundary: ProductBoundarySchema,
    realProblems: z.array(RealProblemSchema).min(1),
    falseProblems: z.array(FalseProblemSchema),
    alternativeSolutions: z.array(AlternativeSolutionSchema).min(1),
    painStrength: PainStrengthResultSchema,
    gapResult: Step3GapResultSchema
  })
  .strict() satisfies z.ZodType<Step3AnalysisResult>;

const ClarificationTargetFieldSchema = z.enum([
  "target_users",
  "scenarios",
  "real_problems",
  "alternatives",
  "pain_strength",
  "desired_outcomes",
  "input_interaction",
  "generation_requirement",
  "privacy_security",
  "technical_integration",
  "operation_commercialization",
  "compatibility_extension",
  "risk_boundary",
  "mvp_scope",
  "evaluation_metric"
]);

const QuestionCategorySchema = z.enum([
  "target_user",
  "scenario",
  "real_problem",
  "alternative",
  "pain_strength",
  "input_interaction",
  "generation_requirement",
  "privacy_security",
  "technical_integration",
  "operation_commercialization",
  "compatibility_extension",
  "risk_boundary",
  "mvp_scope",
  "evaluation_metric"
]);

const ClarificationDepthSchema = z.enum([
  "discovery_basic",
  "requirement_deepening",
  "implementation_decision"
]);

const AnswerTypeSchema = z.enum(["text", "single_choice", "multiple_choice"]);
const PrioritySchema = z.enum(["high", "medium", "low"]);

export const ContextCompletenessResultSchema = z
  .object({
    hasClearTargetUsers: z.boolean(),
    hasClearScenarios: z.boolean(),
    hasClearRealProblems: z.boolean(),
    hasClearAlternatives: z.boolean(),
    hasClearPainStrength: z.boolean(),
    missingFields: z.array(ClarificationTargetFieldSchema),
    lowConfidenceFields: z.array(ClarificationTargetFieldSchema),
    overallCompleteness: ConfidenceLevelSchema,
    reason: NonEmptyTextSchema
  })
  .strict();

export const QuestionPlanSchema = z
  .object({
    depth: ClarificationDepthSchema,
    categories: z.array(QuestionCategorySchema),
    maxQuestionCount: z.number().int().min(1).max(10),
    reason: NonEmptyTextSchema
  })
  .strict();

export const Step4ClarificationQuestionSchema = z
  .object({
    id: NonEmptyTextSchema,
    category: QuestionCategorySchema,
    targetField: ClarificationTargetFieldSchema,
    question: NonEmptyTextSchema,
    reason: NonEmptyTextSchema,
    affects: z.array(NonEmptyTextSchema),
    answerType: AnswerTypeSchema,
    options: z.array(NonEmptyTextSchema).optional(),
    priority: PrioritySchema,
    required: z.boolean()
  })
  .strict();

export const Step4ClarificationResultSchema = z
  .object({
    completeness: ContextCompletenessResultSchema,
    depth: ClarificationDepthSchema,
    questionPlan: QuestionPlanSchema,
    questions: z.array(Step4ClarificationQuestionSchema).min(1).max(10)
  })
  .strict() satisfies z.ZodType<Step4ClarificationResult>;

export const OutcomeItemSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    description: NonEmptyTextSchema,
    successSignal: NonEmptyTextSchema,
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const DiscoveryClarificationQuestionSchema = z
  .object({
    id: NonEmptyTextSchema,
    category: QuestionCategorySchema.optional(),
    question: NonEmptyTextSchema,
    reason: NonEmptyTextSchema,
    targetField: ClarificationTargetFieldSchema,
    affects: z.array(NonEmptyTextSchema).optional(),
    answerType: AnswerTypeSchema.optional(),
    inputType: AnswerTypeSchema,
    options: z.array(NonEmptyTextSchema).optional(),
    priority: PrioritySchema.optional(),
    required: z.boolean()
  })
  .strict();

export const UserAnswerSchema = z
  .object({
    questionId: NonEmptyTextSchema,
    answer: z.union([NonEmptyTextSchema, z.array(NonEmptyTextSchema)]),
    answeredAt: IsoDateTimeSchema
  })
  .strict() satisfies z.ZodType<UserAnswer>;

export const DiscoveryResearchPlanSchema = z
  .object({
    researchGoals: z.array(NonEmptyTextSchema),
    keyQuestions: z.array(NonEmptyTextSchema),
    targetCompetitors: z.array(NonEmptyTextSchema),
    researchMethods: z.array(NonEmptyTextSchema),
    expectedOutputs: z.array(NonEmptyTextSchema),
    nextSteps: z.array(NonEmptyTextSchema)
  })
  .strict();

const ResearchFocusSchema = z.enum([
  "user_research",
  "competitor_research",
  "mvp_validation",
  "pricing_validation",
  "usability_testing"
]);

const ResearchQuestionCategorySchema = z.enum([
  "user_behavior",
  "pain_validation",
  "alternative_solution",
  "content_preference",
  "trust_risk",
  "pricing",
  "competitor_gap",
  "scenario_difference"
]);

const DownstreamArtifactSchema = z.enum([
  "PRD",
  "prototype",
  "MVP_scope",
  "agent_capability",
  "pricing_strategy",
  "growth_strategy",
  "evaluation_metrics"
]);

export const ResearchContextSchema = z
  .object({
    productIdea: NonEmptyTextSchema,
    coreUsers: z.array(NonEmptyTextSchema),
    coreScenario: NonEmptyTextSchema,
    realProblems: z.array(NonEmptyTextSchema),
    alternatives: z.array(NonEmptyTextSchema),
    painLevel: z.enum(["low", "medium", "high"]),
    researchFocus: z.array(ResearchFocusSchema),
    reason: NonEmptyTextSchema
  })
  .strict();

export const ResearchGoalSchema = z
  .object({
    id: NonEmptyTextSchema,
    goal: NonEmptyTextSchema,
    reason: NonEmptyTextSchema,
    relatedDecision: NonEmptyTextSchema,
    priority: PrioritySchema
  })
  .strict();

export const ResearchQuestionSchema = z
  .object({
    id: NonEmptyTextSchema,
    question: NonEmptyTextSchema,
    category: ResearchQuestionCategorySchema,
    whyImportant: NonEmptyTextSchema,
    expectedInsight: NonEmptyTextSchema,
    priority: PrioritySchema
  })
  .strict();

export const ResearchMethodSchema = z
  .object({
    id: NonEmptyTextSchema,
    method: NonEmptyTextSchema,
    purpose: NonEmptyTextSchema,
    targetParticipants: NonEmptyTextSchema.optional(),
    sampleSize: NonEmptyTextSchema.optional(),
    executionSteps: z.array(NonEmptyTextSchema),
    expectedOutput: NonEmptyTextSchema,
    priority: PrioritySchema
  })
  .strict();

export const ResearchTimelineItemSchema = z
  .object({
    id: NonEmptyTextSchema,
    phase: NonEmptyTextSchema,
    task: NonEmptyTextSchema,
    duration: NonEmptyTextSchema,
    owner: NonEmptyTextSchema,
    dependency: NonEmptyTextSchema.optional(),
    output: NonEmptyTextSchema
  })
  .strict();

export const ResearchDeliverableSchema = z
  .object({
    id: NonEmptyTextSchema,
    deliverable: NonEmptyTextSchema,
    description: NonEmptyTextSchema,
    usedFor: z.array(NonEmptyTextSchema)
  })
  .strict();

export const ResearchRiskSchema = z
  .object({
    id: NonEmptyTextSchema,
    risk: NonEmptyTextSchema,
    impact: NonEmptyTextSchema,
    mitigation: NonEmptyTextSchema,
    priority: PrioritySchema
  })
  .strict();

export const ResearchUsageSchema = z
  .object({
    id: NonEmptyTextSchema,
    usage: NonEmptyTextSchema,
    description: NonEmptyTextSchema,
    downstreamArtifact: DownstreamArtifactSchema
  })
  .strict();

export const Step7ResearchPlanSchema = z
  .object({
    title: NonEmptyTextSchema,
    summary: NonEmptyTextSchema,
    context: ResearchContextSchema,
    goals: z.array(ResearchGoalSchema).min(1),
    keyQuestions: z.array(ResearchQuestionSchema).min(1),
    methods: z.array(ResearchMethodSchema).min(1),
    timeline: z.array(ResearchTimelineItemSchema).min(1),
    deliverables: z.array(ResearchDeliverableSchema).min(1),
    risks: z.array(ResearchRiskSchema),
    usages: z.array(ResearchUsageSchema).min(1),
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const Step7ResearchPlanResultSchema = z
  .object({
    step: z.literal("step7"),
    title: z.literal("研究计划生成"),
    status: z.enum(["completed", "needs_more_info", "error"]),
    researchPlan: Step7ResearchPlanSchema
  })
  .strict() satisfies z.ZodType<Step7ResearchPlanResult>;

export const IndustryBackgroundSchema = z
  .object({
    industry: NonEmptyTextSchema,
    subMarket: NonEmptyTextSchema,
    backgroundSummary: NonEmptyTextSchema,
    keyChanges: z.array(NonEmptyTextSchema),
    relevanceToProduct: NonEmptyTextSchema,
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const TargetMarketSchema = z
  .object({
    primaryUsers: z.array(NonEmptyTextSchema),
    secondaryUsers: z.array(NonEmptyTextSchema),
    bSideCustomers: z.array(NonEmptyTextSchema),
    initialMarket: NonEmptyTextSchema,
    expansionMarket: z.array(NonEmptyTextSchema),
    marketReason: NonEmptyTextSchema,
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const MarketTrendSchema = z
  .object({
    id: NonEmptyTextSchema,
    trend: NonEmptyTextSchema,
    description: NonEmptyTextSchema,
    impactOnProduct: NonEmptyTextSchema,
    opportunityLevel: z.enum(["low", "medium", "high"]),
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const MarketUserDemandSchema = z
  .object({
    id: NonEmptyTextSchema,
    demand: NonEmptyTextSchema,
    type: z.enum(["core", "secondary", "latent"]),
    description: NonEmptyTextSchema,
    source: z.enum([
      "target_user",
      "real_problem",
      "alternative_solution",
      "pain_strength",
      "user_answer",
      "research_plan"
    ]),
    productImplication: NonEmptyTextSchema,
    priority: PrioritySchema
  })
  .strict();

export const MarketOpportunitySchema = z
  .object({
    id: NonEmptyTextSchema,
    opportunity: NonEmptyTextSchema,
    description: NonEmptyTextSchema,
    whyNow: NonEmptyTextSchema,
    targetSegment: NonEmptyTextSchema,
    productDirection: NonEmptyTextSchema,
    businessPotential: z.enum(["low", "medium", "high"]),
    validationNeeded: z.array(NonEmptyTextSchema),
    priority: PrioritySchema
  })
  .strict();

export const MarketAssumptionSchema = z
  .object({
    id: NonEmptyTextSchema,
    assumption: NonEmptyTextSchema,
    whyImportant: NonEmptyTextSchema,
    validationMethod: NonEmptyTextSchema,
    riskIfWrong: NonEmptyTextSchema,
    priority: PrioritySchema
  })
  .strict();

export const Step8MarketAnalysisResultSchema = z
  .object({
    step: z.literal("step8"),
    title: z.literal("行业与市场初步分析"),
    status: z.enum(["completed", "needs_more_info", "error"]),
    marketAnalysis: z
      .object({
        summary: NonEmptyTextSchema,
        industryBackground: IndustryBackgroundSchema,
        targetMarket: TargetMarketSchema,
        trends: z.array(MarketTrendSchema).min(1),
        userDemands: z.array(MarketUserDemandSchema).min(1),
        opportunities: z.array(MarketOpportunitySchema).min(1),
        assumptions: z.array(MarketAssumptionSchema),
        confidence: ConfidenceLevelSchema
      })
      .strict()
  })
  .strict() satisfies z.ZodType<Step8MarketAnalysisResult>;

export const CompetitorIdentificationItemSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    relation: z.enum([
      "direct_competitor",
      "indirect_competitor",
      "substitute_solution"
    ]),
    positioning: NonEmptyTextSchema,
    targetUsers: z.array(NonEmptyTextSchema),
    coreCapabilities: z.array(NonEmptyTextSchema),
    strengths: z.array(NonEmptyTextSchema),
    weaknesses: z.array(NonEmptyTextSchema),
    relationReason: NonEmptyTextSchema,
    differenceFromProduct: NonEmptyTextSchema,
    evidence: z.array(NonEmptyTextSchema).min(1),
    sourceUrl: z.string().url().optional(),
    confidence: ConfidenceLevelSchema,
    verificationStatus: z.enum(["verified", "inferred", "needs_validation"])
  })
  .strict();

export const DifferentiationOpportunitySchema = z
  .object({
    id: NonEmptyTextSchema,
    opportunity: NonEmptyTextSchema,
    competitorGap: NonEmptyTextSchema,
    productDirection: NonEmptyTextSchema,
    targetUserValue: NonEmptyTextSchema,
    validationNeeded: z.array(NonEmptyTextSchema),
    priority: PrioritySchema
  })
  .strict();

export const Step9CompetitorIdentificationResultSchema = z
  .object({
    step: z.literal("step9"),
    title: z.literal("竞品识别与分析"),
    status: z.enum(["completed", "needs_more_info", "error"]),
    competitorIdentification: z
      .object({
        summary: NonEmptyTextSchema,
        directCompetitors: z.array(CompetitorIdentificationItemSchema),
        indirectCompetitors: z.array(CompetitorIdentificationItemSchema),
        substituteSolutions: z.array(CompetitorIdentificationItemSchema),
        differentiationOpportunities: z.array(DifferentiationOpportunitySchema),
        researchGaps: z.array(NonEmptyTextSchema),
        confidence: ConfidenceLevelSchema
      })
      .strict()
  })
  .strict() satisfies z.ZodType<Step9CompetitorIdentificationResult>;

export const CompetitorAnalysisTableRowSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    relation: z.enum([
      "direct_competitor",
      "indirect_competitor",
      "substitute_solution"
    ]),
    positioning: NonEmptyTextSchema,
    targetUsers: z.array(NonEmptyTextSchema),
    coreFunctions: z.array(NonEmptyTextSchema),
    channels: z.array(NonEmptyTextSchema),
    languages: z.array(NonEmptyTextSchema),
    personalizationCapability: z.enum(["high", "medium", "low", "unknown"]),
    personalizationDescription: NonEmptyTextSchema,
    strengths: z.array(NonEmptyTextSchema),
    weaknesses: z.array(NonEmptyTextSchema),
    differentiationOpportunity: NonEmptyTextSchema,
    typicalScenarios: z.array(NonEmptyTextSchema),
    evidence: z.array(NonEmptyTextSchema).min(1),
    sourceUrl: z.string().url().optional(),
    confidence: ConfidenceLevelSchema,
    verificationStatus: z.enum(["verified", "inferred", "needs_validation"])
  })
  .strict();

export const Step10CompetitorAnalysisTableResultSchema = z
  .object({
    step: z.literal("step10"),
    title: z.literal("竞品分析表"),
    status: z.enum(["completed", "needs_more_info", "error"]),
    competitorAnalysisTable: z
      .object({
        summary: NonEmptyTextSchema,
        rows: z.array(CompetitorAnalysisTableRowSchema).min(1),
        keyFindings: z.array(NonEmptyTextSchema),
        recommendedFocus: z.array(NonEmptyTextSchema),
        researchGaps: z.array(NonEmptyTextSchema),
        confidence: ConfidenceLevelSchema
      })
      .strict()
  })
  .strict() satisfies z.ZodType<Step10CompetitorAnalysisTableResult>;

export const ProductPersonaItemSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    segment: NonEmptyTextSchema,
    role: NonEmptyTextSchema,
    profile: NonEmptyTextSchema,
    scenarios: z.array(NonEmptyTextSchema),
    painPoints: z.array(NonEmptyTextSchema),
    goals: z.array(NonEmptyTextSchema),
    motivations: z.array(NonEmptyTextSchema),
    behaviors: z.array(NonEmptyTextSchema),
    preferredChannels: z.array(NonEmptyTextSchema),
    decisionFactors: z.array(NonEmptyTextSchema),
    evidence: z.array(NonEmptyTextSchema).min(1),
    assumptions: z.array(NonEmptyTextSchema),
    confidence: ConfidenceLevelSchema
  })
  .strict();

export const Step11UserPersonaResultSchema = z
  .object({
    step: z.literal("step11"),
    title: z.literal("用户画像生成"),
    status: z.enum(["completed", "needs_more_info", "error"]),
    userPersonas: z
      .object({
        summary: NonEmptyTextSchema,
        personas: z.array(ProductPersonaItemSchema).min(1).max(4),
        commonPainPoints: z.array(NonEmptyTextSchema),
        commonMotivations: z.array(NonEmptyTextSchema),
        productImplications: z.array(NonEmptyTextSchema),
        researchGaps: z.array(NonEmptyTextSchema),
        confidence: ConfidenceLevelSchema
      })
      .strict()
  })
  .strict() satisfies z.ZodType<Step11UserPersonaResult>;

export const MvpPrdFeatureScopeItemSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    description: NonEmptyTextSchema,
    priority: z.enum(["must_have", "should_have", "could_have"]),
    rationale: NonEmptyTextSchema
  })
  .strict();

export const MvpPrdUserStorySchema = z
  .object({
    id: NonEmptyTextSchema,
    user: NonEmptyTextSchema,
    story: NonEmptyTextSchema,
    value: NonEmptyTextSchema,
    acceptanceCriteria: z.array(NonEmptyTextSchema).min(1),
    priority: z.enum(["high", "medium", "low"])
  })
  .strict();

export const MvpPrdFlowStepSchema = z
  .object({
    id: NonEmptyTextSchema,
    stepName: NonEmptyTextSchema,
    userAction: NonEmptyTextSchema,
    systemResponse: NonEmptyTextSchema,
    output: NonEmptyTextSchema
  })
  .strict();

export const MvpPrdAcceptanceCriterionSchema = z
  .object({
    id: NonEmptyTextSchema,
    criterion: NonEmptyTextSchema,
    verificationMethod: NonEmptyTextSchema,
    priority: z.enum(["high", "medium", "low"])
  })
  .strict();

export const Step12MvpPrdResultSchema = z
  .object({
    step: z.literal("step12"),
    title: z.literal("MVP PRD 生成"),
    status: z.enum(["completed", "needs_more_info", "error"]),
    mvpPrd: z
      .object({
        productName: NonEmptyTextSchema,
        background: NonEmptyTextSchema,
        goals: z.array(NonEmptyTextSchema).min(1),
        targetUsers: z.array(NonEmptyTextSchema).min(1),
        scenarios: z.array(NonEmptyTextSchema).min(1),
        featureScope: z.array(MvpPrdFeatureScopeItemSchema).min(1),
        outOfScope: z.array(NonEmptyTextSchema),
        userStories: z.array(MvpPrdUserStorySchema).min(1),
        userFlow: z.array(MvpPrdFlowStepSchema).min(1),
        acceptanceCriteria: z.array(MvpPrdAcceptanceCriterionSchema).min(1),
        successMetrics: z.array(NonEmptyTextSchema).min(1),
        risks: z.array(NonEmptyTextSchema),
        assumptions: z.array(NonEmptyTextSchema),
        confidence: ConfidenceLevelSchema
      })
      .strict()
  })
  .strict() satisfies z.ZodType<Step12MvpPrdResult>;

export const SupplementalResearchQuerySchema = z
  .object({
    id: NonEmptyTextSchema,
    query: NonEmptyTextSchema,
    reason: NonEmptyTextSchema,
    source: z.enum([
      "research_gap",
      "low_confidence",
      "assumption",
      "competitor_gap",
      "manual_followup"
    ])
  })
  .strict();

export const SupplementalResearchRoundSchema = z
  .object({
    id: NonEmptyTextSchema,
    round: z.number().int().positive(),
    triggerStage: AgentStageSchema,
    reason: NonEmptyTextSchema,
    queries: z.array(SupplementalResearchQuerySchema).min(1),
    sources: z.array(z.lazy(() => SourceItemSchema)),
    findings: z.array(NonEmptyTextSchema),
    unresolvedQuestions: z.array(NonEmptyTextSchema),
    status: z.enum(["completed", "degraded", "skipped"]),
    createdAt: IsoDateTimeSchema
  })
  .strict();

export const SupplementalResearchResultSchema = z
  .object({
    maxRounds: z.number().int().positive(),
    rounds: z.array(SupplementalResearchRoundSchema),
    latestStatus: z.enum([
      "idle",
      "completed",
      "degraded",
      "max_rounds_reached"
    ]),
    recommendedAction: NonEmptyTextSchema
  })
  .strict() satisfies z.ZodType<SupplementalResearchResult>;

export const ProductDiscoveryProfileSchema = z
  .object({
    workflowVersion: z.literal("product_discovery_v1"),
    status: DiscoveryStatusSchema,
    rawIdea: DiscoveryFieldSchema(NonEmptyTextSchema),
    targetUsers: DiscoveryFieldSchema(z.array(TargetUserSchema)),
    scenarios: DiscoveryFieldSchema(z.array(ScenarioItemSchema)),
    problems: DiscoveryFieldSchema(z.array(ProblemItemSchema)),
    alternatives: DiscoveryFieldSchema(z.array(AlternativeItemSchema)),
    painStrength: DiscoveryFieldSchema(PainStrengthSchema.nullable()),
    desiredOutcomes: DiscoveryFieldSchema(z.array(OutcomeItemSchema)),
    step3Analysis: Step3AnalysisResultSchema.nullable().default(null),
    step4Clarification: Step4ClarificationResultSchema.nullable().default(null),
    clarificationQuestions: z.array(DiscoveryClarificationQuestionSchema),
    userAnswers: z.array(UserAnswerSchema),
    revisionSummary: z.array(NonEmptyTextSchema),
    researchPlan: DiscoveryResearchPlanSchema.nullable(),
    step7ResearchPlan: Step7ResearchPlanResultSchema.nullable().default(null),
    step8MarketAnalysis: Step8MarketAnalysisResultSchema.nullable().default(null),
    step9CompetitorIdentification:
      Step9CompetitorIdentificationResultSchema.nullable().default(null),
    step10CompetitorAnalysisTable:
      Step10CompetitorAnalysisTableResultSchema.nullable().default(null),
    step11UserPersonas: Step11UserPersonaResultSchema.nullable().default(null),
    step12MvpPrd: Step12MvpPrdResultSchema.nullable().default(null),
    supplementalResearch: SupplementalResearchResultSchema.nullable().default(null)
  })
  .strict() satisfies z.ZodType<ProductDiscoveryProfile>;

export const UsageScenarioCandidateSchema = z
  .object({
    scenarioName: NonEmptyTextSchema,
    userStage: NonEmptyTextSchema,
    triggerEvent: NonEmptyTextSchema,
    userTask: NonEmptyTextSchema,
    currentDifficulty: NonEmptyTextSchema,
    currentAlternative: NonEmptyTextSchema,
    motivationToUseProduct: NonEmptyTextSchema,
    expectedOutput: NonEmptyTextSchema,
    confidence: ConfidenceLevelSchema,
    mvpPriority: MvpPrioritySchema
  })
  .strict() satisfies z.ZodType<UsageScenarioCandidate>;

export const UsageScenarioAnalysisSchema = z
  .object({
    step: z.literal("usage_scenario_analysis"),
    rawIdeaSummary: NonEmptyTextSchema,
    coreUserFromPreviousStep: z
      .object({
        segmentName: NonEmptyTextSchema,
        definition: NonEmptyTextSchema,
        confidence: ConfidenceLevelSchema
      })
      .strict(),
    explicitScenarioInfo: z
      .object({
        mentionedStage: NonEmptyTextSchema,
        mentionedTrigger: NonEmptyTextSchema,
        mentionedTask: NonEmptyTextSchema,
        mentionedGoal: NonEmptyTextSchema,
        mentionedWorkflow: z.array(NonEmptyTextSchema),
        confidence: ConfidenceLevelSchema
      })
      .strict(),
    scenarioCandidates: z.array(UsageScenarioCandidateSchema).min(1),
    recommendedPrimaryScenario: z
      .object({
        scenarioName: NonEmptyTextSchema,
        scenarioDefinition: NonEmptyTextSchema,
        coreUser: NonEmptyTextSchema,
        triggerMoment: NonEmptyTextSchema,
        mainTask: NonEmptyTextSchema,
        currentBlocker: NonEmptyTextSchema,
        whySuitableForMvp: NonEmptyTextSchema,
        successCriteria: NonEmptyTextSchema,
        risk: NonEmptyTextSchema
      })
      .strict(),
    secondaryScenarios: z.array(
      z
        .object({
          scenarioName: NonEmptyTextSchema,
          targetUser: NonEmptyTextSchema,
          reasonNotPrimary: NonEmptyTextSchema,
          futureValue: NonEmptyTextSchema
        })
        .strict()
    ),
    notRecommendedScenarios: z.array(
      z
        .object({
          scenarioName: NonEmptyTextSchema,
          reason: NonEmptyTextSchema,
          risk: NonEmptyTextSchema
        })
        .strict()
    ),
    scenarioWorkflow: z.array(
      z
        .object({
          workflowStep: NonEmptyTextSchema,
          userAction: NonEmptyTextSchema,
          systemSupport: NonEmptyTextSchema,
          outputArtifact: NonEmptyTextSchema
        })
        .strict()
    ),
    scenarioDefinitionRisks: z.array(NonEmptyTextSchema),
    clarifyingQuestions: z.array(NonEmptyTextSchema).min(3).max(5),
    readyForNextStep: z.boolean(),
    nextStep: z.literal("real_problem_analysis")
  })
  .strict() satisfies z.ZodType<UsageScenarioAnalysis>;

const PrdDifficultyTypeSchema = z.enum([
  "product_structure",
  "user_scenario",
  "real_problem",
  "business_analysis",
  "competitor_analysis",
  "requirement_expression",
  "prototype_structure",
  "technical_architecture_translation",
  "demo_task_breakdown",
  "time_saving",
  "portfolio_storytelling"
]);

const DifficultyExistenceSchema = z.enum([
  "explicit",
  "likely",
  "no_evidence",
  "not_applicable"
]);

const ImpactLevelSchema = z.enum(["high", "medium", "low", "unknown"]);

export const RealProblemAnalysisSchema = z
  .object({
    step: z.literal("real_problem_analysis"),
    rawIdeaSummary: NonEmptyTextSchema,
    coreUserFromPreviousStep: z
      .object({
        segmentName: NonEmptyTextSchema,
        definition: NonEmptyTextSchema,
        confidence: ConfidenceLevelSchema
      })
      .strict(),
    primaryScenarioFromPreviousStep: z
      .object({
        scenarioName: NonEmptyTextSchema,
        scenarioDefinition: NonEmptyTextSchema,
        confidence: ConfidenceLevelSchema
      })
      .strict(),
    surfaceNeeds: z.array(
      z
        .object({
          need: NonEmptyTextSchema,
          source: NonEmptyTextSchema,
          explicitness: z.enum(["explicit", "inferred"]),
          description: NonEmptyTextSchema
        })
        .strict()
    ),
    prdPurposeAnalysis: z.array(
      z
        .object({
          purpose: NonEmptyTextSchema,
          basis: NonEmptyTextSchema,
          confidence: ConfidenceLevelSchema,
          isCorePurpose: z.boolean()
        })
        .strict()
    ),
    prdDifficultyAnalysis: z.array(
      z
        .object({
          difficultyType: PrdDifficultyTypeSchema,
          existence: DifficultyExistenceSchema,
          basis: NonEmptyTextSchema,
          impact: ImpactLevelSchema,
          description: NonEmptyTextSchema
        })
        .strict()
    ),
    realProblemCandidates: z.array(
      z
        .object({
          problemName: NonEmptyTextSchema,
          problemDescription: NonEmptyTextSchema,
          surfaceNeed: NonEmptyTextSchema,
          rootCause: NonEmptyTextSchema,
          affectedTask: NonEmptyTextSchema,
          consequenceIfUnsolved: NonEmptyTextSchema,
          mvpPriority: MvpPrioritySchema,
          confidence: ConfidenceLevelSchema
        })
        .strict()
    ),
    recommendedCoreProblem: z
      .object({
        problemName: NonEmptyTextSchema,
        problemDefinition: NonEmptyTextSchema,
        coreUser: NonEmptyTextSchema,
        primaryScenario: NonEmptyTextSchema,
        whyUserHasThisProblem: NonEmptyTextSchema,
        whyItMatters: NonEmptyTextSchema,
        relationshipWithPrd: NonEmptyTextSchema,
        relationshipWithVibeCoding: NonEmptyTextSchema,
        whySuitableForMvp: NonEmptyTextSchema,
        problemBoundary: NonEmptyTextSchema,
        notToSolve: z.array(NonEmptyTextSchema)
      })
      .strict(),
    rootCauseTree: z
      .object({
        coreProblem: NonEmptyTextSchema,
        layers: z.array(
          z
            .object({
              layerName: NonEmptyTextSchema,
              causes: z.array(NonEmptyTextSchema)
            })
            .strict()
        )
      })
      .strict(),
    nonCoreProblems: z.array(
      z
        .object({
          problem: NonEmptyTextSchema,
          reasonNotCore: NonEmptyTextSchema,
          risk: NonEmptyTextSchema
        })
        .strict()
    ),
    problemDefinitionRisks: z.array(NonEmptyTextSchema),
    clarifyingQuestions: z.array(NonEmptyTextSchema).min(3).max(5),
    readyForNextStep: z.boolean(),
    nextStep: z.literal("current_alternative_analysis")
  })
  .strict() satisfies z.ZodType<RealProblemAnalysis>;

const AlternativeSolutionCategorySchema = z.enum([
  "general_llm",
  "template",
  "prototype_tool",
  "coding_tool",
  "demo_builder",
  "search_tool",
  "competitor_research_tool",
  "manual_work",
  "human_help",
  "reference_project",
  "other"
]);

const StrengthLevelSchema = z.enum(["low", "medium", "high"]);

export const CurrentAlternativeAnalysisSchema = z
  .object({
    step: z.literal("current_alternative_analysis"),
    rawIdeaSummary: NonEmptyTextSchema,
    coreUserFromPreviousStep: z
      .object({
        segmentName: NonEmptyTextSchema,
        definition: NonEmptyTextSchema,
        confidence: ConfidenceLevelSchema
      })
      .strict(),
    primaryScenarioFromPreviousStep: z
      .object({
        scenarioName: NonEmptyTextSchema,
        scenarioDefinition: NonEmptyTextSchema,
        confidence: ConfidenceLevelSchema
      })
      .strict(),
    coreProblemFromPreviousStep: z
      .object({
        problemName: NonEmptyTextSchema,
        problemDefinition: NonEmptyTextSchema,
        confidence: ConfidenceLevelSchema
      })
      .strict(),
    currentSolutionPaths: z.array(
      z
        .object({
          pathName: NonEmptyTextSchema,
          workflow: z.array(NonEmptyTextSchema),
          description: NonEmptyTextSchema
        })
        .strict()
    ),
    alternativeSolutions: z.array(
      z
        .object({
          alternativeName: NonEmptyTextSchema,
          category: AlternativeSolutionCategorySchema,
          howUserUsesIt: NonEmptyTextSchema,
          coveredTasks: z.array(NonEmptyTextSchema),
          advantages: z.array(NonEmptyTextSchema),
          limitations: z.array(NonEmptyTextSchema),
          substitutionStrength: StrengthLevelSchema,
          threatToProduct: StrengthLevelSchema
        })
        .strict()
    ),
    llmAlternativeAnalysis: z
      .object({
        canReplace: z.array(NonEmptyTextSchema),
        cannotReplace: z.array(NonEmptyTextSchema),
        requiredProductAdvantage: z.array(NonEmptyTextSchema)
      })
      .strict(),
    templateAlternativeAnalysis: z
      .object({
        canReplace: z.array(NonEmptyTextSchema),
        cannotReplace: z.array(NonEmptyTextSchema),
        requiredProductAdvantage: z.array(NonEmptyTextSchema)
      })
      .strict(),
    vibeCodingToolAnalysis: z
      .object({
        canReplace: z.array(NonEmptyTextSchema),
        cannotReplace: z.array(NonEmptyTextSchema),
        bestIntegrationPoint: NonEmptyTextSchema,
        requiredProductAdvantage: z.array(NonEmptyTextSchema)
      })
      .strict(),
    workflowCoverageAnalysis: z.array(
      z
        .object({
          alternativeName: NonEmptyTextSchema,
          coveredWorkflowSteps: z.array(NonEmptyTextSchema),
          missingWorkflowSteps: z.array(NonEmptyTextSchema),
          biggestGap: NonEmptyTextSchema,
          endToEndSupport: z.boolean()
        })
        .strict()
    ),
    productDifferentiation: z.array(
      z
        .object({
          direction: NonEmptyTextSchema,
          whyImportant: NonEmptyTextSchema,
          alternativeWeaknessAddressed: NonEmptyTextSchema,
          requiredProductCapability: NonEmptyTextSchema
        })
        .strict()
    ),
    replacementRisks: z.array(
      z
        .object({
          risk: NonEmptyTextSchema,
          replacedBy: NonEmptyTextSchema,
          reason: NonEmptyTextSchema,
          riskLevel: StrengthLevelSchema,
          mitigationStrategy: NonEmptyTextSchema
        })
        .strict()
    ),
    clarifyingQuestions: z.array(NonEmptyTextSchema).min(3).max(5),
    readyForNextStep: z.boolean(),
    nextStep: z.literal("pain_intensity_analysis")
  })
  .strict() satisfies z.ZodType<CurrentAlternativeAnalysis>;

const PainTypeSchema = z.enum([
  "capability_gap",
  "path_gap",
  "expression_translation",
  "result_delivery",
  "efficiency",
  "trust_quality"
]);

const PainScoreDimensionSchema = z.enum([
  "frequency",
  "goal_importance",
  "current_solution_cost",
  "alternative_inefficiency",
  "active_solving_willingness",
  "payment_willingness",
  "result_verifiability",
  "mvp_entry_value"
]);

const PainLevelSchema = z.enum(["weak", "medium", "strong", "very_strong"]);

export const PainIntensityAnalysisSchema = z
  .object({
    step: z.literal("pain_intensity_analysis"),
    rawIdeaSummary: NonEmptyTextSchema,
    coreUserFromPreviousStep: z
      .object({
        segmentName: NonEmptyTextSchema,
        definition: NonEmptyTextSchema,
        confidence: ConfidenceLevelSchema
      })
      .strict(),
    primaryScenarioFromPreviousStep: z
      .object({
        scenarioName: NonEmptyTextSchema,
        scenarioDefinition: NonEmptyTextSchema,
        confidence: ConfidenceLevelSchema
      })
      .strict(),
    coreProblemFromPreviousStep: z
      .object({
        problemName: NonEmptyTextSchema,
        problemDefinition: NonEmptyTextSchema,
        confidence: ConfidenceLevelSchema
      })
      .strict(),
    alternativeSolutionSummary: z
      .object({
        mainAlternatives: z.array(NonEmptyTextSchema),
        mainLimitations: z.array(NonEmptyTextSchema),
        confidence: ConfidenceLevelSchema
      })
      .strict(),
    painPointDefinition: z
      .object({
        surfacePain: NonEmptyTextSchema,
        deepPain: NonEmptyTextSchema,
        affectedGoal: NonEmptyTextSchema
      })
      .strict(),
    painTypeAnalysis: z.array(
      z
        .object({
          painType: PainTypeSchema,
          existence: DifficultyExistenceSchema,
          basis: NonEmptyTextSchema,
          impact: ImpactLevelSchema
        })
        .strict()
    ),
    painIntensityScores: z.array(
      z
        .object({
          dimension: PainScoreDimensionSchema,
          score: z.number().min(1).max(5),
          basis: NonEmptyTextSchema,
          description: NonEmptyTextSchema
        })
        .strict()
    ),
    keyJudgmentAnswers: z
      .object({
        frequency: z
          .object({
            judgment: NonEmptyTextSchema,
            basis: NonEmptyTextSchema,
            uncertainty: NonEmptyTextSchema
          })
          .strict(),
        timeWillingness: z
          .object({
            judgment: NonEmptyTextSchema,
            basis: NonEmptyTextSchema,
            uncertainty: NonEmptyTextSchema
          })
          .strict(),
        paymentWillingness: z
          .object({
            judgment: NonEmptyTextSchema,
            basis: NonEmptyTextSchema,
            uncertainty: NonEmptyTextSchema
          })
          .strict(),
        alternativeInefficiency: z
          .object({
            judgment: NonEmptyTextSchema,
            basis: NonEmptyTextSchema,
            uncertainty: NonEmptyTextSchema
          })
          .strict(),
        importantGoalImpact: z
          .object({
            judgment: NonEmptyTextSchema,
            basis: NonEmptyTextSchema,
            uncertainty: NonEmptyTextSchema
          })
          .strict(),
        hackyWorkaroundExisting: z
          .object({
            judgment: NonEmptyTextSchema,
            basis: NonEmptyTextSchema,
            uncertainty: NonEmptyTextSchema
          })
          .strict()
      })
      .strict(),
    strongPainEvidence: z.array(
      z
        .object({
          evidence: NonEmptyTextSchema,
          source: NonEmptyTextSchema,
          description: NonEmptyTextSchema
        })
        .strict()
    ),
    weakPainOrRiskEvidence: z.array(
      z
        .object({
          evidence: NonEmptyTextSchema,
          description: NonEmptyTextSchema,
          potentialImpact: NonEmptyTextSchema
        })
        .strict()
    ),
    overallPainAssessment: z
      .object({
        averageScore: z.number().min(1).max(5),
        painLevel: PainLevelSchema,
        reason: NonEmptyTextSchema,
        suitableAsMvpCorePain: z.boolean(),
        needToNarrowUser: z.boolean(),
        needToNarrowScenario: z.boolean(),
        needToRedefineProblem: z.boolean()
      })
      .strict(),
    mvpValueJudgment: z
      .object({
        worthMvp: z.boolean(),
        reasons: z.array(NonEmptyTextSchema),
        notJustPrdGenerator: NonEmptyTextSchema,
        notJustEfficiencyTool: NonEmptyTextSchema,
        recommendedMvpPainDefinition: NonEmptyTextSchema
      })
      .strict(),
    painAnalysisRisks: z.array(NonEmptyTextSchema),
    clarifyingQuestions: z.array(NonEmptyTextSchema).min(3).max(5),
    readyForNextStep: z.boolean(),
    nextStep: z.literal("target_outcome_definition")
  })
  .strict() satisfies z.ZodType<PainIntensityAnalysis>;

export const ClarificationQuestionSchema = z
  .object({
    id: NonEmptyTextSchema,
    question: NonEmptyTextSchema,
    reason: NonEmptyTextSchema,
    required: z.boolean()
  })
  .strict() satisfies z.ZodType<ClarificationQuestion>;

export const ClarificationAnswerSchema = z
  .object({
    questionId: NonEmptyTextSchema,
    answer: NonEmptyTextSchema,
    isMock: z.boolean()
  })
  .strict() satisfies z.ZodType<ClarificationAnswer>;

export const ResearchPlanSchema = z
  .object({
    goals: z.array(NonEmptyTextSchema),
    keywords: z.array(NonEmptyTextSchema),
    questions: z.array(NonEmptyTextSchema),
    targetMarkets: z.array(NonEmptyTextSchema),
    competitorCategories: z.array(NonEmptyTextSchema)
  })
  .strict() satisfies z.ZodType<ResearchPlan>;

export const SourceItemSchema = z
  .object({
    id: NonEmptyTextSchema,
    title: NonEmptyTextSchema,
    url: z.url().optional(),
    sourceType: NonEmptyTextSchema,
    publisher: NonEmptyTextSchema.optional(),
    publishedAt: IsoDateTimeSchema,
    accessedAt: IsoDateTimeSchema,
    summary: NonEmptyTextSchema,
    relevanceScore: z.number().min(0).max(1)
  })
  .strict() satisfies z.ZodType<SourceItem>;

export const EvidenceSchema = z
  .object({
    id: NonEmptyTextSchema,
    kind: EvidenceKindSchema,
    claim: NonEmptyTextSchema,
    confidence: z.number().min(0).max(1),
    sourceIds: z.array(NonEmptyTextSchema),
    note: NonEmptyTextSchema.optional()
  })
  .strict() satisfies z.ZodType<EvidenceItem>;

export const CompetitorItemSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    website: z.url().optional(),
    category: NonEmptyTextSchema,
    targetUsers: z.array(NonEmptyTextSchema),
    coreFeatures: z.array(NonEmptyTextSchema),
    strengths: z.array(NonEmptyTextSchema),
    weaknesses: z.array(NonEmptyTextSchema),
    pricing: NonEmptyTextSchema.optional(),
    evidenceIds: z.array(NonEmptyTextSchema)
  })
  .strict() satisfies z.ZodType<CompetitorItem>;

export const PersonaItemSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    segment: NonEmptyTextSchema,
    goals: z.array(NonEmptyTextSchema),
    pains: z.array(NonEmptyTextSchema),
    behaviors: z.array(NonEmptyTextSchema),
    jobsToBeDone: z.array(NonEmptyTextSchema)
  })
  .strict() satisfies z.ZodType<PersonaItem>;

export const MvpPrdSchema = z
  .object({
    title: NonEmptyTextSchema,
    problemStatement: NonEmptyTextSchema,
    targetUsers: z.array(NonEmptyTextSchema),
    goals: z.array(NonEmptyTextSchema),
    nonGoals: z.array(NonEmptyTextSchema),
    coreFeatures: z.array(NonEmptyTextSchema),
    successMetrics: z.array(NonEmptyTextSchema),
    risks: z.array(NonEmptyTextSchema)
  })
  .strict() satisfies z.ZodType<MvpPrd>;

export const PageSpecSchema = z
  .object({
    id: NonEmptyTextSchema,
    name: NonEmptyTextSchema,
    route: z.string().trim().regex(/^\/[a-z0-9\-/_]*$/),
    purpose: NonEmptyTextSchema,
    modules: z.array(NonEmptyTextSchema),
    fields: z.array(NonEmptyTextSchema),
    operations: z.array(NonEmptyTextSchema),
    states: z.array(NonEmptyTextSchema),
    exceptions: z.array(NonEmptyTextSchema),
    transitions: z.array(NonEmptyTextSchema),
    primaryActions: z.array(NonEmptyTextSchema),
    sections: z.array(NonEmptyTextSchema),
    dataNeeded: z.array(NonEmptyTextSchema)
  })
  .strict() satisfies z.ZodType<PageSpec>;

export const EvaluationResultSchema = z
  .object({
    totalScore: ScoreSchema,
    marketScore: ScoreSchema,
    userPainScore: ScoreSchema,
    differentiationScore: ScoreSchema,
    feasibilityScore: ScoreSchema,
    evidenceQualityScore: ScoreSchema,
    strengths: z.array(NonEmptyTextSchema),
    deductionReasons: z.array(NonEmptyTextSchema),
    risks: z.array(NonEmptyTextSchema),
    recommendations: z.array(NonEmptyTextSchema)
  })
  .strict() satisfies z.ZodType<EvaluationResult>;

export const ExportResultSchema = z
  .object({
    markdown: NonEmptyTextSchema,
    json: NonEmptyTextSchema,
    mermaid: NonEmptyTextSchema.optional()
  })
  .strict() satisfies z.ZodType<ExportResult>;

export const AgentErrorSchema = z
  .object({
    code: NonEmptyTextSchema,
    message: NonEmptyTextSchema,
    stage: AgentStageSchema.optional(),
    cause: NonEmptyTextSchema.optional()
  })
  .strict() satisfies z.ZodType<AgentError>;

export const TraceEventSchema = z
  .object({
    traceId: NonEmptyTextSchema,
    runId: NonEmptyTextSchema,
    stage: AgentStageSchema,
    nodeName: NonEmptyTextSchema,
    status: TraceStatusSchema,
    input: z.unknown(),
    output: z.unknown(),
    startedAt: IsoDateTimeSchema,
    endedAt: IsoDateTimeSchema.optional(),
    durationMs: z.number().nonnegative().optional(),
    error: AgentErrorSchema.optional()
  })
  .strict() satisfies z.ZodType<TraceEvent>;

export const AgentStateSchema = z
  .object({
    runId: NonEmptyTextSchema,
    stage: AgentStageSchema,
    currentStage: AgentStageSchema,
    input: ProductIdeaInputSchema,
    context: ProductContextSchema.nullable(),
    targetUserIdentification: TargetUserIdentificationResultSchema.nullable(),
    productDiscoveryProfile: ProductDiscoveryProfileSchema.nullable(),
    usageScenario: UsageScenarioAnalysisSchema.nullable(),
    realProblem: RealProblemAnalysisSchema.nullable(),
    currentAlternative: CurrentAlternativeAnalysisSchema.nullable(),
    painIntensity: PainIntensityAnalysisSchema.nullable(),
    clarificationQuestions: z.array(ClarificationQuestionSchema),
    clarificationAnswers: z.array(ClarificationAnswerSchema),
    researchPlan: ResearchPlanSchema.nullable(),
    searchQueries: z.array(NonEmptyTextSchema),
    sources: z.array(SourceItemSchema),
    evidence: z.array(EvidenceSchema),
    competitors: z.array(CompetitorItemSchema),
    personas: z.array(PersonaItemSchema),
    mvpPrd: MvpPrdSchema.nullable(),
    pages: z.array(PageSpecSchema),
    evaluation: EvaluationResultSchema.nullable(),
    rewriteRequired: z.boolean(),
    rewrittenOutput: NonEmptyTextSchema.nullable(),
    exports: ExportResultSchema.nullable(),
    trace: z.array(TraceEventSchema),
    errors: z.array(AgentErrorSchema),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema
  })
  .strict() satisfies z.ZodType<AgentState>;
