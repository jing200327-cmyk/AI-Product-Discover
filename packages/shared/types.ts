export const agentStages = [
  "idea_input",
  "product_context",
  "usage_scenario",
  "real_problem",
  "current_alternative",
  "pain_intensity",
  "clarification",
  "research_plan",
  "market_analysis",
  "supplemental_research",
  "search_query",
  "market_research",
  "evidence_extraction",
  "competitor_analysis",
  "persona_generation",
  "prd_generation",
  "page_structure",
  "evaluation",
  "rewrite",
  "export",
  "completed"
] as const;

export type AgentStage = (typeof agentStages)[number];

export const evidenceKinds = ["fact", "inference", "assumption"] as const;

export type EvidenceKind = (typeof evidenceKinds)[number];

export const traceStatuses = [
  "pending",
  "running",
  "success",
  "degraded",
  "error"
] as const;

export type TraceStatus = (typeof traceStatuses)[number];

export type ProductIdeaInput = {
  idea: string;
  targetAudience?: string;
  problem?: string;
  constraints?: string[];
};

export type ProductContext = {
  summary: string;
  targetUsers: string[];
  coreProblem: string;
  valueProposition: string;
  assumptions: string[];
};

export type ConfidenceLevel = "low" | "medium" | "high";

export type Confidence = ConfidenceLevel;

export type EvidenceSource =
  | "user_input"
  | "keyword"
  | "scenario_inference"
  | "task_inference"
  | "business_inference"
  | "agent_inference"
  | "user_confirmed";

export type DiscoveryStatus =
  | "idle"
  | "running"
  | "completed"
  | "needs_input"
  | "error";

export type DiscoveryField<T> = {
  value: T;
  confidence: Confidence;
  source: EvidenceSource;
  status: "inferred" | "confirmed" | "needs_input";
  evidence: string[];
};

export type TargetUserType =
  | "core_user"
  | "secondary_user"
  | "influencer"
  | "decision_maker";

export type TargetUserEvidenceType =
  | "keyword"
  | "scenario_inference"
  | "task_inference"
  | "business_inference";

export type TargetUser = {
  id: string;
  name: string;
  userType: TargetUserType;
  description: string;
  evidenceType: TargetUserEvidenceType;
  evidence: string[];
  confidence: ConfidenceLevel;
};

export type TargetUserIdentificationResult = {
  step: "step2";
  title: "目标用户识别";
  status: "completed" | "needs_more_info";
  targetUsers: TargetUser[];
  missingInfoPrompt?: string;
};

export type ScenarioItem = {
  id: string;
  name: string;
  targetUser: string;
  trigger: string;
  userTask: string;
  expectedOutcome: string;
  evidence: string[];
  confidence: Confidence;
};

export type ProblemItem = {
  id: string;
  name: string;
  description: string;
  affectedScenarioId: string;
  rootCause: string;
  impact: "low" | "medium" | "high";
  evidence: string[];
  confidence: Confidence;
};

export type AlternativeItem = {
  id: string;
  name: string;
  category: "manual_work" | "general_llm" | "template" | "spreadsheet" | "human_help" | "other";
  howItWorks: string;
  limitation: string;
  evidence: string[];
  confidence: Confidence;
};

export type PainStrength = {
  level: "weak" | "medium" | "strong" | "very_strong";
  score: number;
  reasons: string[];
  confidence: Confidence;
};

export type ProductBoundary = {
  coreTask: string;
  targetUser: string;
  primaryScenario: string;
  inScope: string[];
  outOfScope: string[];
  boundaryReason: string;
};

export type RealProblem = {
  id: string;
  title: string;
  description: string;
  relatedScenario: string;
  whyReal: string;
  featureImplication: string;
  evidence: string[];
  confidence: Confidence;
};

export type FalseProblem = {
  id: string;
  title: string;
  reason: string;
  boundary: "too_broad" | "adjacent_problem" | "not_core_task" | "not_actionable";
};

