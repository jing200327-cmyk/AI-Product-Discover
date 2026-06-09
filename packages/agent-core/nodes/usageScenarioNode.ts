import { z } from "zod";
import type {
  AgentState,
  ProductContext,
  UsageScenarioAnalysis
} from "../../shared/types";
import { usageScenarioPrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

const ConfidenceSchema = z.enum(["low", "medium", "high"]);
const PrioritySchema = z.enum(["low", "medium", "high"]);

const RawUsageScenarioSchema = z
  .object({
    step: z.literal("usage_scenario_analysis"),
    raw_idea_summary: z.string().trim().min(1),
    core_user_from_previous_step: z
      .object({
        segment_name: z.string().trim().min(1),
        definition: z.string().trim().min(1),
        confidence: ConfidenceSchema
      })
      .strict(),
    explicit_scenario_info: z
      .object({
        mentioned_stage: z.string().trim().min(1),
        mentioned_trigger: z.string().trim().min(1),
        mentioned_task: z.string().trim().min(1),
        mentioned_goal: z.string().trim().min(1),
        mentioned_workflow: z.array(z.string().trim().min(1)),
        confidence: ConfidenceSchema
      })
      .strict(),
    scenario_candidates: z.array(
      z
        .object({
          scenario_name: z.string().trim().min(1),
          user_stage: z.string().trim().min(1),
          trigger_event: z.string().trim().min(1),
          user_task: z.string().trim().min(1),
          current_difficulty: z.string().trim().min(1),
          current_alternative: z.string().trim().min(1),
          motivation_to_use_product: z.string().trim().min(1),
          expected_output: z.string().trim().min(1),
          confidence: ConfidenceSchema,
          mvp_priority: PrioritySchema
        })
        .strict()
    ),
    recommended_primary_scenario: z
      .object({
        scenario_name: z.string().trim().min(1),
        scenario_definition: z.string().trim().min(1),
        core_user: z.string().trim().min(1),
        trigger_moment: z.string().trim().min(1),
        main_task: z.string().trim().min(1),
        current_blocker: z.string().trim().min(1),
        why_suitable_for_mvp: z.string().trim().min(1),
        success_criteria: z.string().trim().min(1),
        risk: z.string().trim().min(1)
      })
      .strict(),
    secondary_scenarios: z.array(
      z
        .object({
          scenario_name: z.string().trim().min(1),
          target_user: z.string().trim().min(1),
          reason_not_primary: z.string().trim().min(1),
          future_value: z.string().trim().min(1)
        })
        .strict()
    ),
    not_recommended_scenarios: z.array(
      z
        .object({
          scenario_name: z.string().trim().min(1),
          reason: z.string().trim().min(1),
          risk: z.string().trim().min(1)
        })
        .strict()
    ),
    scenario_workflow: z.array(
      z
        .object({
          workflow_step: z.string().trim().min(1),
          user_action: z.string().trim().min(1),
          system_support: z.string().trim().min(1),
          output_artifact: z.string().trim().min(1)
        })
        .strict()
    ),
    scenario_definition_risks: z.array(z.string().trim().min(1)),
    clarifying_questions: z.array(z.string().trim().min(1)).min(3).max(5),
    ready_for_next_step: z.boolean(),
    next_step: z.literal("real_problem_analysis")
  })
  .strict();

type RawUsageScenario = z.infer<typeof RawUsageScenarioSchema>;

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

const extractUserIdentificationResult = (context: ProductContext | null): unknown => {
  const prefix = "用户识别结构化上下文：";
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

const getCoreUserFromPreviousStep = (
  context: ProductContext | null,
  userIdentificationResult: unknown
): UsageScenarioAnalysis["coreUserFromPreviousStep"] => {
  const record =
    typeof userIdentificationResult === "object" && userIdentificationResult !== null
      ? (userIdentificationResult as {
          recommended_core_user?: {
            segment_name?: string;
            definition?: string;
          };
          explicit_user_info?: {
            confidence?: "low" | "medium" | "high";
          };
        })
      : null;
  const recommended = record?.recommended_core_user;

  return {
    segmentName:
      recommended?.segment_name ?? context?.targetUsers[0] ?? "待澄清的 MVP 核心用户",
    definition:
      recommended?.definition ??
      context?.valueProposition ??
      "当前核心用户尚未完全确定，需要基于最可能用户候选分析使用场景",
    confidence: record?.explicit_user_info?.confidence ?? "medium"
  };
};

const toUsageScenarioAnalysis = (
  raw: RawUsageScenario
): UsageScenarioAnalysis => ({
  step: raw.step,
  rawIdeaSummary: raw.raw_idea_summary,
  coreUserFromPreviousStep: {
    segmentName: raw.core_user_from_previous_step.segment_name,
    definition: raw.core_user_from_previous_step.definition,
    confidence: raw.core_user_from_previous_step.confidence
  },
  explicitScenarioInfo: {
    mentionedStage: raw.explicit_scenario_info.mentioned_stage,
    mentionedTrigger: raw.explicit_scenario_info.mentioned_trigger,
    mentionedTask: raw.explicit_scenario_info.mentioned_task,
    mentionedGoal: raw.explicit_scenario_info.mentioned_goal,
    mentionedWorkflow: raw.explicit_scenario_info.mentioned_workflow,
    confidence: raw.explicit_scenario_info.confidence
  },
  scenarioCandidates: raw.scenario_candidates.map((scenario) => ({
    scenarioName: scenario.scenario_name,
    userStage: scenario.user_stage,
    triggerEvent: scenario.trigger_event,
    userTask: scenario.user_task,
    currentDifficulty: scenario.current_difficulty,
    currentAlternative: scenario.current_alternative,
    motivationToUseProduct: scenario.motivation_to_use_product,
    expectedOutput: scenario.expected_output,
    confidence: scenario.confidence,
    mvpPriority: scenario.mvp_priority
  })),
  recommendedPrimaryScenario: {
    scenarioName: raw.recommended_primary_scenario.scenario_name,
    scenarioDefinition: raw.recommended_primary_scenario.scenario_definition,
    coreUser: raw.recommended_primary_scenario.core_user,
    triggerMoment: raw.recommended_primary_scenario.trigger_moment,
    mainTask: raw.recommended_primary_scenario.main_task,
    currentBlocker: raw.recommended_primary_scenario.current_blocker,
    whySuitableForMvp: raw.recommended_primary_scenario.why_suitable_for_mvp,
    successCriteria: raw.recommended_primary_scenario.success_criteria,
    risk: raw.recommended_primary_scenario.risk
  },
  secondaryScenarios: raw.secondary_scenarios.map((scenario) => ({
    scenarioName: scenario.scenario_name,
    targetUser: scenario.target_user,
    reasonNotPrimary: scenario.reason_not_primary,
    futureValue: scenario.future_value
  })),
  notRecommendedScenarios: raw.not_recommended_scenarios.map((scenario) => ({
    scenarioName: scenario.scenario_name,
    reason: scenario.reason,
    risk: scenario.risk
  })),
  scenarioWorkflow: raw.scenario_workflow.map((step) => ({
    workflowStep: step.workflow_step,
    userAction: step.user_action,
    systemSupport: step.system_support,
    outputArtifact: step.output_artifact
  })),
  scenarioDefinitionRisks: raw.scenario_definition_risks,
  clarifyingQuestions: raw.clarifying_questions,
  readyForNextStep: raw.ready_for_next_step,
  nextStep: raw.next_step
});

const buildFallbackUsageScenario = (
  state: AgentState,
  userIdentificationResult: unknown
): UsageScenarioAnalysis => {
  const coreUser = getCoreUserFromPreviousStep(state.context, userIdentificationResult);
  const scenarioName = "从模糊 AI 产品想法进入产品发现与 Demo 准备";

  return {
    step: "usage_scenario_analysis",
    rawIdeaSummary: state.context?.summary ?? state.input.idea,
    coreUserFromPreviousStep: coreUser,
    explicitScenarioInfo: {
      mentionedStage: "想法早期，尚未形成完整产品方案",
      mentionedTrigger: "用户产生一个模糊产品想法，但需要判断下一步如何推进",
      mentionedTask: "把一句话想法转成可继续分析的产品发现上下文",
      mentionedGoal: "明确使用场景，并进入真实问题分析",
      mentionedWorkflow: ["原始想法", "用户识别", "使用场景分析", "真实问题分析"],
      confidence: "medium"
    },
    scenarioCandidates: [
      {
        scenarioName,
        userStage: "刚有 AI 产品想法，准备判断是否值得继续做",
        triggerEvent: "准备把想法写成作品集项目、MVP 或可开发 Demo",
        userTask: "厘清谁会在什么场景下使用该产品，并形成后续需求分析输入",
        currentDifficulty: "只有方向和功能想象，缺少具体任务、触发事件和使用链路",
        currentAlternative: "直接问通用大模型、手写文档、边写代码边改",
        motivationToUseProduct:
          "希望通过结构化 Agent 流程减少产品发现遗漏，降低进入开发前的混乱",
        expectedOutput: "主使用场景、次级场景、暂不建议场景、场景链路和澄清问题",
        confidence: "medium",
        mvpPriority: "high"
      }
    ],
    recommendedPrimaryScenario: {
      scenarioName,
      scenarioDefinition:
        "核心用户已有一个模糊 AI 产品想法，准备进入产品发现和 Demo 准备，但缺少清晰的使用场景、任务链路和后续分析输入。",
      coreUser: coreUser.segmentName,
      triggerMoment: "用户准备把想法推进为作品集项目、创业验证 MVP 或 Vibe Coding Demo 之前",
      mainTask: "明确该想法最优先服务的具体使用场景，并为真实问题分析提供上下文",
      currentBlocker: "场景、功能和目标用户混在一起，无法判断 MVP 应该优先验证什么",
      whySuitableForMvp:
        "该场景与 AI Product Discover 的主链路高度匹配，任务边界清楚，输出能自然进入真实问题、需求、竞品、PRD 和 Demo 任务拆解。",
      successCriteria:
        "用户能说清楚一个主场景、触发时刻、当前替代方式、期望输出和下一步分析对象",
      risk: "如果核心用户仍未确定，场景判断可能只是合理假设，需要继续澄清"
    },
    secondaryScenarios: [
      {
        scenarioName: "面试前梳理 AI 产品项目故事",
        targetUser: coreUser.segmentName,
        reasonNotPrimary: "更偏一次性表达包装，可能弱化产品发现主链路",
        futureValue: "可扩展为作品集叙事和面试答辩辅助"
      }
    ],
    notRecommendedScenarios: [
      {
        scenarioName: "纯 PRD 生成器",
        reason: "只覆盖下游文档生成，无法验证目标用户和真实场景",
        risk: "容易变成通用文档工具，丢失产品发现 Agent 的差异化"
      },
      {
        scenarioName: "纯代码生成器",
        reason: "跳过产品理解和场景判断，过早进入实现",
        risk: "产出 Demo 可能不可解释、不可验证，无法支撑产品判断"
      }
    ],
    scenarioWorkflow: [
      {
        workflowStep: "用户前置状态",
        userAction: "带着一句话 AI 产品想法进入系统",
        systemSupport: "记录原始想法和上下文",
        outputArtifact: "产品想法输入"
      },
      {
        workflowStep: "系统帮助识别用户",
        userAction: "查看核心用户候选和角色区分",
        systemSupport: "识别显性用户、推断用户和 MVP 核心用户",
        outputArtifact: "用户识别上下文"
      },
      {
        workflowStep: "系统帮助明确使用场景",
        userAction: "确认主场景是否符合真实推进目标",
        systemSupport: "区分主场景、次级场景和暂不建议场景",
        outputArtifact: "使用场景分析"
      },
      {
        workflowStep: "系统继续分析真实问题",
        userAction: "基于主场景继续判断真实痛点",
        systemSupport: "把场景传递给真实问题分析 Agent",
        outputArtifact: "真实问题分析输入"
      }
    ],
    scenarioDefinitionRisks: [
      "当前场景可能仍停留在推断层面，需要用户确认触发事件是否真实存在",
      "如果用户目标是求职、创业和企业落地同时存在，MVP 主场景可能失焦",
      "当前替代方案仍需确认，否则难以判断场景痛点强度"
    ],
    clarifyingQuestions: [
      "用户通常在什么时刻最需要启动这个产品发现流程？",
      "用户输入原始想法之前，已经做过哪些准备或尝试？",
      "用户最希望系统先帮他完成哪一段链路：场景澄清、需求分析、竞品研究、PRD，还是 Demo 任务拆解？",
      "用户拿到使用场景分析结果后，下一步最可能做什么？",
      "这个场景主要服务学习/求职、创业验证，还是企业项目落地？"
    ],
    readyForNextStep: true,
    nextStep: "real_problem_analysis"
  };
};

const extractStructuredScenario = (
  llmOutput: string,
  fallback: UsageScenarioAnalysis
): UsageScenarioAnalysis => {
  const jsonCandidate = extractJsonFromText(llmOutput);

  if (!jsonCandidate) {
    return fallback;
  }

  try {
    return toUsageScenarioAnalysis(RawUsageScenarioSchema.parse(jsonCandidate));
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
  usageScenario: UsageScenarioAnalysis
): ProductContext | null => {
  if (!context) {
    return context;
  }

  return {
    ...context,
    assumptions: uniqueNonEmpty([
      ...context.assumptions,
      `使用场景结构化上下文：${JSON.stringify(usageScenario)}`,
      `推荐主使用场景：${usageScenario.recommendedPrimaryScenario.scenarioName}`,
      `主场景触发时刻：${usageScenario.recommendedPrimaryScenario.triggerMoment}`,
      `下一步分析对象：${usageScenario.nextStep}`
    ])
  };
};

export async function usageScenarioNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "usageScenarioNode",
    traceStage: "usage_scenario",
    input: {
      input: state.input,
      context: state.context
    },
    execute: async () => {
      const userIdentificationResult = extractUserIdentificationResult(state.context);
      const fallbackScenario = buildFallbackUsageScenario(
        state,
        userIdentificationResult
      );
      const llmOutput = await completeWithPrompt(
        deps,
        state,
        "usage_scenario_analysis",
        usageScenarioPrompt.buildPrompt(
          buildPromptInput(state, userIdentificationResult)
        )
      );
      const usageScenario = extractStructuredScenario(llmOutput, fallbackScenario);

      return {
        usageScenario,
        context: updateProductContext(state.context, usageScenario)
      };
    }
  });
}
