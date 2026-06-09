import { z } from "zod";
import type {
  AgentState,
  ProductContext,
  RealProblemAnalysis
} from "../../shared/types";
import { realProblemPrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

const ConfidenceSchema = z.enum(["low", "medium", "high"]);
const PrioritySchema = z.enum(["low", "medium", "high"]);
const ExplicitnessSchema = z.enum(["explicit", "inferred"]);
const DifficultyExistenceSchema = z.enum([
  "explicit",
  "likely",
  "no_evidence",
  "not_applicable"
]);
const ImpactSchema = z.enum(["high", "medium", "low", "unknown"]);
const DifficultyTypeSchema = z.enum([
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

const RawRealProblemSchema = z
  .object({
    step: z.literal("real_problem_analysis"),
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
    surface_needs: z.array(
      z
        .object({
          need: z.string().trim().min(1),
          source: z.string().trim().min(1),
          explicitness: ExplicitnessSchema,
          description: z.string().trim().min(1)
        })
        .strict()
    ),
    prd_purpose_analysis: z.array(
      z
        .object({
          purpose: z.string().trim().min(1),
          basis: z.string().trim().min(1),
          confidence: ConfidenceSchema,
          is_core_purpose: z.boolean()
        })
        .strict()
    ),
    prd_difficulty_analysis: z.array(
      z
        .object({
          difficulty_type: DifficultyTypeSchema,
          existence: DifficultyExistenceSchema,
          basis: z.string().trim().min(1),
          impact: ImpactSchema,
          description: z.string().trim().min(1)
        })
        .strict()
    ),
    real_problem_candidates: z.array(
      z
        .object({
          problem_name: z.string().trim().min(1),
          problem_description: z.string().trim().min(1),
          surface_need: z.string().trim().min(1),
          root_cause: z.string().trim().min(1),
          affected_task: z.string().trim().min(1),
          consequence_if_unsolved: z.string().trim().min(1),
          mvp_priority: PrioritySchema,
          confidence: ConfidenceSchema
        })
        .strict()
    ),
    recommended_core_problem: z
      .object({
        problem_name: z.string().trim().min(1),
        problem_definition: z.string().trim().min(1),
        core_user: z.string().trim().min(1),
        primary_scenario: z.string().trim().min(1),
        why_user_has_this_problem: z.string().trim().min(1),
        why_it_matters: z.string().trim().min(1),
        relationship_with_prd: z.string().trim().min(1),
        relationship_with_vibe_coding: z.string().trim().min(1),
        why_suitable_for_mvp: z.string().trim().min(1),
        problem_boundary: z.string().trim().min(1),
        not_to_solve: z.array(z.string().trim().min(1))
      })
      .strict(),
    root_cause_tree: z
      .object({
        core_problem: z.string().trim().min(1),
        layers: z.array(
          z
            .object({
              layer_name: z.string().trim().min(1),
              causes: z.array(z.string().trim().min(1))
            })
            .strict()
        )
      })
      .strict(),
    non_core_problems: z.array(
      z
        .object({
          problem: z.string().trim().min(1),
          reason_not_core: z.string().trim().min(1),
          risk: z.string().trim().min(1)
        })
        .strict()
    ),
    problem_definition_risks: z.array(z.string().trim().min(1)),
    clarifying_questions: z.array(z.string().trim().min(1)).min(3).max(5),
    ready_for_next_step: z.boolean(),
    next_step: z.literal("current_alternative_analysis")
  })
  .strict();

type RawRealProblem = z.infer<typeof RawRealProblemSchema>;

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

const toRealProblemAnalysis = (raw: RawRealProblem): RealProblemAnalysis => ({
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
  surfaceNeeds: raw.surface_needs.map((need) => ({
    need: need.need,
    source: need.source,
    explicitness: need.explicitness,
    description: need.description
  })),
  prdPurposeAnalysis: raw.prd_purpose_analysis.map((purpose) => ({
    purpose: purpose.purpose,
    basis: purpose.basis,
    confidence: purpose.confidence,
    isCorePurpose: purpose.is_core_purpose
  })),
  prdDifficultyAnalysis: raw.prd_difficulty_analysis.map((difficulty) => ({
    difficultyType: difficulty.difficulty_type,
    existence: difficulty.existence,
    basis: difficulty.basis,
    impact: difficulty.impact,
    description: difficulty.description
  })),
  realProblemCandidates: raw.real_problem_candidates.map((problem) => ({
    problemName: problem.problem_name,
    problemDescription: problem.problem_description,
    surfaceNeed: problem.surface_need,
    rootCause: problem.root_cause,
    affectedTask: problem.affected_task,
    consequenceIfUnsolved: problem.consequence_if_unsolved,
    mvpPriority: problem.mvp_priority,
    confidence: problem.confidence
  })),
  recommendedCoreProblem: {
    problemName: raw.recommended_core_problem.problem_name,
    problemDefinition: raw.recommended_core_problem.problem_definition,
    coreUser: raw.recommended_core_problem.core_user,
    primaryScenario: raw.recommended_core_problem.primary_scenario,
    whyUserHasThisProblem:
      raw.recommended_core_problem.why_user_has_this_problem,
    whyItMatters: raw.recommended_core_problem.why_it_matters,
    relationshipWithPrd: raw.recommended_core_problem.relationship_with_prd,
    relationshipWithVibeCoding:
      raw.recommended_core_problem.relationship_with_vibe_coding,
    whySuitableForMvp: raw.recommended_core_problem.why_suitable_for_mvp,
    problemBoundary: raw.recommended_core_problem.problem_boundary,
    notToSolve: raw.recommended_core_problem.not_to_solve
  },
  rootCauseTree: {
    coreProblem: raw.root_cause_tree.core_problem,
    layers: raw.root_cause_tree.layers.map((layer) => ({
      layerName: layer.layer_name,
      causes: layer.causes
    }))
  },
  nonCoreProblems: raw.non_core_problems.map((problem) => ({
    problem: problem.problem,
    reasonNotCore: problem.reason_not_core,
    risk: problem.risk
  })),
  problemDefinitionRisks: raw.problem_definition_risks,
  clarifyingQuestions: raw.clarifying_questions,
  readyForNextStep: raw.ready_for_next_step,
  nextStep: raw.next_step
});

const buildDifficultyAnalysis = (): RealProblemAnalysis["prdDifficultyAnalysis"] => [
  {
    difficultyType: "product_structure",
    existence: "likely",
    basis: "用户只有模糊想法，需要被拆成可推进的产品链路",
    impact: "high",
    description: "不知道 AI 产品方案应包含哪些结构化产物"
  },
  {
    difficultyType: "user_scenario",
    existence: "likely",
    basis: "前序节点已将用户与场景作为核心澄清对象",
    impact: "high",
    description: "容易把功能想象误当成真实使用场景"
  },
  {
    difficultyType: "real_problem",
    existence: "likely",
    basis: "当前节点需要从表层 PRD / Demo 诉求中拆出真实问题",
    impact: "high",
    description: "若真实问题不清，后续 PRD 和 Demo 任务都会失焦"
  },
  {
    difficultyType: "business_analysis",
    existence: "likely",
    basis: "行业、业务流程和决策链路尚未进入分析",
    impact: "medium",
    description: "可能无法判断方案是否贴近真实业务"
  },
  {
    difficultyType: "competitor_analysis",
    existence: "likely",
    basis: "用户希望后续生成竞品分析，但尚未明确对标范围",
    impact: "medium",
    description: "缺少竞品视角会影响差异化判断"
  },
  {
    difficultyType: "requirement_expression",
    existence: "likely",
    basis: "用户最终需要把想法转成 Codex 或开发者能理解的需求",
    impact: "high",
    description: "需求表达不清会导致开发任务无法执行"
  },
  {
    difficultyType: "prototype_structure",
    existence: "likely",
    basis: "页面结构是后续产物之一",
    impact: "medium",
    description: "不知道页面模块和操作链路会影响 Demo 展示"
  },
  {
    difficultyType: "technical_architecture_translation",
    existence: "likely",
    basis: "Vibe Coding / Codex 开发需要技术转译",
    impact: "high",
    description: "产品需求无法直接变成接口、数据和任务"
  },
  {
    difficultyType: "demo_task_breakdown",
    existence: "likely",
    basis: "用户希望最终进入 Demo 开发",
    impact: "high",
    description: "缺少任务拆解会导致边做边改、范围失控"
  },
  {
    difficultyType: "time_saving",
    existence: "likely",
    basis: "Agent 自动生成链路能节省整理时间",
    impact: "medium",
    description: "节省时间是收益，但通常不是最深层问题"
  },
  {
    difficultyType: "portfolio_storytelling",
    existence: "likely",
    basis: "该项目常用于作品集、面试或 AI 产品能力展示",
    impact: "medium",
    description: "需要把过程讲成可信的产品发现故事"
  }
];

const buildFallbackRealProblem = (state: AgentState): RealProblemAnalysis => {
  const coreUser = state.usageScenario?.coreUserFromPreviousStep ?? {
    segmentName: state.context?.targetUsers[0] ?? "待澄清的 MVP 核心用户",
    definition: state.context?.valueProposition ?? "核心用户仍需澄清",
    confidence: "medium" as const
  };
  const primaryScenario = state.usageScenario?.recommendedPrimaryScenario ?? {
    scenarioName: "从模糊 AI 产品想法进入产品发现与 Demo 准备",
    scenarioDefinition:
      "用户已有模糊 AI 产品想法，但缺少清晰的产品发现链路和可开发 Demo 输入"
  };
  const coreProblemName = "难以把模糊 AI 产品想法转化为可开发、可展示、可验证的 Demo 方案";

  return {
    step: "real_problem_analysis",
    rawIdeaSummary: state.context?.summary ?? state.input.idea,
    coreUserFromPreviousStep: coreUser,
    primaryScenarioFromPreviousStep: {
      scenarioName: primaryScenario.scenarioName,
      scenarioDefinition: primaryScenario.scenarioDefinition,
      confidence: "medium"
    },
    surfaceNeeds: [
      {
        need: "生成产品方案、PRD、页面结构和评分",
        source: "原始产品想法",
        explicitness: "explicit",
        description: "用户表面上希望系统自动生成一组产品发现和交付产物"
      },
      {
        need: "进入 Vibe Coding / Codex Demo 开发",
        source: "使用场景分析",
        explicitness: "inferred",
        description: "这些产物的下游用途是让 Demo 开发更可执行"
      }
    ],
    prdPurposeAnalysis: [
      {
        purpose: "把模糊想法变成结构化产品方案",
        basis: "用户输入仍是方向级描述，需要拆成用户、场景、问题和需求",
        confidence: "high",
        isCorePurpose: true
      },
      {
        purpose: "让 Codex 或开发者理解需求",
        basis: "产品链路最终会进入 Demo 开发任务拆解",
        confidence: "medium",
        isCorePurpose: true
      }
    ],
    prdDifficultyAnalysis: buildDifficultyAnalysis(),
    realProblemCandidates: [
      {
        problemName: coreProblemName,
        problemDescription:
          "用户不是单纯缺 PRD 文档，而是缺少从模糊想法到产品发现、需求表达和开发任务的完整转译路径。",
        surfaceNeed: "生成 PRD / 产品方案 / Demo 任务",
        rootCause: "缺少 AI 产品从 0 到 1 的产品发现方法和面向 AI Coding 的需求表达能力",
        affectedTask: "产品理解、需求分析、PRD、页面结构、技术转译和任务拆解",
        consequenceIfUnsolved: "后续产物可能只是文档堆砌，无法支撑真实 Demo 开发或作品集展示",
        mvpPriority: "high",
        confidence: "high"
      },
      {
        problemName: "无法区分文档生成和产品理解",
        problemDescription:
          "用户容易把写出 PRD 当成目标，但真正需要先判断用户、场景和真实问题是否成立。",
        surfaceNeed: "写 PRD",
        rootCause: "把交付格式误认为产品判断过程",
        affectedTask: "PRD 写作和 MVP 范围判断",
        consequenceIfUnsolved: "文档看似完整，但需求逻辑可能不成立",
        mvpPriority: "medium",
        confidence: "high"
      }
    ],
    recommendedCoreProblem: {
      problemName: coreProblemName,
      problemDefinition:
        "核心用户有一个模糊 AI 产品想法，但不知道如何把它拆成用户、场景、真实问题、需求、PRD、页面结构、技术转译和 Demo 开发任务。",
      coreUser: coreUser.segmentName,
      primaryScenario: primaryScenario.scenarioName,
      whyUserHasThisProblem:
        "用户掌握的是想法或功能目标，但缺少从产品发现到开发交付的结构化方法",
      whyItMatters:
        "这个问题决定后续生成内容是否能支撑真实验证、作品集展示和 Codex 开发",
      relationshipWithPrd:
        "PRD 是问题被拆清后的表达结果，不是问题本身",
      relationshipWithVibeCoding:
        "Vibe Coding / Codex 需要清晰需求、页面结构、数据边界和任务拆解作为输入",
      whySuitableForMvp:
        "它覆盖 AI Product Discover 的主链路，任务边界清楚，能用 Mock Agent 快速验证产物质量",
      problemBoundary:
        "只解决从模糊 AI 产品想法到可开发 Demo 输入的产品发现与需求转译问题",
      notToSolve: ["通用写作润色", "纯代码生成", "企业级项目管理", "完整商业模式设计"]
    },
    rootCauseTree: {
      coreProblem: coreProblemName,
      layers: [
        {
          layerName: "产品理解层",
          causes: ["不清楚用户是谁", "不清楚使用场景", "不清楚真实问题"]
        },
        {
          layerName: "产品分析层",
          causes: ["不知道如何做需求分析", "不知道如何做竞品分析", "不知道如何判断产品机会"]
        },
        {
          layerName: "表达交付层",
          causes: ["不知道 PRD 应该怎么写", "不知道页面结构如何组织", "不知道如何让开发者理解"]
        },
        {
          layerName: "技术转译层",
          causes: ["不知道如何转成技术架构", "不知道如何拆 API / 数据 / 页面任务", "不知道如何交给 Codex 执行"]
        }
      ]
    },
    nonCoreProblems: [
      {
        problem: "单纯不会写 Markdown",
        reasonNotCore: "格式问题不能解释产品发现和 Demo 任务拆解困难",
        risk: "会把产品做成浅层文档模板"
      },
      {
        problem: "单纯想自动生成代码",
        reasonNotCore: "代码生成发生在需求清晰之后",
        risk: "跳过产品判断导致 Demo 无法解释"
      },
      {
        problem: "单纯想节省时间",
        reasonNotCore: "效率是收益，但不是最深层卡点",
        risk: "忽略用户缺少产品方法和需求转译能力"
      }
    ],
    problemDefinitionRisks: [
      "可能把作品集需求和真实商业需求混在一起",
      "可能把 PRD 文档需求误判为真实产品需求",
      "如果不定义验证标准，后续产物容易变成空泛分析"
    ],
    clarifyingQuestions: [
      "你现在最卡的是不知道 PRD 格式，还是不知道产品方案本身该怎么拆？",
      "你写 PRD 的主要目的是什么：开发 Demo、作品集展示、团队沟通、创业验证，还是正式立项？",
      "你目前最难完成的是用户场景、需求分析、竞品分析、原型结构、技术架构，还是开发任务拆解？",
      "你希望系统最终输出给谁看：自己、面试官、开发者、团队成员，还是投资人？",
      "拿到 PRD 后，你下一步会直接进入 Vibe Coding / Codex 开发吗？"
    ],
    readyForNextStep: true,
    nextStep: "current_alternative_analysis"
  };
};

const extractStructuredProblem = (
  llmOutput: string,
  fallback: RealProblemAnalysis
): RealProblemAnalysis => {
  const jsonCandidate = extractJsonFromText(llmOutput);

  if (!jsonCandidate) {
    return fallback;
  }

  try {
    return toRealProblemAnalysis(RawRealProblemSchema.parse(jsonCandidate));
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
  realProblem: RealProblemAnalysis
): ProductContext | null => {
  if (!context) {
    return context;
  }

  return {
    ...context,
    assumptions: uniqueNonEmpty([
      ...context.assumptions,
      `真实问题结构化上下文：${JSON.stringify(realProblem)}`,
      `推荐核心真实问题：${realProblem.recommendedCoreProblem.problemName}`,
      `下一步分析对象：${realProblem.nextStep}`
    ])
  };
};

export async function realProblemNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "realProblemNode",
    traceStage: "real_problem",
    input: {
      input: state.input,
      context: state.context,
      usageScenario: state.usageScenario
    },
    execute: async () => {
      const userIdentificationResult = extractAssumptionJson(
        state.context,
        "用户识别结构化上下文："
      );
      const fallbackProblem = buildFallbackRealProblem(state);
      const llmOutput = await completeWithPrompt(
        deps,
        state,
        "real_problem_analysis",
        realProblemPrompt.buildPrompt(buildPromptInput(state, userIdentificationResult))
      );
      const realProblem = extractStructuredProblem(llmOutput, fallbackProblem);

      return {
        realProblem,
        context: updateProductContext(state.context, realProblem)
      };
    }
  });
}