export type AlternativeSolution = {
  id: string;
  name: string;
  type:
    | "manual"
    | "template"
    | "general_ai"
    | "platform_feature"
    | "consultant"
    | "indirect_tool";
  description: string;
  howItSolves: string;
  weakness: string;
  opportunity: string;
  evidence: string[];
  confidence: Confidence;
};

export type PainScore = {
  importance: number;
  frequency: number;
  urgency: number;
  currentSolutionGap: number;
  consequence: number;
  willingnessToUse: number;
};

export type PainStrengthResult = {
  level: "low" | "medium" | "high";
  totalScore: number;
  maxScore: 30;
  score: PainScore;
  reason: string;
  keyDrivers: string[];
  risks: string[];
  confidence: Confidence;
};

export type Step3GapResult = {
  missingFields: string[];
  lowConfidenceFields: string[];
  suggestedClarificationTargets: string[];
};

export type Step3AnalysisResult = {
  productBoundary: ProductBoundary;
  realProblems: RealProblem[];
  falseProblems: FalseProblem[];
  alternativeSolutions: AlternativeSolution[];
  painStrength: PainStrengthResult;
  gapResult: Step3GapResult;
};

export type ClarificationTargetField =
  | "target_users"
  | "scenarios"
  | "real_problems"
  | "alternatives"
  | "pain_strength"
  | "desired_outcomes"
  | "input_interaction"
  | "generation_requirement"
  | "privacy_security"
  | "technical_integration"
  | "operation_commercialization"
  | "compatibility_extension"
  | "risk_boundary"
  | "mvp_scope"
  | "evaluation_metric";

export type QuestionCategory =
  | "target_user"
  | "scenario"
  | "real_problem"
  | "alternative"
  | "pain_strength"
  | "input_interaction"
  | "generation_requirement"
  | "privacy_security"
  | "technical_integration"
  | "operation_commercialization"
  | "compatibility_extension"
  | "risk_boundary"
  | "mvp_scope"
  | "evaluation_metric";

export type ContextCompletenessResult = {
  hasClearTargetUsers: boolean;
  hasClearScenarios: boolean;
  hasClearRealProblems: boolean;
  hasClearAlternatives: boolean;
  hasClearPainStrength: boolean;
  missingFields: ClarificationTargetField[];
  lowConfidenceFields: ClarificationTargetField[];
  overallCompleteness: "low" | "medium" | "high";
  reason: string;
};

export type ClarificationDepth =
  | "discovery_basic"
  | "requirement_deepening"
  | "implementation_decision";

export type QuestionPlan = {
  depth: ClarificationDepth;
  categories: QuestionCategory[];
  maxQuestionCount: number;
  reason: string;
};

export type Step4ClarificationQuestion = {
  id: string;
  category: QuestionCategory;
  targetField: ClarificationTargetField;
  question: string;
  reason: string;
  affects: string[];
  answerType: "text" | "single_choice" | "multiple_choice";
  options?: string[];
  priority: "high" | "medium" | "low";
  required: boolean;
};

export type Step4ClarificationResult = {
  completeness: ContextCompletenessResult;
  depth: ClarificationDepth;
  questionPlan: QuestionPlan;
  questions: Step4ClarificationQuestion[];
};

export type OutcomeItem = {
  id: string;
  name: string;
  description: string;
  successSignal: string;
  confidence: Confidence;
};

export type DiscoveryClarificationQuestion = {
  id: string;
  category?: QuestionCategory;
  question: string;
  reason: string;
  targetField: ClarificationTargetField;
  affects?: string[];
  answerType?: "text" | "single_choice" | "multiple_choice";
  inputType: "text" | "single_choice" | "multiple_choice";
  options?: string[];
  priority?: "high" | "medium" | "low";
  required: boolean;
};

export type UserAnswer = {
  questionId: string;
  answer: string | string[];
  answeredAt: string;
};

export type DiscoveryResearchPlan = {
  researchGoals: string[];
  keyQuestions: string[];
  targetCompetitors: string[];
  researchMethods: string[];
  expectedOutputs: string[];
  nextSteps: string[];
};

