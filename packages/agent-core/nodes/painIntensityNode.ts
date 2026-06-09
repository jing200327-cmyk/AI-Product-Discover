import { z } from "zod";
import type {
  AgentState,
  PainIntensityAnalysis,
  ProductContext
} from "../../shared/types";
import { painIntensityPrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

const ConfidenceSchema = z.enum(["low", "medium", "high"]);
const ExistenceSchema = z.enum([
  "explicit",
  "likely",
  "no_evidence",
  "not_applicable"
]);
const ImpactSchema = z.enum(["high", "medium", "low", "unknown"]);
const PainTypeSchema = z.enum([
  "capability_gap",
  "path_gap",
  "expression_translation",
  "result_delivery",
  "efficiency",
  "trust_quality"
]);
const ScoreDimensionSchema = z.enum([
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

const JudgmentSchema = z
  .object({
    judgment: z.string().trim().min(1),
    basis: z.string().trim().min(1),
    uncertainty: z.string().trim().min(1)
  })
  .strict();

const RawPainIntensitySchema = z
  .object({
    step: z.literal("pain_intensity_analysis"),
    raw_idea_summary: z.string().trim().min(1),
    core_user_from_previous_step: z
      .object({
        segment_name: z.string().trim().min(1),
        definition: z.string().trim().min(1),
        confidence: ConfidenceSchema
      })
      .strict(),
    primary_scenario_from_previous_step: z
      .object({
        scenario_name: z.string().trim().min(1),
        scenario_definition: z.string().trim().min(1),
        confidence: ConfidenceSchema
      })
      .strict(),
    core_problem_from_previous_step: z
      .object({
        problem_name: z.string().trim().min(1),
        problem_definition: z.string().trim().min(1),
        confidence: ConfidenceSchema
      })
      .strict(),
    alternative_solution_summary: z
      .object({
        main_alternatives: z.array(z.string().trim().min(1)),
        main_limitations: z.array(z.string().trim().min(1)),
        confidence: ConfidenceSchema
      })
      .strict(),
    pain_point_definition: z
      .object({
        surface_pain: z.string().trim().min(1),
        deep_pain: z.string().trim().min(1),
        affected_goal: z.string().trim().min(1)
      })
      .strict(),
    pain_type_analysis: z.array(
      z
        .object({
          pain_type: PainTypeSchema,
          existence: ExistenceSchema,
          basis: z.string().trim().min(1),
          impact: ImpactSchema
        })
        .strict()
    ),
    pain_intensity_scores: z.array(
      z
        .object({
          dimension: ScoreDimensionSchema,
          score: z.number().min(1).max(5),
          basis: z.string().trim().min(1),
          description: z.string().trim().min(1)
        })
        .strict()
    ),
    key_judgment_answers: z
      .object({
        frequency: JudgmentSchema,
        time_willingness: JudgmentSchema,
        payment_willingness: JudgmentSchema,
        alternative_inefficiency: JudgmentSchema,
        important_goal_impact: JudgmentSchema,
        hacky_workaround_existing: JudgmentSchema
      })
      .strict(),
    strong_pain_evidence: z.array(
      z
        .object({
          evidence: z.string().trim().min(1),
          source: z.string().trim().min(1),
          description: z.string().trim().min(1)
        })
        .strict()
    ),
    weak_pain_or_risk_evidence: z.array(
      z
        .object({
          evidence: z.string().trim().min(1),
          description: z.string().trim().min(1),
          potential_impact: z.string().trim().min(1)
        })
        .strict()
    ),
    overall_pain_assessment: z
      .object({
        average_score: z.number().min(1).max(5),
        pain_level: PainLevelSchema,
        reason: z.string().trim().min(1),
        suitable_as_mvp_core_pain: z.boolean(),
        need_to_narrow_user: z.boolean(),
        need_to_narrow_scenario: z.boolean(),
        need_to_redefine_problem: z.boolean()
      })
      .strict(),
    mvp_value_judgment: z
      .object({
        worth_mvp: z.boolean(),
        reasons: z.array(z.string().trim().min(1)),
        not_just_prd_generator: z.string().trim().min(1),
        not_just_efficiency_tool: z.string().trim().min(1),
        recommended_mvp_pain_definition: z.string().trim().min(1)
      })
      .strict(),
    pain_analysis_risks: z.array(z.string().trim().min(1)),
    clarifying_questions: z.array(z.string().trim().min(1)).min(3).max(5),
    ready_for_next_step: z.boolean(),
    next_step: z.literal("target_outcome_definition")
  })
  .strict();

type RawPainIntensity = z.infer<typeof RawPainIntensitySchema>;

const uniqueNonEmpty = (items: string[]): string[] => [
  ...new Set(items.map((item) => item.trim()).filter(Boolean))
];

const parseJsonCandidate = (candidate: string): unknown => JSON.parse(candidate);

const extractJsonFromText = (text: string): unknown | null => {
  const codeFenceMatches = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];

  for (const match of codeFenceMatches.reverse()) {
    try {
      return parseJsonCandidate(match[1] ?? "");
    } catch {
      // Try the next JSON fence before falling back to text scanning.
    }
  }

  const stepIndex = text.lastIndexOf('"step"');
  const start = stepIndex >= 0 ? text.lastIndexOf("{", stepIndex) : -1;
  const end = text.lastIndexOf("}");

  if (start >= 0 && end > start) {
    try {
      return parseJsonCandidate(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  return null;
};

const extractAssumptionJson = (
  context: ProductContext | null,
  prefix: string
): unknown => {
  const raw = context?.assumptions.find((item) => item.startsWith(prefix));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw.slice(prefix.length));
  } catch {
    return null;
  }
};

const toPainIntensityAnalysis = (
  raw: RawPainIntensity
): PainIntensityAnalysis => ({
  step: raw.step,
  rawIdeaSummary: raw.raw_idea_summary,
  coreUserFromPreviousStep: {
    segmentName: raw.core_user_from_previous_step.segment_name,
    definition: raw.core_user_from_previous_step.definition,
    confidence: raw.core_user_from_previous_step.confidence
  },
  primaryScenarioFromPreviousStep: {
    scenarioName: raw.primary_scenario_from_previous_step.scenario_name,
    scenarioDefinition:
      raw.primary_scenario_from_previous_step.scenario_definition,
    confidence: raw.primary_scenario_from_previous_step.confidence
  },
  coreProblemFromPreviousStep: {
    problemName: raw.core_problem_from_previous_step.problem_name,
    problemDefinition: raw.core_problem_from_previous_step.problem_definition,
    confidence: raw.core_problem_from_previous_step.confidence
  },
  alternativeSolutionSummary: {
    mainAlternatives: raw.alternative_solution_summary.main_alternatives,
    mainLimitations: raw.alternative_solution_summary.main_limitations,
    confidence: raw.alternative_solution_summary.confidence
  },
  painPointDefinition: {
    surfacePain: raw.pain_point_definition.surface_pain,
    deepPain: raw.pain_point_definition.deep_pain,
    affectedGoal: raw.pain_point_definition.affected_goal
  },
  painTypeAnalysis: raw.pain_type_analysis.map((item) => ({
    painType: item.pain_type,
    existence: item.existence,
    basis: item.basis,
    impact: item.impact
  })),
  painIntensityScores: raw.pain_intensity_scores.map((item) => ({
    dimension: item.dimension,
    score: item.score,
    basis: item.basis,
    description: item.description
  })),
  keyJudgmentAnswers: {
    frequency: raw.key_judgment_answers.frequency,
    timeWillingness: raw.key_judgment_answers.time_willingness,
    paymentWillingness: raw.key_judgment_answers.payment_willingness,
    alternativeInefficiency: raw.key_judgment_answers.alternative_inefficiency,
    importantGoalImpact: raw.key_judgment_answers.important_goal_impact,
    hackyWorkaroundExisting:
      raw.key_judgment_answers.hacky_workaround_existing
  },
  strongPainEvidence: raw.strong_pain_evidence,
  weakPainOrRiskEvidence: raw.weak_pain_or_risk_evidence.map((item) => ({
    evidence: item.evidence,
    description: item.description,
    potentialImpact: item.potential_impact
  })),
  overallPainAssessment: {
    averageScore: raw.overall_pain_assessment.average_score,
    painLevel: raw.overall_pain_assessment.pain_level,
    reason: raw.overall_pain_assessment.reason,
    suitableAsMvpCorePain:
      raw.overall_pain_assessment.suitable_as_mvp_core_pain,
    needToNarrowUser: raw.overall_pain_assessment.need_to_narrow_user,
    needToNarrowScenario: raw.overall_pain_assessment.need_to_narrow_scenario,
    needToRedefineProblem:
      raw.overall_pain_assessment.need_to_redefine_problem
  },
  mvpValueJudgment: {
    worthMvp: raw.mvp_value_judgment.worth_mvp,
    reasons: raw.mvp_value_judgment.reasons,
    notJustPrdGenerator: raw.mvp_value_judgment.not_just_prd_generator,
    notJustEfficiencyTool: raw.mvp_value_judgment.not_just_efficiency_tool,
    recommendedMvpPainDefinition:
      raw.mvp_value_judgment.recommended_mvp_pain_definition
  },
  painAnalysisRisks: raw.pain_analysis_risks,
  clarifyingQuestions: raw.clarifying_questions,
  readyForNextStep: raw.ready_for_next_step,
  nextStep: raw.next_step
});

const getPainLevel = (score: number): PainIntensityAnalysis["overallPainAssessment"]["painLevel"] => {
  if (score >= 4.5) {
    return "very_strong";
  }

  if (score >= 3.5) {
    return "strong";
  }

  if (score >= 2.5) {
    return "medium";
  }

  return "weak";
};

const calculateAverage = (
  scores: PainIntensityAnalysis["painIntensityScores"]
): number =>
  Number(
    (
      scores.reduce((total, item) => total + item.score, 0) / scores.length
    ).toFixed(1)
  );

const buildFallbackPainIntensity = (state: AgentState): PainIntensityAnalysis => {
  const coreUser = state.currentAlternative?.coreUserFromPreviousStep ??
    state.realProblem?.coreUserFromPreviousStep ??
    state.usageScenario?.coreUserFromPreviousStep ?? {
      segmentName: state.context?.targetUsers[0] ?? "待澄清的 MVP 核心用户",
      definition: state.context?.valueProposition ?? "核心用户仍需澄清",
      confidence: "medium" as const
    };
  const primaryScenario = state.currentAlternative?.primaryScenarioFromPreviousStep ??
    state.realProblem?.primaryScenarioFromPreviousStep ?? {
      scenarioName:
        state.usageScenario?.recommendedPrimaryScenario.scenarioName ??
        "从模糊 AI 产品想法进入产品发现与 Demo 准备",
      scenarioDefinition:
        state.usageScenario?.recommendedPrimaryScenario.scenarioDefinition ??
        "用户需要把模糊想法推进为可开发 Demo 输入",
      confidence: "medium" as const
    };
  const coreProblem = state.currentAlternative?.coreProblemFromPreviousStep ?? {
    problemName:
      state.realProblem?.recommendedCoreProblem.problemName ??
      "难以把模糊 AI 产品想法转化为可开发、可展示、可验证的 Demo 方案",
    problemDefinition:
      state.realProblem?.recommendedCoreProblem.problemDefinition ??
      "用户不是单纯缺 PRD，而是缺少产品发现、需求表达和开发任务衔接路径",
    confidence: "high" as const
  };
  const mainAlternatives =
    state.currentAlternative?.alternativeSolutions
      .slice(0, 5)
      .map((item) => item.alternativeName) ?? [
      "ChatGPT 手动提问",
      "Claude 手动生成 PRD",
      "Notion / 飞书模板",
      "Cursor / Codex",
      "Lovable / Bolt"
    ];
  const mainLimitations =
    state.currentAlternative?.alternativeSolutions
      .flatMap((item) => item.limitations)
      .slice(0, 8) ?? [
      "缺少稳定流程",
      "缺少状态管理",
      "缺少质量评估",
      "需要清晰需求输入",
      "不能替代产品发现过程"
    ];
  const scores: PainIntensityAnalysis["painIntensityScores"] = [
    {
      dimension: "frequency",
      score: 3,
      basis: "核心用户在每次准备作品集项目、创业验证或 Demo 开发前都会遇到，但频率仍需验证",
      description: "中等频率，可能不是每天发生，但与关键项目周期绑定"
    },
    {
      dimension: "goal_importance",
      score: 5,
      basis: "问题影响作品集、面试表达、Demo 开发或创业验证等重要目标",
      description: "目标重要性高"
    },
    {
      dimension: "current_solution_cost",
      score: 4,
      basis: "用户需要手动问 LLM、找模板、查竞品、写文档并再交给 Coding 工具",
      description: "当前解决成本较高"
    },
    {
      dimension: "alternative_inefficiency",
      score: 4,
      basis: "通用 LLM、模板和 Coding 工具分别覆盖局部任务，但缺少端到端链路",
      description: "替代方案存在明显断点"
    },
    {
      dimension: "active_solving_willingness",
      score: 4,
      basis: "用户通常已经在尝试 ChatGPT、模板、Cursor、Codex 或 Demo Builder",
      description: "有较强主动解决倾向，但需确认实际使用行为"
    },
    {
      dimension: "payment_willingness",
      score: 3,
      basis: "如果服务求职、作品集或创业验证，存在付费可能；但具体预算未验证",
      description: "付费意愿中等偏不确定"
    },
    {
      dimension: "result_verifiability",
      score: 4,
      basis: "结果可通过 PRD、页面结构、技术上下文、Demo 任务和最终 Demo 验证",
      description: "可验证性较强"
    },
    {
      dimension: "mvp_entry_value",
      score: 5,
      basis: "该痛点直接对应 AI Product Discover 从产品发现到开发上下文生成的核心链路",
      description: "非常适合作为 MVP 切入点"
    }
  ];
  const averageScore = calculateAverage(scores);
  const painLevel = getPainLevel(averageScore);

  return {
    step: "pain_intensity_analysis",
    rawIdeaSummary: state.context?.summary ?? state.input.idea,
    coreUserFromPreviousStep: coreUser,
    primaryScenarioFromPreviousStep: primaryScenario,
    coreProblemFromPreviousStep: coreProblem,
    alternativeSolutionSummary: {
      mainAlternatives,
      mainLimitations,
      confidence: "medium"
    },
    painPointDefinition: {
      surfacePain: "用户不知道怎么写 PRD 或把产品想法整理成方案",
      deepPain:
        "用户缺少从模糊 AI 产品想法到可开发、可展示、可复用 Demo 的结构化产品工作流",
      affectedGoal:
        "影响用户完成作品集、进入 Vibe Coding / Codex 开发、在面试或验证中讲清项目价值"
    },
    painTypeAnalysis: [
      {
        painType: "capability_gap",
        existence: "likely",
        basis: "用户缺少产品发现、需求分析和 Demo 任务拆解方法",
        impact: "high"
      },
      {
        painType: "path_gap",
        existence: "likely",
        basis: "用户知道目标，但不知道从原始想法到 Demo 的推进顺序",
        impact: "high"
      },
      {
        painType: "expression_translation",
        existence: "likely",
        basis: "需要把想法转成 PRD、页面结构和 Codex 可执行上下文",
        impact: "high"
      },
      {
        painType: "result_delivery",
        existence: "likely",
        basis: "用户最终需要可展示、可运行、可复用的项目结果",
        impact: "high"
      },
      {
        painType: "efficiency",
        existence: "likely",
        basis: "用户希望减少重复整理、撰写和拼接产物的时间",
        impact: "medium"
      },
      {
        painType: "trust_quality",
        existence: "likely",
        basis: "通用 LLM 输出看似完整，但用户不确定是否合理、可开发、可展示",
        impact: "high"
      }
    ],
    painIntensityScores: scores,
    keyJudgmentAnswers: {
      frequency: {
        judgment: "中等偏高",
        basis: "每次用户准备 AI 产品项目、作品集或 Demo 开发前都会出现",
        uncertainty: "仍需确认目标用户一年或一个月内发生次数"
      },
      timeWillingness: {
        judgment: "较强",
        basis: "用户通常会投入时间问 LLM、找模板、查竞品、尝试 Coding 工具",
        uncertainty: "需确认用户愿意投入的最大时间成本"
      },
      paymentWillingness: {
        judgment: "中等，需验证",
        basis: "若影响求职、作品集或创业验证，存在付费可能",
        uncertainty: "尚未验证预算、付费场景和购买角色"
      },
      alternativeInefficiency: {
        judgment: "明显存在",
        basis: "当前替代方案多为局部替代，缺少稳定端到端链路",
        uncertainty: "需确认用户对现有工具最不满意的具体环节"
      },
      importantGoalImpact: {
        judgment: "影响重要目标",
        basis: "问题影响可展示 Demo、面试讲述、开发执行和验证结果",
        uncertainty: "需确认用户当前最重要目标是求职、创业还是企业落地"
      },
      hackyWorkaroundExisting: {
        judgment: "大概率存在",
        basis: "用户可能通过手动 Prompt、模板拼接和直接 Vibe Coding 绕路解决",
        uncertainty: "需确认用户是否已经实际尝试这些笨办法"
      }
    },
    strongPainEvidence: [
      {
        evidence: "问题影响从想法到可开发 Demo 的完整路径",
        source: "真实问题分析",
        description: "不是单一文档问题，而是产品发现和开发转译链路问题"
      },
      {
        evidence: "现有替代方案只能覆盖局部任务",
        source: "替代方案分析",
        description: "通用 LLM、模板和 Coding 工具之间存在明显断点"
      },
      {
        evidence: "结果可验证",
        source: "使用场景分析",
        description: "可以通过 PRD、页面结构、任务拆解和 Demo 是否能运行验证"
      }
    ],
    weakPainOrRiskEvidence: [
      {
        evidence: "发生频率仍未验证",
        description: "如果用户只是一次性做作品集项目，持续需求可能不足",
        potentialImpact: "需要收窄到高频或高价值人群"
      },
      {
        evidence: "付费意愿仍未验证",
        description: "用户可能愿意花时间但不愿为工具付费",
        potentialImpact: "影响商业化和 MVP 验证指标"
      },
      {
        evidence: "通用 LLM 仍是强替代",
        description: "高能力用户可能自己设计 Prompt 完成大部分流程",
        potentialImpact: "产品必须强化流程、状态、评测和开发上下文差异化"
      }
    ],
    overallPainAssessment: {
      averageScore,
      painLevel,
      reason:
        "该痛点影响重要目标，替代方案存在明显断点，且结果可被 Demo 和作品集验证；但发生频率和付费意愿仍需澄清。",
      suitableAsMvpCorePain: true,
      needToNarrowUser: false,
      needToNarrowScenario: false,
      needToRedefineProblem: false
    },
    mvpValueJudgment: {
      worthMvp: true,
      reasons: [
        "痛点与 AI Product Discover 的主链路高度一致",
        "现有替代方案缺少端到端产品发现到开发上下文衔接",
        "MVP 可以用结构化产物、Trace 和导出快速验证价值"
      ],
      notJustPrdGenerator:
        "真实痛点不是写出 PRD 文档，而是先把用户、场景、问题和开发上下文判断清楚",
      notJustEfficiencyTool:
        "节省时间只是收益，核心价值是降低从模糊想法到可开发 Demo 的路径不确定性",
      recommendedMvpPainDefinition:
        "用户缺少一条从模糊 AI 产品想法到可开发、可展示、可复用 Demo 的结构化路径，导致无法稳定完成产品理解、需求分析、PRD、原型、技术架构和开发任务拆解。"
    },
    painAnalysisRisks: [
      "可能把一次性作品集需求误判为持续需求",
      "可能把学习需求误判为商业付费需求",
      "尚未验证用户是否真的会进入 Vibe Coding / Codex 开发"
    ],
    clarifyingQuestions: [
      "你遇到“有 AI 产品想法但不知道如何推进”的情况有多频繁？",
      "这个问题不解决，会影响你求职、作品集、开发 Demo、创业验证还是团队协作？",
      "你现在是否已经用 ChatGPT、Claude、模板、Cursor、Codex、Lovable 或 Bolt 解决过？哪里最不满意？",
      "你愿意为一套能把模糊想法转成 PRD、原型、技术架构和开发任务的流程付费吗？",
      "你拿到结果后，是否会真的进入 Vibe Coding / Codex 开发？"
    ],
    readyForNextStep: true,
    nextStep: "target_outcome_definition"
  };
};

const extractStructuredPainIntensity = (
  llmOutput: string,
  fallback: PainIntensityAnalysis
): PainIntensityAnalysis => {
  const jsonCandidate = extractJsonFromText(llmOutput);

  if (!jsonCandidate) {
    return fallback;
  }

  try {
    return toPainIntensityAnalysis(RawPainIntensitySchema.parse(jsonCandidate));
  } catch {
    return fallback;
  }
};

const buildPromptInput = (
  state: AgentState,
  userIdentificationResult: unknown
): unknown => ({
  rawIdea: state.input.idea,
  userIdentificationResult,
  usageScenarioResult: state.usageScenario,
  realProblemResult: state.realProblem,
  currentAlternativeResult: state.currentAlternative,
  productInput: state.input,
  extraContext: [
    state.input.targetAudience ? `目标用户补充：${state.input.targetAudience}` : "",
    state.input.problem ? `问题补充：${state.input.problem}` : "",
    state.input.constraints?.length ? `约束补充：${state.input.constraints.join("；")}` : ""
  ]
    .filter(Boolean)
    .join("\n")
});

const updateProductContext = (
  context: ProductContext | null,
  painIntensity: PainIntensityAnalysis
): ProductContext | null => {
  if (!context) {
    return context;
  }

  return {
    ...context,
    assumptions: uniqueNonEmpty([
      ...context.assumptions,
      `痛点强度结构化上下文：${JSON.stringify(painIntensity)}`,
      `痛点综合得分：${painIntensity.overallPainAssessment.averageScore}`,
      `痛点等级：${painIntensity.overallPainAssessment.painLevel}`,
      `下一步分析对象：${painIntensity.nextStep}`
    ])
  };
};

export async function painIntensityNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "painIntensityNode",
    traceStage: "pain_intensity",
    input: {
      input: state.input,
      context: state.context,
      usageScenario: state.usageScenario,
      realProblem: state.realProblem,
      currentAlternative: state.currentAlternative
    },
    execute: async () => {
      const userIdentificationResult = extractAssumptionJson(
        state.context,
        "用户识别结构化上下文："
      );
      const fallbackPainIntensity = buildFallbackPainIntensity(state);
      const llmOutput = await completeWithPrompt(
        deps,
        state,
        "pain_intensity_analysis",
        painIntensityPrompt.buildPrompt(
          buildPromptInput(state, userIdentificationResult)
        )
      );
      const painIntensity = extractStructuredPainIntensity(
        llmOutput,
        fallbackPainIntensity
      );

      return {
        painIntensity,
        context: updateProductContext(state.context, painIntensity)
      };
    }
  });
}
