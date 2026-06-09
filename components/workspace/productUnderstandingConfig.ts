import type { AgentState } from "@/packages/shared/types";

export type ProductUnderstandingStepId =
  | "raw_idea"
  | "user_identification"
  | "usage_scenario"
  | "real_problem"
  | "current_alternative"
  | "pain_intensity"
  | "target_outcome"
  | "product_opportunity"
  | "core_hypothesis"
  | "mvp_plan";

export type ProductUnderstandingStepStatus =
  | "not_started"
  | "available"
  | "running"
  | "completed"
  | "failed"
  | "needs_more_info"
  | "not_implemented";

export type ProductUnderstandingStepConfig = {
  id: ProductUnderstandingStepId;
  title: string;
  description: string;
  agentKey?: string;
  implemented: boolean;
  dependencies: ProductUnderstandingStepId[];
  expectedOutput: string;
  getResult: (state: AgentState) => unknown;
  getSummary: (state: AgentState) => string;
};

export const productUnderstandingSteps: ProductUnderstandingStepConfig[] = [
  {
    id: "raw_idea",
    title: "原始想法",
    description: "记录用户最初提出的 AI 产品想法，作为后续所有分析的起点。",
    implemented: true,
    dependencies: [],
    expectedOutput: "rawIdea: string; extraContext?: string;",
    getResult: (state) => state.input,
    getSummary: (state) => state.input.idea
  },
  {
    id: "user_identification",
    title: "Step2：目标用户识别",
    description:
      "AI 将根据你的产品想法，识别最可能使用该产品的人群，并说明判断依据。",
    agentKey: "USER_IDENTIFICATION_AGENT",
    implemented: true,
    dependencies: ["raw_idea"],
    expectedOutput:
      "TargetUser[]: name, userType, description, evidenceType, evidence, confidence",
    getResult: (state) => state.targetUserIdentification,
    getSummary: (state) =>
      state.targetUserIdentification
        ? state.targetUserIdentification.targetUsers
            .map((user) => `${user.name}（${user.userType}）`)
            .join("、")
        : ""
  },
  {
    id: "usage_scenario",
    title: "使用场景是什么",
    description:
      "明确用户在什么阶段、什么任务、什么触发事件下需要这个产品。",
    agentKey: "USAGE_SCENARIO_AGENT",
    implemented: true,
    dependencies: ["raw_idea", "user_identification"],
    expectedOutput:
      "UsageScenarioAnalysis: primary scenario, scenario candidates, workflow, risks",
    getResult: (state) => state.usageScenario,
    getSummary: (state) =>
      state.usageScenario?.recommendedPrimaryScenario.scenarioDefinition ?? ""
  },
  {
    id: "real_problem",
    title: "真实问题是什么",
    description:
      "拆出用户表层需求背后的真实问题，判断用户到底卡在能力、路径、表达还是交付。",
    agentKey: "REAL_PROBLEM_AGENT",
    implemented: true,
    dependencies: ["raw_idea", "user_identification", "usage_scenario"],
    expectedOutput:
      "RealProblemAnalysis: surface needs, root cause tree, recommended core problem",
    getResult: (state) => state.realProblem,
    getSummary: (state) =>
      state.realProblem?.recommendedCoreProblem.problemDefinition ?? ""
  },
  {
    id: "current_alternative",
    title: "当前替代方案是什么",
    description:
      "分析用户现在可能如何使用 ChatGPT、Claude、模板、Cursor、Codex、Lovable、Bolt 等方式替代解决。",
    agentKey: "CURRENT_ALTERNATIVE_AGENT",
    implemented: true,
    dependencies: [
      "raw_idea",
      "user_identification",
      "usage_scenario",
      "real_problem"
    ],
    expectedOutput:
      "CurrentAlternativeAnalysis: solution paths, alternatives, gaps, replacement risks",
    getResult: (state) => state.currentAlternative,
    getSummary: (state) =>
      state.currentAlternative?.productDifferentiation
        .map((item) => item.direction)
        .join("；") ?? ""
  },
  {
    id: "pain_intensity",
    title: "痛点强度如何",
    description:
      "判断问题是否高频、重要、低效、影响关键目标，是否值得作为 MVP 切入点。",
    agentKey: "PAIN_INTENSITY_AGENT",
    implemented: true,
    dependencies: [
      "raw_idea",
      "user_identification",
      "usage_scenario",
      "real_problem",
      "current_alternative"
    ],
    expectedOutput:
      "PainIntensityAnalysis: pain definition, dimension scores, evidence, MVP value judgment",
    getResult: (state) => state.painIntensity,
    getSummary: (state) =>
      state.painIntensity
        ? `${state.painIntensity.overallPainAssessment.painLevel}，综合得分 ${state.painIntensity.overallPainAssessment.averageScore.toFixed(1)}`
        : ""
  },
  {
    id: "target_outcome",
    title: "目标结果是什么",
    description:
      "定义用户最终希望获得的结果，例如产品理解简报、PRD、原型结构、技术架构、开发任务或可运行 Demo。",
    agentKey: "TARGET_OUTCOME_AGENT",
    implemented: false,
    dependencies: [
      "raw_idea",
      "user_identification",
      "usage_scenario",
      "real_problem",
      "current_alternative",
      "pain_intensity"
    ],
    expectedOutput:
      "{ step: 'target_outcome_definition', desired_outcomes: [], success_criteria: [], outcome_risks: [] }",
    getResult: () => null,
    getSummary: () => ""
  },
  {
    id: "product_opportunity",
    title: "产品机会是什么",
    description:
      "判断这个问题是否存在可成立的产品机会，以及 AI Product Discover 的差异化空间。",
    agentKey: "PRODUCT_OPPORTUNITY_AGENT",
    implemented: false,
    dependencies: [
      "raw_idea",
      "user_identification",
      "usage_scenario",
      "real_problem",
      "current_alternative",
      "pain_intensity",
      "target_outcome"
    ],
    expectedOutput:
      "{ step: 'product_opportunity_analysis', opportunity_score: number, differentiation: [], risks: [] }",
    getResult: () => null,
    getSummary: () => ""
  },
  {
    id: "core_hypothesis",
    title: "核心假设是什么",
    description:
      "提炼产品成立必须被验证的关键假设，例如用户是否愿意输入想法、是否愿意跟随分阶段流程、是否愿意付费。",
    agentKey: "CORE_HYPOTHESIS_AGENT",
    implemented: false,
    dependencies: [
      "raw_idea",
      "user_identification",
      "usage_scenario",
      "real_problem",
      "current_alternative",
      "pain_intensity",
      "target_outcome",
      "product_opportunity"
    ],
    expectedOutput:
      "{ step: 'core_hypothesis_definition', hypotheses: [], validation_priority: [] }",
    getResult: () => null,
    getSummary: () => ""
  },
  {
    id: "mvp_plan",
    title: "最小可验证方案是什么",
    description:
      "定义 MVP 应该先验证什么、怎么验证、需要哪些最小功能和成功指标。",
    agentKey: "MVP_PLAN_AGENT",
    implemented: false,
    dependencies: [
      "raw_idea",
      "user_identification",
      "usage_scenario",
      "real_problem",
      "current_alternative",
      "pain_intensity",
      "target_outcome",
      "product_opportunity",
      "core_hypothesis"
    ],
    expectedOutput:
      "{ step: 'mvp_validation_plan', validation_goal: string, minimum_scope: [], success_metrics: [] }",
    getResult: () => null,
    getSummary: () => ""
  }
];

export const implementedProductUnderstandingAgentIds = productUnderstandingSteps
  .filter((step) => step.implemented && step.id !== "raw_idea")
  .map((step) => step.id);