export type ResearchContext = {
  productIdea: string;
  coreUsers: string[];
  coreScenario: string;
  realProblems: string[];
  alternatives: string[];
  painLevel: "low" | "medium" | "high";
  researchFocus: Array<
    | "user_research"
    | "competitor_research"
    | "mvp_validation"
    | "pricing_validation"
    | "usability_testing"
  >;
  reason: string;
};

export type ResearchGoal = {
  id: string;
  goal: string;
  reason: string;
  relatedDecision: string;
  priority: "high" | "medium" | "low";
};

export type ResearchQuestion = {
  id: string;
  question: string;
  category:
    | "user_behavior"
    | "pain_validation"
    | "alternative_solution"
    | "content_preference"
    | "trust_risk"
    | "pricing"
    | "competitor_gap"
    | "scenario_difference";
  whyImportant: string;
  expectedInsight: string;
  priority: "high" | "medium" | "low";
};

export type ResearchMethod = {
  id: string;
  method: string;
  purpose: string;
  targetParticipants?: string;
  sampleSize?: string;
  executionSteps: string[];
  expectedOutput: string;
  priority: "high" | "medium" | "low";
};

export type ResearchTimelineItem = {
  id: string;
  phase: string;
  task: string;
  duration: string;
  owner: string;
  dependency?: string;
  output: string;
};

export type ResearchDeliverable = {
  id: string;
  deliverable: string;
  description: string;
  usedFor: string[];
};

export type ResearchRisk = {
  id: string;
  risk: string;
  impact: string;
  mitigation: string;
  priority: "high" | "medium" | "low";
};

export type ResearchUsage = {
  id: string;
  usage: string;
  description: string;
  downstreamArtifact:
    | "PRD"
    | "prototype"
    | "MVP_scope"
    | "agent_capability"
    | "pricing_strategy"
    | "growth_strategy"
    | "evaluation_metrics";
};

export type Step7ResearchPlan = {
  title: string;
  summary: string;
  context: ResearchContext;
  goals: ResearchGoal[];
  keyQuestions: ResearchQuestion[];
  methods: ResearchMethod[];
  timeline: ResearchTimelineItem[];
  deliverables: ResearchDeliverable[];
  risks: ResearchRisk[];
  usages: ResearchUsage[];
  confidence: Confidence;
};

export type Step7ResearchPlanResult = {
  step: "step7";
  title: "研究计划生成";
  status: "completed" | "needs_more_info" | "error";
  researchPlan: Step7ResearchPlan;
};

export type IndustryBackground = {
  industry: string;
  subMarket: string;
  backgroundSummary: string;
  keyChanges: string[];
  relevanceToProduct: string;
  confidence: Confidence;
};

export type TargetMarket = {
  primaryUsers: string[];
  secondaryUsers: string[];
  bSideCustomers: string[];
  initialMarket: string;
  expansionMarket: string[];
  marketReason: string;
  confidence: Confidence;
};

export type MarketTrend = {
  id: string;
  trend: string;
  description: string;
  impactOnProduct: string;
  opportunityLevel: "low" | "medium" | "high";
  confidence: Confidence;
};

export type MarketUserDemand = {
  id: string;
  demand: string;
  type: "core" | "secondary" | "latent";
  description: string;
  source:
    | "target_user"
    | "real_problem"
    | "alternative_solution"
    | "pain_strength"
    | "user_answer"
    | "research_plan";
  productImplication: string;
  priority: "high" | "medium" | "low";
};

export type MarketOpportunity = {
  id: string;
  opportunity: string;
  description: string;
  whyNow: string;
  targetSegment: string;
  productDirection: string;
  businessPotential: "low" | "medium" | "high";
  validationNeeded: string[];
  priority: "high" | "medium" | "low";
};

export type MarketAssumption = {
  id: string;
  assumption: string;
  whyImportant: string;
  validationMethod: string;
  riskIfWrong: string;
  priority: "high" | "medium" | "low";
};

