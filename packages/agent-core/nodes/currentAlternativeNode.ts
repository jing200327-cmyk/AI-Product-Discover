import { z } from "zod";
import type {
  AgentState,
  CurrentAlternativeAnalysis,
  ProductContext
} from "../../shared/types";
import { currentAlternativePrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

const ConfidenceSchema = z.enum(["low", "medium", "high"]);
const StrengthSchema = z.enum(["low", "medium", "high"]);
const CategorySchema = z.enum([
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

const RawAlternativeSchema = z
  .object({
    step: z.literal("current_alternative_analysis"),
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
    current_solution_paths: z.array(
      z
        .object({
          path_name: z.string().trim().min(1),
          workflow: z.array(z.string().trim().min(1)),
          description: z.string().trim().min(1)
        })
        .strict()
    ),
    alternative_solutions: z.array(
      z
        .object({
          alternative_name: z.string().trim().min(1),
          category: CategorySchema,
          how_user_uses_it: z.string().trim().min(1),
          covered_tasks: z.array(z.string().trim().min(1)),
          advantages: z.array(z.string().trim().min(1)),
          limitations: z.array(z.string().trim().min(1)),
          substitution_strength: StrengthSchema,
          threat_to_product: StrengthSchema
        })
        .strict()
    ),
    llm_alternative_analysis: z
      .object({
        can_replace: z.array(z.string().trim().min(1)),
        cannot_replace: z.array(z.string().trim().min(1)),
        required_product_advantage: z.array(z.string().trim().min(1))
      })
      .strict(),
    template_alternative_analysis: z
      .object({
        can_replace: z.array(z.string().trim().min(1)),
        cannot_replace: z.array(z.string().trim().min(1)),
        required_product_advantage: z.array(z.string().trim().min(1))
      })
      .strict(),
    vibe_coding_tool_analysis: z
      .object({
        can_replace: z.array(z.string().trim().min(1)),
        cannot_replace: z.array(z.string().trim().min(1)),
        best_integration_point: z.string().trim().min(1),
        required_product_advantage: z.array(z.string().trim().min(1))
      })
      .strict(),
    workflow_coverage_analysis: z.array(
      z
        .object({
          alternative_name: z.string().trim().min(1),
          covered_workflow_steps: z.array(z.string().trim().min(1)),
          missing_workflow_steps: z.array(z.string().trim().min(1)),
          biggest_gap: z.string().trim().min(1),
          end_to_end_support: z.boolean()
        })
        .strict()
    ),
    product_differentiation: z.array(
      z
        .object({
          direction: z.string().trim().min(1),
          why_important: z.string().trim().min(1),
          alternative_weakness_addressed: z.string().trim().min(1),
          required_product_capability: z.string().trim().min(1)
        })
        .strict()
    ),
    replacement_risks: z.array(
      z
        .object({
          risk: z.string().trim().min(1),
          replaced_by: z.string().trim().min(1),
          reason: z.string().trim().min(1),
          risk_level: StrengthSchema,
          mitigation_strategy: z.string().trim().min(1)
        })
        .strict()
    ),
    clarifying_questions: z.array(z.string().trim().min(1)).min(3).max(5),
    ready_for_next_step: z.boolean(),
    next_step: z.literal("pain_intensity_analysis")
  })
  .strict();

type RawAlternative = z.infer<typeof RawAlternativeSchema>;

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

const toCurrentAlternativeAnalysis = (
  raw: RawAlternative
): CurrentAlternativeAnalysis => ({
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
    problemDefinition:
      raw.core_problem_from_previous_step.problem_definition,
    confidence: raw.core_problem_from_previous_step.confidence
  },
  currentSolutionPaths: raw.current_solution_paths.map((path) => ({
    pathName: path.path_name,
    workflow: path.workflow,
    description: path.description
  })),
  alternativeSolutions: raw.alternative_solutions.map((alternative) => ({
    alternativeName: alternative.alternative_name,
    category: alternative.category,
    howUserUsesIt: alternative.how_user_uses_it,
    coveredTasks: alternative.covered_tasks,
    advantages: alternative.advantages,
    limitations: alternative.limitations,
    substitutionStrength: alternative.substitution_strength,
    threatToProduct: alternative.threat_to_product
  })),
  llmAlternativeAnalysis: {
    canReplace: raw.llm_alternative_analysis.can_replace,
    cannotReplace: raw.llm_alternative_analysis.cannot_replace,
    requiredProductAdvantage:
      raw.llm_alternative_analysis.required_product_advantage
  },
  templateAlternativeAnalysis: {
    canReplace: raw.template_alternative_analysis.can_replace,
    cannotReplace: raw.template_alternative_analysis.cannot_replace,
    requiredProductAdvantage:
      raw.template_alternative_analysis.required_product_advantage
  },
  vibeCodingToolAnalysis: {
    canReplace: raw.vibe_coding_tool_analysis.can_replace,
    cannotReplace: raw.vibe_coding_tool_analysis.cannot_replace,
    bestIntegrationPoint:
      raw.vibe_coding_tool_analysis.best_integration_point,
    requiredProductAdvantage:
      raw.vibe_coding_tool_analysis.required_product_advantage
  },
  workflowCoverageAnalysis: raw.workflow_coverage_analysis.map((item) => ({
    alternativeName: item.alternative_name,
    coveredWorkflowSteps: item.covered_workflow_steps,
    missingWorkflowSteps: item.missing_workflow_steps,
    biggestGap: item.biggest_gap,
    endToEndSupport: item.end_to_end_support
  })),
  productDifferentiation: raw.product_differentiation.map((item) => ({
    direction: item.direction,
    whyImportant: item.why_important,
    alternativeWeaknessAddressed: item.alternative_weakness_addressed,
    requiredProductCapability: item.required_product_capability
  })),
  replacementRisks: raw.replacement_risks.map((risk) => ({
    risk: risk.risk,
    replacedBy: risk.replaced_by,
    reason: risk.reason,
    riskLevel: risk.risk_level,
    mitigationStrategy: risk.mitigation_strategy
  })),
  clarifyingQuestions: raw.clarifying_questions,
  readyForNextStep: raw.ready_for_next_step,
  nextStep: raw.next_step
});

const buildFallbackAlternative = (state: AgentState): CurrentAlternativeAnalysis => {
  const coreUser = state.realProblem?.coreUserFromPreviousStep ??
    state.usageScenario?.coreUserFromPreviousStep ?? {
      segmentName: state.context?.targetUsers[0] ?? "待澄清的 MVP 核心用户",
      definition: state.context?.valueProposition ?? "核心用户仍需澄清",
      confidence: "medium" as const
    };
  const primaryScenario = state.realProblem?.primaryScenarioFromPreviousStep ?? {
    scenarioName:
      state.usageScenario?.recommendedPrimaryScenario.scenarioName ??
      "从模糊 AI 产品想法进入产品发现与 Demo 准备",
    scenarioDefinition:
      state.usageScenario?.recommendedPrimaryScenario.scenarioDefinition ??
      "用户需要把模糊想法推进为可开发 Demo 输入",
    confidence: "medium" as const
  };
  const coreProblem = state.realProblem?.recommendedCoreProblem ?? {
    problemName: "难以把模糊 AI 产品想法转化为可开发、可展示、可验证的 Demo 方案",
    problemDefinition:
      "用户不是单纯缺 PRD，而是缺少产品发现、需求表达和开发任务衔接路径"
  };

  return {
    step: "current_alternative_analysis",
    rawIdeaSummary: state.context?.summary ?? state.input.idea,
    coreUserFromPreviousStep: coreUser,
    primaryScenarioFromPreviousStep: primaryScenario,
    coreProblemFromPreviousStep: {
      problemName: coreProblem.problemName,
      problemDefinition: coreProblem.problemDefinition,
      confidence: "high"
    },
    currentSolutionPaths: [
      {
        pathName: "ChatGPT / Claude 手动问答",
        workflow: ["原始想法", "自己写 Prompt", "多轮追问", "复制整理", "手动拼 PRD", "交给 Cursor / Codex"],
        description: "成本低、灵活，但流程和质量高度依赖用户自己的 Prompt 能力。"
      },
      {
        pathName: "模板驱动",
        workflow: ["原始想法", "找 Notion / 飞书 / PRD 模板", "按模板填写", "手动补竞品和需求", "手动拆任务"],
        description: "能提供文档结构，但不能判断用户、场景、真实问题和产品机会。"
      },
      {
        pathName: "直接开发",
        workflow: ["原始想法", "打开 Cursor / Codex / Lovable / Bolt", "生成 Demo", "根据结果反推需求"],
        description: "能快速出界面或代码，但容易把模糊想法直接做成错方向 Demo。"
      }
    ],
    alternativeSolutions: [
      {
        alternativeName: "ChatGPT 手动提问",
        category: "general_llm",
        howUserUsesIt: "手写 Prompt，让模型分段生成用户、需求、PRD 和任务。",
        coveredTasks: ["开放问答", "文档草稿", "分析补全"],
        advantages: ["低成本", "灵活", "响应快"],
        limitations: ["缺少稳定流程", "缺少状态管理", "缺少质量评估", "上下游产物难衔接"],
        substitutionStrength: "medium",
        threatToProduct: "high"
      },
      {
        alternativeName: "Claude 手动生成 PRD",
        category: "general_llm",
        howUserUsesIt: "粘贴想法和背景，让 Claude 生成长文档或 PRD。",
        coveredTasks: ["长文档生成", "PRD 草稿", "结构化表达"],
        advantages: ["长上下文能力强", "文档质量较好"],
        limitations: ["仍依赖用户定义流程", "容易生成看似完整但未验证的文档"],
        substitutionStrength: "medium",
        threatToProduct: "high"
      },
      {
        alternativeName: "Notion / 飞书文档模板",
        category: "template",
        howUserUsesIt: "找 PRD、竞品分析或需求模板，手动填空。",
        coveredTasks: ["文档结构", "内容整理"],
        advantages: ["结构清晰", "易复制", "团队熟悉"],
        limitations: ["不会判断", "不会追问", "不能连接后续开发任务"],
        substitutionStrength: "low",
        threatToProduct: "medium"
      },
      {
        alternativeName: "Figma 原型模板",
        category: "prototype_tool",
        howUserUsesIt: "套用已有页面模板快速画页面。",
        coveredTasks: ["页面视觉", "简单原型"],
        advantages: ["视觉直观", "适合展示"],
        limitations: ["不解决用户、场景、真实问题和需求逻辑"],
        substitutionStrength: "low",
        threatToProduct: "low"
      },
      {
        alternativeName: "Cursor / Codex",
        category: "coding_tool",
        howUserUsesIt: "把需求或页面描述交给 AI Coding 工具生成代码。",
        coveredTasks: ["代码实现", "任务执行", "局部重构"],
        advantages: ["开发执行强", "可快速迭代代码"],
        limitations: ["需要清晰需求输入", "不负责产品发现", "无法替代前置判断"],
        substitutionStrength: "medium",
        threatToProduct: "medium"
      },
      {
        alternativeName: "Lovable / Bolt",
        category: "demo_builder",
        howUserUsesIt: "输入一句话想法快速生成可运行 Demo。",
        coveredTasks: ["快速页面生成", "Demo 初稿"],
        advantages: ["出结果快", "展示感强"],
        limitations: ["产品逻辑可能不清", "需求和场景验证不足", "开发上下文难沉淀"],
        substitutionStrength: "medium",
        threatToProduct: "medium"
      },
      {
        alternativeName: "竞品分析网站",
        category: "competitor_research_tool",
        howUserUsesIt: "搜索对标产品、功能和定位信息。",
        coveredTasks: ["竞品线索", "市场参考"],
        advantages: ["信息集中", "便于找对标"],
        limitations: ["不能把信息转成用户问题和 MVP 决策"],
        substitutionStrength: "low",
        threatToProduct: "low"
      },
      {
        alternativeName: "AI 搜索工具",
        category: "search_tool",
        howUserUsesIt: "用 AI 搜索行业资料、案例和趋势。",
        coveredTasks: ["资料收集", "行业线索"],
        advantages: ["检索快", "信息覆盖广"],
        limitations: ["不负责产品判断和任务衔接", "来源质量需要验证"],
        substitutionStrength: "low",
        threatToProduct: "medium"
      },
      {
        alternativeName: "用户自己手动整理",
        category: "manual_work",
        howUserUsesIt: "查资料、看案例、写文档、画原型、拆任务。",
        coveredTasks: ["全流程人工推进"],
        advantages: ["可控", "贴合个人理解"],
        limitations: ["耗时", "依赖经验", "容易遗漏关键判断"],
        substitutionStrength: "medium",
        threatToProduct: "medium"
      },
      {
        alternativeName: "请教产品经理或导师",
        category: "human_help",
        howUserUsesIt: "让有经验的人帮忙评审想法和文档。",
        coveredTasks: ["判断校正", "经验反馈"],
        advantages: ["反馈质量可能高", "能指出盲点"],
        limitations: ["不可规模化", "时间不稳定", "输出不一定结构化"],
        substitutionStrength: "medium",
        threatToProduct: "medium"
      }
    ],
    llmAlternativeAnalysis: {
      canReplace: ["开放问答", "文档初稿", "局部分析补全"],
      cannotReplace: ["稳定阶段化工作流", "状态管理", "质量评估", "从产品到开发的产物链路"],
      requiredProductAdvantage: ["分阶段引导", "动态追问", "Trace 和结构化产物", "可迭代的 Agent 工作流"]
    },
    templateAlternativeAnalysis: {
      canReplace: ["文档结构", "字段提示", "格式规范"],
      cannotReplace: ["判断用户是谁", "判断场景和真实问题", "动态调整分析路径", "连接开发任务"],
      requiredProductAdvantage: ["把模板升级为可判断、可追问、可迭代的工作流"]
    },
    vibeCodingToolAnalysis: {
      canReplace: ["代码实现", "页面生成", "局部开发任务执行"],
      cannotReplace: ["产品发现", "需求分析", "竞品判断", "开发前上下文组织"],
      bestIntegrationPoint: "AI Product Discover 输出 PRD、页面结构、技术上下文和任务拆解之后",
      requiredProductAdvantage: ["生成高质量开发上下文", "把产品判断转译为 Codex 可执行任务"]
    },
    workflowCoverageAnalysis: [
      {
        alternativeName: "ChatGPT / Claude",
        coveredWorkflowSteps: ["产品分析草稿", "PRD 草稿", "局部问答"],
        missingWorkflowSteps: ["稳定状态管理", "阶段化 Trace", "质量评估", "开发任务衔接"],
        biggestGap: "输出质量和流程完整性依赖用户自己设计 Prompt",
        endToEndSupport: false
      },
      {
        alternativeName: "Cursor / Codex",
        coveredWorkflowSteps: ["Demo 开发任务执行", "代码生成"],
        missingWorkflowSteps: ["用户识别", "场景分析", "真实问题分析", "需求和 PRD 形成"],
        biggestGap: "缺少清晰需求输入时无法保证方向正确",
        endToEndSupport: false
      }
    ],
    productDifferentiation: [
      {
        direction: "分阶段引导",
        whyImportant: "把开放问题收敛成可执行产品发现流程",
        alternativeWeaknessAddressed: "通用 LLM 容易发散",
        requiredProductCapability: "稳定节点编排和阶段产物"
      },
      {
        direction: "动态追问",
        whyImportant: "在信息不足时补齐关键判断",
        alternativeWeaknessAddressed: "模板不会判断也不会追问",
        requiredProductCapability: "澄清问题和上下文更新机制"
      },
      {
        direction: "状态管理",
        whyImportant: "后续节点必须稳定复用前序判断",
        alternativeWeaknessAddressed: "手动问答上下文容易断裂",
        requiredProductCapability: "AgentState、Trace 和结构化 Schema"
      },
      {
        direction: "面向 Vibe Coding / Codex 的开发上下文生成",
        whyImportant: "让产品发现结果能进入开发执行",
        alternativeWeaknessAddressed: "Demo 工具缺少前置产品判断",
        requiredProductCapability: "PRD、页面结构、技术上下文和任务拆解"
      },
      {
        direction: "质量评估与自检",
        whyImportant: "避免输出看似完整但不可用",
        alternativeWeaknessAddressed: "通用生成缺少评分和扣分原因",
        requiredProductCapability: "评测节点、扣分原因和优化建议"
      }
    ],
    replacementRisks: [
      {
        risk: "如果只是固定 Prompt",
        replacedBy: "ChatGPT / Claude",
        reason: "用户可以直接复制 Prompt 得到相似文本",
        riskLevel: "high",
        mitigationStrategy: "强化状态机、Trace、动态追问和结构化链路"
      },
      {
        risk: "如果只是文档模板",
        replacedBy: "Notion / 飞书模板",
        reason: "模板更轻、更便宜、更熟悉",
        riskLevel: "high",
        mitigationStrategy: "提供判断、追问、迭代和质量评估能力"
      },
      {
        risk: "如果只是生成页面",
        replacedBy: "Lovable / Bolt",
        reason: "Demo Builder 生成页面更快",
        riskLevel: "medium",
        mitigationStrategy: "定位在开发前的产品发现和开发上下文生成"
      },
      {
        risk: "如果只是拆开发任务",
        replacedBy: "Cursor / Codex",
        reason: "AI Coding 工具更接近代码执行",
        riskLevel: "medium",
        mitigationStrategy: "输出更高质量的需求、页面和任务输入"
      },
      {
        risk: "如果没有质量评估",
        replacedBy: "通用 LLM",
        reason: "输出无法证明比普通生成更可靠",
        riskLevel: "high",
        mitigationStrategy: "保留评分、扣分原因、重写和 Trace"
      }
    ],
    clarifyingQuestions: [
      "用户现在遇到模糊 AI 产品想法时，第一反应是问 ChatGPT、找模板，还是直接进 Cursor / Codex？",
      "用户现在用 ChatGPT / Claude 时，最不满意的是结果泛、流程断、不会追问，还是无法进入开发？",
      "用户是否已经用过 Notion / 飞书 / PRD 模板？卡在哪里？",
      "用户是否尝试过用 Lovable / Bolt 直接生成 Demo？结果是否能支撑作品集或真实验证？",
      "用户最需要 AI Product Discover 替他完成的是判断、组织、生成、衔接，还是质量评估？"
    ],
    readyForNextStep: true,
    nextStep: "pain_intensity_analysis"
  };
};

const extractStructuredAlternative = (
  llmOutput: string,
  fallback: CurrentAlternativeAnalysis
): CurrentAlternativeAnalysis => {
  const jsonCandidate = extractJsonFromText(llmOutput);

  if (!jsonCandidate) {
    return fallback;
  }

  try {
    return toCurrentAlternativeAnalysis(RawAlternativeSchema.parse(jsonCandidate));
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
  currentAlternative: CurrentAlternativeAnalysis
): ProductContext | null => {
  if (!context) {
    return context;
  }

  return {
    ...context,
    assumptions: uniqueNonEmpty([
      ...context.assumptions,
      `替代方案结构化上下文：${JSON.stringify(currentAlternative)}`,
      `最强替代风险：${currentAlternative.replacementRisks[0]?.risk ?? "待验证"}`,
      `下一步分析对象：${currentAlternative.nextStep}`
    ])
  };
};

export async function currentAlternativeNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "currentAlternativeNode",
    traceStage: "current_alternative",
    input: {
      input: state.input,
      context: state.context,
      usageScenario: state.usageScenario,
      realProblem: state.realProblem
    },
    execute: async () => {
      const userIdentificationResult = extractAssumptionJson(
        state.context,
        "用户识别结构化上下文："
      );
      const fallbackAlternative = buildFallbackAlternative(state);
      const llmOutput = await completeWithPrompt(
        deps,
        state,
        "current_alternative_analysis",
        currentAlternativePrompt.buildPrompt(
          buildPromptInput(state, userIdentificationResult)
        )
      );
      const currentAlternative = extractStructuredAlternative(
        llmOutput,
        fallbackAlternative
      );

      return {
        currentAlternative,
        context: updateProductContext(state.context, currentAlternative)
      };
    }
  });
}