export type Step8MarketAnalysisResult = {
  step: "step8";
  title: "行业与市场初步分析";
  status: "completed" | "needs_more_info" | "error";
  marketAnalysis: {
    summary: string;
    industryBackground: IndustryBackground;
    targetMarket: TargetMarket;
    trends: MarketTrend[];
    userDemands: MarketUserDemand[];
    opportunities: MarketOpportunity[];
    assumptions: MarketAssumption[];
    confidence: Confidence;
  };
};

export type CompetitorRelation =
  | "direct_competitor"
  | "indirect_competitor"
  | "substitute_solution";

export type CompetitorIdentificationItem = {
  id: string;
  name: string;
  relation: CompetitorRelation;
  positioning: string;
  targetUsers: string[];
  coreCapabilities: string[];
  strengths: string[];
  weaknesses: string[];
  relationReason: string;
  differenceFromProduct: string;
  evidence: string[];
  sourceUrl?: string;
  confidence: Confidence;
  verificationStatus: "verified" | "inferred" | "needs_validation";
};

export type DifferentiationOpportunity = {
  id: string;
  opportunity: string;
  competitorGap: string;
  productDirection: string;
  targetUserValue: string;
  validationNeeded: string[];
  priority: "high" | "medium" | "low";
};

export type Step9CompetitorIdentificationResult = {
  step: "step9";
  title: "竞品识别与分析";
  status: "completed" | "needs_more_info" | "error";
  competitorIdentification: {
    summary: string;
    directCompetitors: CompetitorIdentificationItem[];
    indirectCompetitors: CompetitorIdentificationItem[];
    substituteSolutions: CompetitorIdentificationItem[];
    differentiationOpportunities: DifferentiationOpportunity[];
    researchGaps: string[];
    confidence: Confidence;
  };
};

export type CompetitorAnalysisTableRow = {
  id: string;
  name: string;
  relation: CompetitorRelation;
  positioning: string;
  targetUsers: string[];
  coreFunctions: string[];
  channels: string[];
  languages: string[];
  personalizationCapability: "high" | "medium" | "low" | "unknown";
  personalizationDescription: string;
  strengths: string[];
  weaknesses: string[];
  differentiationOpportunity: string;
  typicalScenarios: string[];
  evidence: string[];
  sourceUrl?: string;
  confidence: Confidence;
  verificationStatus: "verified" | "inferred" | "needs_validation";
};

export type Step10CompetitorAnalysisTableResult = {
  step: "step10";
  title: "竞品分析表";
  status: "completed" | "needs_more_info" | "error";
  competitorAnalysisTable: {
    summary: string;
    rows: CompetitorAnalysisTableRow[];
    keyFindings: string[];
    recommendedFocus: string[];
    researchGaps: string[];
    confidence: Confidence;
  };
};

export type ProductPersonaItem = {
  id: string;
  name: string;
  segment: string;
  role: string;
  profile: string;
  scenarios: string[];
  painPoints: string[];
  goals: string[];
  motivations: string[];
  behaviors: string[];
  preferredChannels: string[];
  decisionFactors: string[];
  evidence: string[];
  assumptions: string[];
  confidence: Confidence;
};

export type Step11UserPersonaResult = {
  step: "step11";
  title: "用户画像生成";
  status: "completed" | "needs_more_info" | "error";
  userPersonas: {
    summary: string;
    personas: ProductPersonaItem[];
    commonPainPoints: string[];
    commonMotivations: string[];
    productImplications: string[];
    researchGaps: string[];
    confidence: Confidence;
  };
};

export type MvpPrdFeatureScopeItem = {
  id: string;
  name: string;
  description: string;
  priority: "must_have" | "should_have" | "could_have";
  rationale: string;
};

export type MvpPrdUserStory = {
  id: string;
  user: string;
  story: string;
  value: string;
  acceptanceCriteria: string[];
  priority: "high" | "medium" | "low";
};

export type MvpPrdFlowStep = {
  id: string;
  stepName: string;
  userAction: string;
  systemResponse: string;
  output: string;
};

export type MvpPrdAcceptanceCriterion = {
  id: string;
  criterion: string;
  verificationMethod: string;
  priority: "high" | "medium" | "low";
};

export type Step12MvpPrdResult = {
  step: "step12";
  title: "MVP PRD 生成";
  status: "completed" | "needs_more_info" | "error";
  mvpPrd: {
    productName: string;
    background: string;
    goals: string[];
    targetUsers: string[];
    scenarios: string[];
    featureScope: MvpPrdFeatureScopeItem[];
    outOfScope: string[];
    userStories: MvpPrdUserStory[];
    userFlow: MvpPrdFlowStep[];
    acceptanceCriteria: MvpPrdAcceptanceCriterion[];
    successMetrics: string[];
    risks: string[];
    assumptions: string[];
    confidence: Confidence;
  };
};

export type SupplementalResearchQuery = {
  id: string;
  query: string;
  reason: string;
  source:
    | "research_gap"
    | "low_confidence"
    | "assumption"
    | "competitor_gap"
    | "manual_followup";
};

export type SupplementalResearchRound = {
  id: string;
  round: number;
  triggerStage: AgentStage;
  reason: string;
  queries: SupplementalResearchQuery[];
  sources: SourceItem[];
  findings: string[];
  unresolvedQuestions: string[];
  status: "completed" | "degraded" | "skipped";
  createdAt: string;
};

export type SupplementalResearchResult = {
  maxRounds: number;
  rounds: SupplementalResearchRound[];
  latestStatus: "idle" | "completed" | "degraded" | "max_rounds_reached";
  recommendedAction: string;
};

export type ProductDiscoveryProfile = {
  workflowVersion: "product_discovery_v1";
  status: DiscoveryStatus;
  rawIdea: DiscoveryField<string>;
  targetUsers: DiscoveryField<TargetUser[]>;
  scenarios: DiscoveryField<ScenarioItem[]>;
  problems: DiscoveryField<ProblemItem[]>;
  alternatives: DiscoveryField<AlternativeItem[]>;
  painStrength: DiscoveryField<PainStrength | null>;
  desiredOutcomes: DiscoveryField<OutcomeItem[]>;
  step3Analysis: Step3AnalysisResult | null;
  step4Clarification: Step4ClarificationResult | null;
  clarificationQuestions: DiscoveryClarificationQuestion[];
  userAnswers: UserAnswer[];
  revisionSummary: string[];
  researchPlan: DiscoveryResearchPlan | null;
  step7ResearchPlan: Step7ResearchPlanResult | null;
  step8MarketAnalysis: Step8MarketAnalysisResult | null;
  step9CompetitorIdentification: Step9CompetitorIdentificationResult | null;
  step10CompetitorAnalysisTable: Step10CompetitorAnalysisTableResult | null;
  step11UserPersonas: Step11UserPersonaResult | null;
  step12MvpPrd: Step12MvpPrdResult | null;
  supplementalResearch: SupplementalResearchResult | null;
};

export type MvpPriority = "low" | "medium" | "high";

export type UsageScenarioCandidate = {
  scenarioName: string;
  userStage: string;
  triggerEvent: string;
  userTask: string;
  currentDifficulty: string;
  currentAlternative: string;
  motivationToUseProduct: string;
  expectedOutput: string;
  confidence: ConfidenceLevel;
  mvpPriority: MvpPriority;
};

export type UsageScenarioAnalysis = {
  step: "usage_scenario_analysis";
  rawIdeaSummary: string;
  coreUserFromPreviousStep: {
    segmentName: string;
    definition: string;
    confidence: ConfidenceLevel;
  };
  explicitScenarioInfo: {
    mentionedStage: string;
    mentionedTrigger: string;
    mentionedTask: string;
    mentionedGoal: string;
    mentionedWorkflow: string[];
    confidence: ConfidenceLevel;
  };
  scenarioCandidates: UsageScenarioCandidate[];
  recommendedPrimaryScenario: {
    scenarioName: string;
    scenarioDefinition: string;
    coreUser: string;
    triggerMoment: string;
    mainTask: string;
    currentBlocker: string;
    whySuitableForMvp: string;
    successCriteria: string;
    risk: string;
  };
  secondaryScenarios: Array<{
    scenarioName: string;
    targetUser: string;
    reasonNotPrimary: string;
    futureValue: string;
  }>;
  notRecommendedScenarios: Array<{
    scenarioName: string;
    reason: string;
    risk: string;
  }>;
  scenarioWorkflow: Array<{
    workflowStep: string;
    userAction: string;
    systemSupport: string;
    outputArtifact: string;
  }>;
  scenarioDefinitionRisks: string[];
  clarifyingQuestions: string[];
  readyForNextStep: boolean;
  nextStep: "real_problem_analysis";
};

export type PrdDifficultyType =
  | "product_structure"
  | "user_scenario"
  | "real_problem"
  | "business_analysis"
  | "competitor_analysis"
  | "requirement_expression"
  | "prototype_structure"
  | "technical_architecture_translation"
  | "demo_task_breakdown"
  | "time_saving"
  | "portfolio_storytelling";

export type DifficultyExistence =
  | "explicit"
  | "likely"
  | "no_evidence"
  | "not_applicable";

export type ImpactLevel = "high" | "medium" | "low" | "unknown";

export type RealProblemAnalysis = {
  step: "real_problem_analysis";
  rawIdeaSummary: string;
  coreUserFromPreviousStep: {
    segmentName: string;
    definition: string;
    confidence: ConfidenceLevel;
  };
  primaryScenarioFromPreviousStep: {
    scenarioName: string;
    scenarioDefinition: string;
    confidence: ConfidenceLevel;
  };
  surfaceNeeds: Array<{
    need: string;
    source: string;
    explicitness: "explicit" | "inferred";
    description: string;
  }>;
  prdPurposeAnalysis: Array<{
    purpose: string;
    basis: string;
    confidence: ConfidenceLevel;
    isCorePurpose: boolean;
  }>;
  prdDifficultyAnalysis: Array<{
    difficultyType: PrdDifficultyType;
    existence: DifficultyExistence;
    basis: string;
    impact: ImpactLevel;
    description: string;
  }>;
  realProblemCandidates: Array<{
    problemName: string;
    problemDescription: string;
    surfaceNeed: string;
    rootCause: string;
    affectedTask: string;
    consequenceIfUnsolved: string;
    mvpPriority: MvpPriority;
    confidence: ConfidenceLevel;
  }>;
  recommendedCoreProblem: {
    problemName: string;
    problemDefinition: string;
    coreUser: string;
    primaryScenario: string;
    whyUserHasThisProblem: string;
    whyItMatters: string;
    relationshipWithPrd: string;
    relationshipWithVibeCoding: string;
    whySuitableForMvp: string;
    problemBoundary: string;
    notToSolve: string[];
  };
  rootCauseTree: {
    coreProblem: string;
    layers: Array<{
      layerName: string;
      causes: string[];
    }>;
  };
  nonCoreProblems: Array<{
    problem: string;
    reasonNotCore: string;
    risk: string;
  }>;
  problemDefinitionRisks: string[];
  clarifyingQuestions: string[];
  readyForNextStep: boolean;
  nextStep: "current_alternative_analysis";
};

export type AlternativeSolutionCategory =
  | "general_llm"
  | "template"
  | "prototype_tool"
  | "coding_tool"
  | "demo_builder"
  | "search_tool"
  | "competitor_research_tool"
  | "manual_work"
  | "human_help"
  | "reference_project"
  | "other";

export type StrengthLevel = "low" | "medium" | "high";

export type CurrentAlternativeAnalysis = {
  step: "current_alternative_analysis";
  rawIdeaSummary: string;
  coreUserFromPreviousStep: {
    segmentName: string;
    definition: string;
    confidence: ConfidenceLevel;
  };
  primaryScenarioFromPreviousStep: {
    scenarioName: string;
    scenarioDefinition: string;
    confidence: ConfidenceLevel;
  };
  coreProblemFromPreviousStep: {
    problemName: string;
    problemDefinition: string;
    confidence: ConfidenceLevel;
  };
  currentSolutionPaths: Array<{
    pathName: string;
    workflow: string[];
    description: string;
  }>;
  alternativeSolutions: Array<{
    alternativeName: string;
    category: AlternativeSolutionCategory;
    howUserUsesIt: string;
    coveredTasks: string[];
    advantages: string[];
    limitations: string[];
    substitutionStrength: StrengthLevel;
    threatToProduct: StrengthLevel;
  }>;
  llmAlternativeAnalysis: {
    canReplace: string[];
    cannotReplace: string[];
    requiredProductAdvantage: string[];
  };
  templateAlternativeAnalysis: {
    canReplace: string[];
    cannotReplace: string[];
    requiredProductAdvantage: string[];
  };
  vibeCodingToolAnalysis: {
    canReplace: string[];
    cannotReplace: string[];
    bestIntegrationPoint: string;
    requiredProductAdvantage: string[];
  };
  workflowCoverageAnalysis: Array<{
    alternativeName: string;
    coveredWorkflowSteps: string[];
    missingWorkflowSteps: string[];
    biggestGap: string;
    endToEndSupport: boolean;
  }>;
  productDifferentiation: Array<{
    direction: string;
    whyImportant: string;
    alternativeWeaknessAddressed: string;
    requiredProductCapability: string;
  }>;
  replacementRisks: Array<{
    risk: string;
    replacedBy: string;
    reason: string;
    riskLevel: StrengthLevel;
    mitigationStrategy: string;
  }>;
  clarifyingQuestions: string[];
  readyForNextStep: boolean;
  nextStep: "pain_intensity_analysis";
};

export type PainType =
  | "capability_gap"
  | "path_gap"
  | "expression_translation"
  | "result_delivery"
  | "efficiency"
  | "trust_quality";

export type PainScoreDimension =
  | "frequency"
  | "goal_importance"
  | "current_solution_cost"
  | "alternative_inefficiency"
  | "active_solving_willingness"
  | "payment_willingness"
  | "result_verifiability"
  | "mvp_entry_value";

export type PainLevel = "weak" | "medium" | "strong" | "very_strong";

export type PainIntensityAnalysis = {
  step: "pain_intensity_analysis";
  rawIdeaSummary: string;
  coreUserFromPreviousStep: {
    segmentName: string;
    definition: string;
    confidence: ConfidenceLevel;
  };
  primaryScenarioFromPreviousStep: {
    scenarioName: string;
    scenarioDefinition: string;
    confidence: ConfidenceLevel;
  };
  coreProblemFromPreviousStep: {
    problemName: string;
    problemDefinition: string;
    confidence: ConfidenceLevel;
  };
  alternativeSolutionSummary: {
    mainAlternatives: string[];
    mainLimitations: string[];
    confidence: ConfidenceLevel;
  };
  painPointDefinition: {
    surfacePain: string;
    deepPain: string;
    affectedGoal: string;
  };
  painTypeAnalysis: Array<{
    painType: PainType;
    existence: DifficultyExistence;
    basis: string;
    impact: ImpactLevel;
  }>;
  painIntensityScores: Array<{
    dimension: PainScoreDimension;
    score: number;
    basis: string;
    description: string;
  }>;
  keyJudgmentAnswers: {
    frequency: {
      judgment: string;
      basis: string;
      uncertainty: string;
    };
    timeWillingness: {
      judgment: string;
      basis: string;
      uncertainty: string;
    };
    paymentWillingness: {
      judgment: string;
      basis: string;
      uncertainty: string;
    };
    alternativeInefficiency: {
      judgment: string;
      basis: string;
      uncertainty: string;
    };
    importantGoalImpact: {
      judgment: string;
      basis: string;
      uncertainty: string;
    };
    hackyWorkaroundExisting: {
      judgment: string;
      basis: string;
      uncertainty: string;
    };
  };
  strongPainEvidence: Array<{
    evidence: string;
    source: string;
    description: string;
  }>;
  weakPainOrRiskEvidence: Array<{
    evidence: string;
    description: string;
    potentialImpact: string;
  }>;
  overallPainAssessment: {
    averageScore: number;
    painLevel: PainLevel;
    reason: string;
    suitableAsMvpCorePain: boolean;
    needToNarrowUser: boolean;
    needToNarrowScenario: boolean;
    needToRedefineProblem: boolean;
  };
  mvpValueJudgment: {
    worthMvp: boolean;
    reasons: string[];
    notJustPrdGenerator: string;
    notJustEfficiencyTool: string;
    recommendedMvpPainDefinition: string;
  };
  painAnalysisRisks: string[];
  clarifyingQuestions: string[];
  readyForNextStep: boolean;
  nextStep: "target_outcome_definition";
};

export type ClarificationQuestion = {
  id: string;
  question: string;
  reason: string;
  required: boolean;
};

export type ClarificationAnswer = {
  questionId: string;
  answer: string;
  isMock: boolean;
};

export type ResearchPlan = {
  goals: string[];
  keywords: string[];
  questions: string[];
  targetMarkets: string[];
  competitorCategories: string[];
};

export type SourceItem = {
  id: string;
  title: string;
  url?: string;
  sourceType: string;
  publisher?: string;
  publishedAt: string;
  accessedAt: string;
  summary: string;
  relevanceScore: number;
};

export type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  claim: string;
  confidence: number;
  sourceIds: string[];
  note?: string;
};

export type CompetitorItem = {
  id: string;
  name: string;
  website?: string;
  category: string;
  targetUsers: string[];
  coreFeatures: string[];
  strengths: string[];
  weaknesses: string[];
  pricing?: string;
  evidenceIds: string[];
};

export type PersonaItem = {
  id: string;
  name: string;
  segment: string;
  goals: string[];
  pains: string[];
  behaviors: string[];
  jobsToBeDone: string[];
};

export type MvpPrd = {
  title: string;
  problemStatement: string;
  targetUsers: string[];
  goals: string[];
  nonGoals: string[];
  coreFeatures: string[];
  successMetrics: string[];
  risks: string[];
};

export type PageSpec = {
  id: string;
  name: string;
  route: string;
  purpose: string;
  modules: string[];
  fields: string[];
  operations: string[];
  states: string[];
  exceptions: string[];
  transitions: string[];
  primaryActions: string[];
  sections: string[];
  dataNeeded: string[];
};

export type EvaluationResult = {
  totalScore: number;
  marketScore: number;
  userPainScore: number;
  differentiationScore: number;
  feasibilityScore: number;
  evidenceQualityScore: number;
  strengths: string[];
  deductionReasons: string[];
  risks: string[];
  recommendations: string[];
};

export type ExportResult = {
  markdown: string;
  json: string;
  mermaid?: string;
};

export type TraceEvent = {
  traceId: string;
  runId: string;
  stage: AgentStage;
  nodeName: string;
  status: TraceStatus;
  input: unknown;
  output: unknown;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  error?: AgentError;
};

export type AgentError = {
  code: string;
  message: string;
  stage?: AgentStage;
  cause?: string;
};

export type AgentState = {
  runId: string;
  stage: AgentStage;
  currentStage: AgentStage;
  input: ProductIdeaInput;
  context: ProductContext | null;
  targetUserIdentification: TargetUserIdentificationResult | null;
  productDiscoveryProfile: ProductDiscoveryProfile | null;
  usageScenario: UsageScenarioAnalysis | null;
  realProblem: RealProblemAnalysis | null;
  currentAlternative: CurrentAlternativeAnalysis | null;
  painIntensity: PainIntensityAnalysis | null;
  clarificationQuestions: ClarificationQuestion[];
  clarificationAnswers: ClarificationAnswer[];
  researchPlan: ResearchPlan | null;
  searchQueries: string[];
  sources: SourceItem[];
  evidence: EvidenceItem[];
  competitors: CompetitorItem[];
  personas: PersonaItem[];
  mvpPrd: MvpPrd | null;
  pages: PageSpec[];
  evaluation: EvaluationResult | null;
  rewriteRequired: boolean;
  rewrittenOutput: string | null;
  exports: ExportResult | null;
  trace: TraceEvent[];
  errors: AgentError[];
  createdAt: string;
  updatedAt: string;
};
