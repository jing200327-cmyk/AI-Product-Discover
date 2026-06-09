import { randomUUID } from "node:crypto";
import {
  AgentStateSchema,
  ProductDiscoveryProfileSchema,
  Step3AnalysisResultSchema,
  Step4ClarificationResultSchema,
  Step7ResearchPlanResultSchema,
  Step8MarketAnalysisResultSchema,
  Step9CompetitorIdentificationResultSchema,
  Step10CompetitorAnalysisTableResultSchema,
  Step11UserPersonaResultSchema,
  Step12MvpPrdResultSchema
} from "../../shared/schemas";
import type {
  AgentState,
  AlternativeItem,
  ClarificationQuestion,
  ClarificationTargetField,
  DiscoveryClarificationQuestion,
  DiscoveryField,
  DiscoveryResearchPlan,
  EvaluationResult,
  LayeredEvidenceItem,
  OutcomeItem,
  PainStrength,
  ProblemItem,
  ProductDiscoveryProfile,
  ProductIdeaInput,
  ScenarioItem,
  Step3AnalysisResult,
  Step4ClarificationQuestion,
  Step4ClarificationResult,
  Step7ResearchPlanResult,
  Step8MarketAnalysisResult,
  Step9CompetitorIdentificationResult,
  Step10CompetitorAnalysisTableResult,
  Step11UserPersonaResult,
  Step12MvpPrdResult,
  SupplementalResearchQuery,
  SupplementalResearchResult,
  SourceItem,
  TargetUser,
  TraceEvent,
  UserAnswer
} from "../../shared/types";
import {
  step3AnalysisPrompt,
  step4ClarificationPrompt,
  step7ResearchPlanPrompt,
  step8MarketAnalysisPrompt,
  step9CompetitorIdentificationPrompt,
  step10CompetitorAnalysisTablePrompt,
  step11UserPersonaPrompt,
  step12MvpPrdPrompt
} from "../prompts";
import { createDefaultLlmProvider, createDefaultModelRouter } from "../llm";
import { evaluationNode, inputParserNode, type AgentNodeDeps } from "../nodes";
import { createInitialAgentState } from "../state/createInitialState";
import { createDefaultToolRegistry } from "../tools";
import type { MockSearchOutput } from "../tools/mockSearchTool";

export type ProductDiscoveryEvent = {
  stage: string;
  message: string;
  stateSnapshot: AgentState;
};

export type RunProductDiscoveryWorkflowOptions = {
  deps?: Partial<AgentNodeDeps>;
  onEvent?: (event: ProductDiscoveryEvent) => Promise<void> | void;
};

const createDefaultDeps = (): AgentNodeDeps => ({
  llmProvider: createDefaultLlmProvider(),
  modelRouter: createDefaultModelRouter(),
  toolRegistry: createDefaultToolRegistry(),
  traceLogger: {
    record() {
      return undefined;
    }
  }
});

const mergeDeps = (overrides?: Partial<AgentNodeDeps>): AgentNodeDeps => ({
  ...createDefaultDeps(),
  ...overrides
});

const createTraceId = (): string => `trace_${Date.now().toString(36)}_${randomUUID()}`;

const nowIso = (): string => new Date().toISOString();

const emit = async (
  options: RunProductDiscoveryWorkflowOptions,
  event: ProductDiscoveryEvent
): Promise<void> => {
  await options.onEvent?.(event);
};

function createTraceEvent(input: {
  state: AgentState;
  nodeName: string;
  stage: TraceEvent["stage"];
  nodeInput: unknown;
  output: unknown;
  status?: TraceEvent["status"];
  startedAt?: Date;
}): TraceEvent {
  const startedAt = input.startedAt ?? new Date();
  const endedAt = new Date();

  return {
    traceId: createTraceId(),
    runId: input.state.runId,
    stage: input.stage,
    nodeName: input.nodeName,
    status: input.status ?? "success",
    input: input.nodeInput,
    output: input.output,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime()
  };
}

function applyTrace(
  state: AgentState,
  event: TraceEvent,
  patch: Partial<AgentState> = {}
): AgentState {
  return AgentStateSchema.parse({
    ...state,
    ...patch,
    trace: [...state.trace, event],
    updatedAt: event.endedAt ?? nowIso()
  });
}

function createField<T>(
  value: T,
  input: {
    confidence: DiscoveryField<T>["confidence"];
    source: DiscoveryField<T>["source"];
    status: DiscoveryField<T>["status"];
    evidence: string[];
  }
): DiscoveryField<T> {
  return {
    value,
    confidence: input.confidence,
    source: input.source,
    status: input.status,
    evidence: input.evidence
  };
}

function createRawIdeaState(input: ProductIdeaInput): AgentState {
  const baseState = createInitialAgentState(input);
  const event = createTraceEvent({
    state: baseState,
    nodeName: "rawIdeaNode",
    stage: "idea_input",
    nodeInput: input,
    output: {
      rawIdea: input.idea
    }
  });

  return AgentStateSchema.parse({
    ...baseState,
    trace: [event],
    updatedAt: event.endedAt
  });
}

function normalizeTargetUserTrace(state: AgentState): AgentState {
  return AgentStateSchema.parse({
    ...state,
    trace: state.trace.map((event) =>
      event.nodeName === "inputParserNode"
        ? {
            ...event,
            nodeName: "targetUserAgent",
            output: {
              targetUserIdentification: state.targetUserIdentification
            }
          }
        : event
    )
  });
}

function getCoreUser(targetUsers: TargetUser[]): TargetUser | undefined {
  return (
    targetUsers.find((user) => user.userType === "core_user") ?? targetUsers[0]
  );
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()));
}

function runScenarioProblemAgent(profile: ProductDiscoveryProfile): ProductDiscoveryProfile {
  const idea = profile.rawIdea.value;
  const targetUsers = profile.targetUsers.value;
  const coreUser = getCoreUser(targetUsers);
  const coreUserName = coreUser?.name ?? "待明确的核心用户";
  const scenarioName = includesAny(idea, ["求职", "岗位", "JD", "HR"])
    ? "投递前沟通准备"
    : includesAny(idea, ["库存", "跨境", "卖家", "电商"])
      ? "日常库存风险检查"
      : includesAny(idea, ["PRD", "产品想法", "原型", "Demo"])
        ? "把模糊想法整理为可验证方案"
        : "完成关键任务前的信息整理";
  const task = includesAny(idea, ["求职", "岗位", "JD", "HR"])
    ? "根据岗位 JD 准备更合适的开场沟通内容"
    : includesAny(idea, ["库存", "跨境", "卖家", "电商"])
      ? "提前发现可能缺货或积压的商品"
      : includesAny(idea, ["PRD", "产品想法", "原型", "Demo"])
        ? "梳理用户、场景、问题和验证重点"
        : "把输入中的目标任务整理清楚";
  const scenario: ScenarioItem = {
    id: "scenario_001",
    name: scenarioName,
    targetUser: coreUserName,
    trigger: "用户需要开始处理这个产品想法对应的具体任务时",
    userTask: task,
    expectedOutcome: "更快得到可判断、可继续推进的下一步材料",
    evidence: ["来自产品想法中的任务描述", ...profile.rawIdea.evidence],
    confidence: coreUser ? "medium" : "low"
  };
  const problem: ProblemItem = {
    id: "problem_001",
    name: "关键判断不清晰",
    description:
      "用户已经有一个产品或任务方向，但目标用户、使用场景和待验证问题仍不够清晰。",
    affectedScenarioId: scenario.id,
    rootCause: "原始想法仍混合了目标、功能和结果，需要先拆成可验证问题。",
    impact: "medium",
    evidence: ["当前输入更像初始想法，缺少完整的用户场景与成功标准"],
    confidence: "medium"
  };
  const alternative: AlternativeItem = {
    id: "alternative_001",
    name: "手动整理或直接询问通用 LLM",
    category: "general_llm",
    howItWorks: "用户把想法发给通用工具，再自行追问和整理结果。",
    limitation: "容易跳到功能方案，缺少连续的产品发现状态和判断依据。",
    evidence: ["该任务目前通常可以被人工整理或通用 AI 临时替代"],
    confidence: "medium"
  };
  const painStrength: PainStrength = {
    level: "medium",
    score: 3,
    reasons: [
      "当前只基于原始想法推断，尚未获得用户确认",
      "任务方向明确，但频率、付费意愿和替代方案成本仍需澄清"
    ],
    confidence: "medium"
  };
  const outcome: OutcomeItem = {
    id: "outcome_001",
    name: "形成可继续研究的产品发现上下文",
    description: "明确核心用户、关键场景、主要问题和后续研究问题。",
    successSignal: "后续可以据此生成研究计划，而不是直接进入 PRD 或竞品分析。",
    confidence: "medium"
  };

  return ProductDiscoveryProfileSchema.parse({
    ...profile,
    status: "needs_input",
    scenarios: createField([scenario], {
      confidence: scenario.confidence,
      source: "agent_inference",
      status: "inferred",
      evidence: scenario.evidence
    }),
    problems: createField([problem], {
      confidence: problem.confidence,
      source: "agent_inference",
      status: "inferred",
      evidence: problem.evidence
    }),
    alternatives: createField([alternative], {
      confidence: alternative.confidence,
      source: "agent_inference",
      status: "inferred",
      evidence: alternative.evidence
    }),
    painStrength: createField(painStrength, {
      confidence: painStrength.confidence,
      source: "agent_inference",
      status: "inferred",
      evidence: painStrength.reasons
    }),
    desiredOutcomes: createField([outcome], {
      confidence: outcome.confidence,
      source: "agent_inference",
      status: "inferred",
      evidence: [outcome.successSignal]
    })
  });
}

type Step3AgentInput = {
  rawIdea: string;
  targetUsers: TargetUser[];
  scenarios: ScenarioItem[];
};

function extractJsonObject(text: string): unknown | null {
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];

  for (const match of fenced.reverse()) {
    try {
      return JSON.parse(match[1] ?? "");
    } catch {
      // Continue scanning.
    }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }

  return null;
}

function createJobGreetingStep3(input: Step3AgentInput): Step3AnalysisResult {
  const targetUser = getCoreUser(input.targetUsers)?.name ?? "求职者";
  const primaryScenario =
    input.scenarios[0]?.name ?? "投递岗位前或主动联系 HR 前";

  return Step3AnalysisResultSchema.parse({
    productBoundary: {
      coreTask:
        "基于岗位 JD 和个人简历生成个性化 HR 打招呼内容",
      targetUser,
      primaryScenario,
      inScope: [
        "分析岗位 JD 的关键能力要求",
        "提取简历中与岗位相关的优势",
        "匹配岗位要求与候选人经历",
        "生成个性化 HR 打招呼内容",
        "优化打招呼内容的自然度和吸引力"
      ],
      outOfScope: [
        "推荐应该投递哪些岗位",
        "完整修改个人简历",
        "职业规划",
        "面试准备",
        "选择目标公司"
      ],
      boundaryReason:
        "该产品的核心任务是生成个性化 HR 打招呼内容，因此只处理与 JD 理解、简历匹配和短消息表达直接相关的问题。"
    },
    realProblems: [
      {
        id: "problem_001",
        title: "难以根据不同岗位 JD 写出有针对性的 HR 打招呼内容",
        description:
          "求职者面对不同岗位时，往往只能写出泛泛的开场白，无法体现自己与岗位的具体匹配点。",
        relatedScenario: primaryScenario,
        whyReal:
          "它直接发生在主动联系 HR 前，决定用户是否需要一个自动生成个性化开场内容的工具。",
        featureImplication:
          "需要 JD 解析、候选人亮点提取、岗位匹配点生成和短消息生成能力。",
        evidence: ["原始想法包含“岗位 JD”“HR 打招呼”“个性化”"],
        confidence: "high"
      },
      {
        id: "problem_002",
        title: "难以从岗位 JD 中提取 HR 真正关注的能力要求",
        description:
          "求职者可能看得懂 JD，但不确定哪些要求应该被放进打招呼内容中突出表达。",
        relatedScenario: primaryScenario,
        whyReal:
          "如果无法理解 JD 重点，生成内容就会缺少针对性，直接影响产品核心价值。",
        featureImplication:
          "需要岗位关键词提取、能力要求归类和优先级判断能力。",
        evidence: ["原始想法明确提到“针对岗位 JD”"],
        confidence: "high"
      },
      {
        id: "problem_003",
        title: "难以把简历亮点和岗位要求进行匹配",
        description:
          "求职者不知道如何把自己的经历转换成 HR 愿意继续查看的简短表达。",
        relatedScenario: primaryScenario,
        whyReal:
          "该问题连接了简历信息和打招呼内容，是个性化生成区别于模板生成的核心。",
        featureImplication:
          "需要简历亮点识别、经历与岗位要求匹配、候选人优势表达能力。",
        evidence: ["原始想法同时包含“个人简历”和“HR 打招呼”"],
        confidence: "high"
      },
      {
        id: "problem_004",
        title: "通用模板容易机械、重复、不够个性化",
        description:
          "求职者使用模板或通用 AI 输出时，内容容易与其他候选人相似，缺少岗位和个人差异。",
        relatedScenario: primaryScenario,
        whyReal:
          "该问题解释了为什么现有替代方案不足，也支撑产品需要做垂直化生成。",
        featureImplication:
          "需要根据 JD、简历和平台限制生成差异化表达，并提供可编辑版本。",
        evidence: ["个性化是原始想法中的明确目标"],
        confidence: "medium"
      }
    ],
    falseProblems: [
      {
        id: "false_001",
        title: "应该投递哪些岗位",
        reason:
          "这属于岗位推荐或职业选择问题，不属于生成 HR 打招呼内容的核心任务。",
        boundary: "adjacent_problem"
      },
      {
        id: "false_002",
        title: "如何完整修改简历",
        reason:
          "简历优化可以提供输入材料，但完整简历修改不是当前产品的核心输出。",
        boundary: "not_core_task"
      },
      {
        id: "false_003",
        title: "如何准备面试",
        reason:
          "面试准备发生在后续阶段，不属于主动联系 HR 前的打招呼场景。",
        boundary: "adjacent_problem"
      }
    ],
    alternativeSolutions: [
      {
        id: "alternative_001",
        name: "自己手写打招呼内容",
        type: "manual",
        description: "求职者自己阅读 JD 和简历后手动组织开场内容。",
        howItSolves: "可以完全按照个人理解表达，但依赖用户写作和岗位分析能力。",
        weakness: "耗时，且容易表达普通，难以稳定覆盖岗位匹配点。",
        opportunity: "用 Agent 自动提取 JD 要点和简历亮点，降低手写成本。",
        evidence: ["该任务天然可以由用户手动完成"],
        confidence: "high"
      },
      {
        id: "alternative_002",
        name: "复制网上或平台默认模板",
        type: "template",
        description: "直接套用求职平台或网络上的通用招呼语模板。",
        howItSolves: "快速生成一段可发送的话术。",
        weakness: "模板化严重，难以体现岗位匹配度和个人差异。",
        opportunity: "提供基于 JD 和简历动态生成的个性化内容。",
        evidence: ["打招呼内容常见替代方式是模板话术"],
        confidence: "high"
      },
      {
        id: "alternative_003",
        name: "ChatGPT / Claude / Kimi 等通用 AI",
        type: "general_ai",
        description: "用户手动粘贴 JD 和简历，再组织 Prompt 请求生成内容。",
        howItSolves: "能够生成初稿，并可通过追问继续修改。",
        weakness: "需要用户自己整理输入、设计 Prompt、判断输出是否匹配岗位。",
        opportunity: "沉淀固定工作流，自动拆解 JD、简历和发送场景。",
        evidence: ["通用 AI 可覆盖文本生成，但缺少垂直流程约束"],
        confidence: "high"
      },
      {
        id: "alternative_004",
        name: "招聘平台默认打招呼话术",
        type: "platform_feature",
        description: "使用招聘平台提供的默认开场白或快捷短语。",
        howItSolves: "减少用户输入成本，快速完成联系动作。",
        weakness: "个性化弱，容易与其他求职者重复。",
        opportunity: "为不同岗位和候选人生成差异化版本，提高沟通质量。",
        evidence: ["HR 打招呼通常发生在招聘平台或即时沟通场景"],
        confidence: "medium"
      },
      {
        id: "alternative_005",
        name: "朋友或职业顾问帮忙修改",
        type: "consultant",
        description: "找有经验的人帮忙润色或建议表达方式。",
        howItSolves: "能获得人工经验判断和更自然的表达。",
        weakness: "响应慢、成本高，不适合高频投递多个岗位。",
        opportunity: "用低成本自动化方式覆盖高频、重复但需要个性化的任务。",
        evidence: ["求职沟通属于可被人工辅导的场景"],
        confidence: "medium"
      }
    ],
    painStrength: {
      level: "high",
      totalScore: 24,
      maxScore: 30,
      score: {
        importance: 4,
        frequency: 4,
        urgency: 4,
        currentSolutionGap: 4,
        consequence: 4,
        willingnessToUse: 4
      },
      reason:
        "该场景发生在求职投递和主动沟通前，直接影响 HR 是否注意到候选人。主动求职阶段需要反复为不同岗位生成个性化开场内容，现有模板和通用 AI 都存在效率和个性化不足。",
      keyDrivers: [
        "求职沟通影响 HR 回复率",
        "主动投递阶段使用频率较高",
        "现有模板容易同质化",
        "通用 AI 需要用户自己组织 JD、简历和 Prompt"
      ],
      risks: [
        "是否真实提升 HR 回复率需要验证",
        "不同招聘平台对消息长度和格式有差异",
        "部分求职者可能仍习惯直接使用平台默认话术"
      ],
      confidence: "medium"
    },
    gapResult: {
      missingFields: ["目标平台", "简历输入方式", "HR 消息长度限制"],
      lowConfidenceFields: ["真实回复率提升", "用户持续使用频率"],
      suggestedClarificationTargets: [
        "用户主要在哪个平台联系 HR",
        "用户是否愿意上传或粘贴简历",
        "用户现在最常用的替代方式是什么"
      ]
    }
  });
}

function createGenericStep3(input: Step3AgentInput): Step3AnalysisResult {
  const targetUser = getCoreUser(input.targetUsers)?.name ?? "核心用户";
  const primaryScenario = input.scenarios[0]?.name ?? "关键使用场景";
  const coreTask = input.scenarios[0]?.userTask ?? "完成当前产品想法中的核心任务";

  return Step3AnalysisResultSchema.parse({
    productBoundary: {
      coreTask,
      targetUser,
      primaryScenario,
      inScope: [
        "帮助用户完成核心任务前的信息整理",
        "减少用户在关键场景中的重复判断",
        "输出可直接用于下一步行动的结果"
      ],
      outOfScope: [
        "解决与核心任务无直接关系的泛化问题",
        "替用户完成长期战略决策",
        "覆盖所有相邻业务流程"
      ],
      boundaryReason:
        "当前阶段只能依据原始想法、目标用户和已识别场景判断产品边界，低置信度内容需要在 Step4 继续澄清。"
    },
    realProblems: [
      {
        id: "problem_001",
        title: "用户难以把输入信息转化为可执行结果",
        description:
          "目标用户在关键场景中需要完成具体任务，但缺少把信息整理成下一步行动材料的稳定方法。",
        relatedScenario: primaryScenario,
        whyReal:
          "该问题发生在核心使用场景中，会直接影响用户是否需要产品辅助。",
        featureImplication: "需要信息提取、结构化整理和结果生成能力。",
        evidence: ["来自原始产品想法和目标用户推断"],
        confidence: "medium"
      },
      {
        id: "problem_002",
        title: "现有处理方式依赖人工反复判断",
        description:
          "用户可能需要在多个输入、目标和约束之间来回比较，人工处理成本较高。",
        relatedScenario: primaryScenario,
        whyReal:
          "如果人工判断成本高，产品可以通过 Agent 工作流提供明显效率价值。",
        featureImplication: "需要任务拆解、规则判断和可追踪输出能力。",
        evidence: ["当前想法指向一个需要自动化辅助的任务"],
        confidence: "medium"
      },
      {
        id: "problem_003",
        title: "输出质量缺少一致标准",
        description:
          "用户即使能得到结果，也不容易判断结果是否符合场景、用户和目标要求。",
        relatedScenario: primaryScenario,
        whyReal:
          "质量标准不清会导致产品需要提供解释、评分或依据，而不是只生成文本。",
        featureImplication: "需要判断依据、置信度和可解释结果展示。",
        evidence: ["产品发现阶段需要区分事实、推断和待验证假设"],
        confidence: "medium"
      }
    ],
    falseProblems: [
      {
        id: "false_001",
        title: "泛化地解决所有相关业务问题",
        reason: "范围过宽，无法直接支撑 MVP 功能设计。",
        boundary: "too_broad"
      }
    ],
    alternativeSolutions: [
      {
        id: "alternative_001",
        name: "手动整理",
        type: "manual",
        description: "用户自己收集信息、判断重点并输出结果。",
        howItSolves: "依靠个人经验完成核心任务。",
        weakness: "耗时且质量不稳定。",
        opportunity: "用结构化 Agent 流程降低人工判断成本。",
        evidence: ["大多数早期任务都可以由人工完成"],
        confidence: "medium"
      },
      {
        id: "alternative_002",
        name: "通用 AI 工具",
        type: "general_ai",
        description: "用户把想法输入通用 LLM，通过追问获得结果。",
        howItSolves: "生成初稿或建议。",
        weakness: "需要用户自己设计 Prompt，结果缺少产品边界和 Trace。",
        opportunity: "提供面向产品发现场景的固定流程和结构化输出。",
        evidence: ["当前项目具备 LLM / Agent 替代空间"],
        confidence: "medium"
      },
      {
        id: "alternative_003",
        name: "模板或表格",
        type: "template",
        description: "用户套用固定模板填写信息。",
        howItSolves: "提供基本结构。",
        weakness: "不能根据具体输入动态判断重点。",
        opportunity: "结合输入自动生成个性化分析结果。",
        evidence: ["模板是结构化任务常见替代方案"],
        confidence: "medium"
      },
      {
        id: "alternative_004",
        name: "找有经验的人协助",
        type: "consultant",
        description: "让专家、朋友或顾问帮忙判断。",
        howItSolves: "依靠人的经验给出建议。",
        weakness: "成本高、响应慢，难以高频使用。",
        opportunity: "用低成本 Agent 先覆盖高频基础判断。",
        evidence: ["复杂判断任务常存在人工咨询替代"],
        confidence: "low"
      }
    ],
    painStrength: {
      level: "medium",
      totalScore: 19,
      maxScore: 30,
      score: {
        importance: 3,
        frequency: 3,
        urgency: 3,
        currentSolutionGap: 4,
        consequence: 3,
        willingnessToUse: 3
      },
      reason:
        "当前输入能够看出核心任务存在效率和质量问题，但频率、紧急程度和付费意愿仍需要用户确认。",
      keyDrivers: [
        "现有方案依赖用户自己组织信息",
        "通用 AI 缺少固定流程",
        "结构化输出对后续验证有价值"
      ],
      risks: [
        "目标用户是否高频遇到该问题仍需验证",
        "现有替代方案成本可能并不高",
        "用户是否愿意切换到新工具未知"
      ],
      confidence: "medium"
    },
    gapResult: {
      missingFields: ["高频场景", "当前替代方案", "成功标准"],
      lowConfidenceFields: ["使用频率", "付费或持续使用意愿"],
      suggestedClarificationTargets: [
        "用户现在如何解决该问题",
        "这个任务多久发生一次",
        "完成后什么结果算成功"
      ]
    }
  });
}

function createFallbackStep3Analysis(input: Step3AgentInput): Step3AnalysisResult {
  return includesAny(input.rawIdea, ["求职", "岗位", "JD", "简历", "HR", "打招呼", "个性化"])
    ? createJobGreetingStep3(input)
    : createGenericStep3(input);
}

async function runStep3AnalysisAgent(
  input: Step3AgentInput,
  state: AgentState,
  deps: AgentNodeDeps
): Promise<Step3AnalysisResult> {
  const fallback = createFallbackStep3Analysis(input);

  try {
    const model = deps.modelRouter.selectModel({
      nodeName: "step3_analysis",
      state
    });
    const output = await deps.llmProvider.complete({
      prompt: step3AnalysisPrompt.buildPrompt(input),
      nodeName: "step3_analysis",
      model,
      state,
      traceLogger: deps.traceLogger
    });
    const parsed = extractJsonObject(output);

    return parsed ? Step3AnalysisResultSchema.parse(parsed) : fallback;
  } catch {
    return fallback;
  }
}

function toProblemItems(result: Step3AnalysisResult): ProblemItem[] {
  return result.realProblems.map((problem) => ({
    id: problem.id,
    name: problem.title,
    description: problem.description,
    affectedScenarioId: problem.relatedScenario,
    rootCause: problem.whyReal,
    impact: result.painStrength.level === "high" ? "high" : "medium",
    evidence: problem.evidence,
    confidence: problem.confidence
  }));
}

function toAlternativeItems(result: Step3AnalysisResult): AlternativeItem[] {
  const categoryMap: Record<
    Step3AnalysisResult["alternativeSolutions"][number]["type"],
    AlternativeItem["category"]
  > = {
    manual: "manual_work",
    template: "template",
    general_ai: "general_llm",
    platform_feature: "other",
    consultant: "human_help",
    indirect_tool: "other"
  };

  return result.alternativeSolutions.map((alternative) => ({
    id: alternative.id,
    name: alternative.name,
    category: categoryMap[alternative.type],
    howItWorks: alternative.description,
    limitation: alternative.weakness,
    evidence: alternative.evidence,
    confidence: alternative.confidence
  }));
}

function toPainStrength(result: Step3AnalysisResult): PainStrength {
  return {
    level:
      result.painStrength.level === "high"
        ? "strong"
        : result.painStrength.level === "medium"
          ? "medium"
          : "weak",
    score: Math.max(1, Math.min(5, Math.round(result.painStrength.totalScore / 6))),
    reasons: [result.painStrength.reason, ...result.painStrength.keyDrivers],
    confidence: result.painStrength.confidence
  };
}

async function runEnhancedStep3Agent(
  profile: ProductDiscoveryProfile,
  state: AgentState,
  deps: AgentNodeDeps
): Promise<ProductDiscoveryProfile> {
  const scenarioProfile = runScenarioProblemAgent(profile);
  const analysis = await runStep3AnalysisAgent(
    {
      rawIdea: scenarioProfile.rawIdea.value,
      targetUsers: scenarioProfile.targetUsers.value,
      scenarios: scenarioProfile.scenarios.value
    },
    state,
    deps
  );
  const problems = toProblemItems(analysis);
  const alternatives = toAlternativeItems(analysis);
  const painStrength = toPainStrength(analysis);

  return ProductDiscoveryProfileSchema.parse({
    ...scenarioProfile,
    step3Analysis: analysis,
    problems: createField(problems, {
      confidence: analysis.painStrength.confidence,
      source: "agent_inference",
      status: "inferred",
      evidence: analysis.realProblems.flatMap((problem) => problem.evidence)
    }),
    alternatives: createField(alternatives, {
      confidence: analysis.painStrength.confidence,
      source: "agent_inference",
      status: "inferred",
      evidence: analysis.alternativeSolutions.flatMap(
        (alternative) => alternative.evidence
      )
    }),
    painStrength: createField(painStrength, {
      confidence: painStrength.confidence,
      source: "agent_inference",
      status: "inferred",
      evidence: painStrength.reasons
    })
  });
}

type Step4AgentInput = {
  rawIdea: string;
  targetUsers: TargetUser[];
  step3AnalysisResult: Step3AnalysisResult;
};

function hasHighConfidenceTargetUser(targetUsers: TargetUser[]): boolean {
  return targetUsers.some(
    (user) => user.userType === "core_user" && user.confidence !== "low"
  );
}

function evaluateContextCompleteness(input: Step4AgentInput) {
  const isJobGreeting = includesAny(input.rawIdea, [
    "求职者",
    "岗位 JD",
    "简历",
    "HR",
    "打招呼",
    "个性化"
  ]);
  const hasClearTargetUsers =
    hasHighConfidenceTargetUser(input.targetUsers) || isJobGreeting;
  const hasClearScenarios = Boolean(
    input.step3AnalysisResult.productBoundary.primaryScenario.trim()
  );
  const hasClearRealProblems =
    (isJobGreeting || input.step3AnalysisResult.realProblems.length >= 2) &&
    input.step3AnalysisResult.realProblems.some(
      (problem) => problem.confidence !== "low"
    );
  const hasClearAlternatives =
    input.step3AnalysisResult.alternativeSolutions.length >= 2;
  const hasClearPainStrength =
    input.step3AnalysisResult.painStrength.totalScore >= 6 &&
    input.step3AnalysisResult.painStrength.confidence !== "low";
  const missingFields: ClarificationTargetField[] = [
    !hasClearTargetUsers ? "target_users" : null,
    !hasClearScenarios ? "scenarios" : null,
    !hasClearRealProblems ? "real_problems" : null,
    !hasClearAlternatives ? "alternatives" : null,
    !hasClearPainStrength ? "pain_strength" : null
  ].filter((field): field is ClarificationTargetField => field !== null);
  const lowConfidenceFields: ClarificationTargetField[] = [
    input.step3AnalysisResult.gapResult.lowConfidenceFields.includes(
      "真实回复率提升"
    )
      ? "evaluation_metric"
      : null,
    input.step3AnalysisResult.painStrength.confidence === "medium"
      ? "evaluation_metric"
      : null,
    "input_interaction",
    "generation_requirement",
    "privacy_security",
    "technical_integration"
  ].filter((field): field is ClarificationTargetField => field !== null);
  const overallCompleteness =
    missingFields.length === 0 && hasClearRealProblems
      ? "high"
      : missingFields.length <= 2
        ? "medium"
        : "low";

  return {
    hasClearTargetUsers,
    hasClearScenarios,
    hasClearRealProblems,
    hasClearAlternatives,
    hasClearPainStrength,
    missingFields,
    lowConfidenceFields: [...new Set(lowConfidenceFields)],
    overallCompleteness,
    reason:
      overallCompleteness === "high"
        ? "目标用户、使用场景和真实问题已经较清楚，下一步应澄清输入、生成、隐私、集成和评估等落地决策。"
        : "前 3 步仍存在基础信息缺口，需要先补齐产品发现上下文。"
  } satisfies Step4ClarificationResult["completeness"];
}

function routeClarificationDepth(
  completeness: Step4ClarificationResult["completeness"],
  step3Analysis: Step3AnalysisResult
): Step4ClarificationResult["depth"] {
  if (
    !completeness.hasClearTargetUsers ||
    !completeness.hasClearScenarios ||
    !completeness.hasClearRealProblems
  ) {
    return "discovery_basic";
  }

  if (
    step3Analysis.painStrength.level === "high" &&
    completeness.hasClearAlternatives
  ) {
    return "requirement_deepening";
  }

  return "requirement_deepening";
}

function planQuestions(
  depth: Step4ClarificationResult["depth"],
  completeness: Step4ClarificationResult["completeness"]
): Step4ClarificationResult["questionPlan"] {
  if (depth === "discovery_basic") {
    return {
      depth,
      categories: [
        "target_user",
        "scenario",
        "real_problem",
        "alternative",
        "pain_strength"
      ],
      maxQuestionCount: 6,
      reason: `需要优先补齐：${completeness.missingFields.join("、")}`
    };
  }

  if (depth === "implementation_decision") {
    return {
      depth,
      categories: [
        "mvp_scope",
        "data_structure",
        "model_capability",
        "user_flow",
        "evaluation_metric"
      ].filter(
        (category): category is Step4ClarificationResult["questionPlan"]["categories"][number] =>
          category !== "data_structure" &&
          category !== "model_capability" &&
          category !== "user_flow"
      ),
      maxQuestionCount: 8,
      reason: "上下文已经接近 PRD 落地，需要澄清实现决策。"
    };
  }

  return {
    depth,
    categories: [
      "input_interaction",
      "generation_requirement",
      "privacy_security",
      "technical_integration",
      "operation_commercialization",
      "compatibility_extension",
      "risk_boundary",
      "evaluation_metric"
    ],
    maxQuestionCount: 8,
    reason:
      "当前基础产品发现信息已足够，需要进一步澄清会影响 MVP 范围、核心流程、Agent 能力边界和数据处理方式的问题。"
  };
}

function createBasicQuestions(
  plan: Step4ClarificationResult["questionPlan"]
): Step4ClarificationQuestion[] {
  const questions: Step4ClarificationQuestion[] = [
    {
      id: "q_001",
      category: "target_user",
      targetField: "target_users",
      question: "这个产品 MVP 阶段最先服务哪类具体用户？",
      reason: "核心用户不清楚时，后续 PRD、场景和 MVP 范围都会发散。",
      affects: ["MVP 范围", "用户画像", "PRD"],
      answerType: "text",
      priority: "high",
      required: true
    },
    {
      id: "q_002",
      category: "scenario",
      targetField: "scenarios",
      question: "用户会在什么具体时刻使用这个产品？",
      reason: "触发时刻决定产品入口、流程和首屏信息。",
      affects: ["用户流程", "页面结构", "MVP 范围"],
      answerType: "text",
      priority: "high",
      required: true
    },
    {
      id: "q_003",
      category: "real_problem",
      targetField: "real_problems",
      question: "这个产品到底要帮用户解决哪一步最难的动作？",
      reason: "真实问题会决定 Agent 能力边界，而不是泛泛生成内容。",
      affects: ["Agent 能力", "PRD", "验证假设"],
      answerType: "text",
      priority: "high",
      required: true
    },
    {
      id: "q_004",
      category: "alternative",
      targetField: "alternatives",
      question: "用户现在不用这个产品时，通常如何解决同一个问题？",
      reason: "替代方案会影响差异化和 MVP 价值判断。",
      affects: ["竞品研究", "差异化", "MVP 验证"],
      answerType: "text",
      priority: "medium",
      required: true
    }
  ];

  return questions.slice(0, plan.maxQuestionCount);
}

function createJobGreetingDeepQuestions(): Step4ClarificationQuestion[] {
  return [
    {
      id: "q_001",
      category: "input_interaction",
      targetField: "input_interaction",
      question: "简历和岗位 JD 的输入方式需要支持哪些？",
      reason: "输入方式会直接影响首版交互复杂度和技术实现成本。",
      affects: ["MVP 范围", "前端交互", "文件解析能力", "技术架构"],
      answerType: "multiple_choice",
      options: [
        "直接粘贴文本",
        "上传 PDF 简历",
        "上传 Word 简历",
        "上传岗位 JD 截图",
        "粘贴招聘网站链接",
        "暂时只支持手动输入"
      ],
      priority: "high",
      required: true
    },
    {
      id: "q_002",
      category: "generation_requirement",
      targetField: "generation_requirement",
      question: "你希望生成的 HR 打招呼内容主要偏什么风格？",
      reason: "内容风格决定 Prompt 设计、生成模板和用户可控参数。",
      affects: ["Prompt 设计", "生成质量", "前端配置项", "用户体验"],
      answerType: "multiple_choice",
      options: [
        "正式专业",
        "自然亲和",
        "简明扼要",
        "突出技能匹配",
        "突出项目经历",
        "更像真人表达",
        "避免 AI 感"
      ],
      priority: "high",
      required: true
    },
    {
      id: "q_003",
      category: "generation_requirement",
      targetField: "generation_requirement",
      question: "生成内容是否需要自动高亮 JD 和简历之间的关键匹配点？",
      reason: "这会影响产品是否只是生成文案，还是提供可解释的匹配分析能力。",
      affects: ["Agent 能力边界", "结果展示", "用户信任", "PRD 功能范围"],
      answerType: "single_choice",
      options: [
        "需要，高亮 JD 要求和简历匹配点",
        "需要，但只展示简短匹配理由",
        "不需要，只输出打招呼内容",
        "后续版本再考虑"
      ],
      priority: "high",
      required: true
    },
    {
      id: "q_004",
      category: "generation_requirement",
      targetField: "generation_requirement",
      question: "是否需要根据不同求职场景生成不同内容变体？",
      reason: "不同场景会影响内容结构、语气和生成策略。",
      affects: ["生成策略", "模板体系", "用户流程", "MVP 范围"],
      answerType: "multiple_choice",
      options: [
        "公开投递岗位",
        "主动联系 HR",
        "内推沟通",
        "猎头沟通",
        "邮件投递",
        "Boss 直聘 / 拉勾等平台私信",
        "首版只做一种通用场景"
      ],
      priority: "medium",
      required: false
    },
    {
      id: "q_005",
      category: "privacy_security",
      targetField: "privacy_security",
      question: "用户上传或粘贴的简历、岗位 JD 和生成内容是否需要保存？",
      reason: "简历包含敏感信息，数据保存策略会影响隐私合规、账户系统和历史记录功能。",
      affects: ["数据隐私", "账户系统", "历史记录", "后端存储", "合规风险"],
      answerType: "single_choice",
      options: [
        "不保存，用完即删",
        "保存历史记录，用户可手动删除",
        "默认保存，但支持定期自动删除",
        "只保存生成结果，不保存原始简历",
        "首版先不做账户和历史记录"
      ],
      priority: "high",
      required: true
    },
    {
      id: "q_006",
      category: "technical_integration",
      targetField: "technical_integration",
      question: "首版产品需要集成第三方招聘平台或发送渠道吗？",
      reason: "是否集成平台会显著影响开发成本、权限、合规和上线节奏。",
      affects: ["技术架构", "开发周期", "平台合规", "MVP 范围"],
      answerType: "single_choice",
      options: [
        "不集成，只提供复制结果",
        "支持一键复制到剪贴板",
        "支持导出文本",
        "集成邮件发送",
        "集成招聘平台",
        "后续版本再考虑"
      ],
      priority: "high",
      required: true
    },
    {
      id: "q_007",
      category: "evaluation_metric",
      targetField: "evaluation_metric",
      question: "你希望用什么指标判断这个产品是否有效？",
      reason: "效果指标会影响后续评估体系、数据埋点和产品优化方向。",
      affects: ["评估指标", "数据分析后台", "产品迭代", "商业化判断"],
      answerType: "multiple_choice",
      options: [
        "生成内容被复制的比例",
        "用户修改生成内容的比例",
        "用户重复使用次数",
        "HR 回复率",
        "用户满意度评分",
        "节省写作时间",
        "暂时不做效果追踪"
      ],
      priority: "medium",
      required: false
    },
    {
      id: "q_008",
      category: "risk_boundary",
      targetField: "risk_boundary",
      question: "是否需要限制或拦截不合适的打招呼内容？",
      reason: "风控边界会影响内容安全、用户投诉处理和产品可信度。",
      affects: ["内容安全", "风控策略", "用户反馈机制", "产品边界"],
      answerType: "multiple_choice",
      options: [
        "防止骚扰性表达",
        "防止夸大或虚构经历",
        "防止过度营销或不礼貌表达",
        "支持用户举报或反馈",
        "生成前加入免责声明",
        "首版暂不做复杂风控"
      ],
      priority: "medium",
      required: false
    }
  ];
}

function createGenericDeepQuestions(): Step4ClarificationQuestion[] {
  return [
    {
      id: "q_001",
      category: "input_interaction",
      targetField: "input_interaction",
      question: "用户完成核心任务时，需要输入哪些必要信息？",
      reason: "输入信息决定首版表单、Agent 上下文和数据结构。",
      affects: ["MVP 范围", "前端交互", "Agent 输入 Schema"],
      answerType: "text",
      priority: "high",
      required: true
    },
    {
      id: "q_002",
      category: "generation_requirement",
      targetField: "generation_requirement",
      question: "生成结果需要满足哪些质量标准？",
      reason: "质量标准会影响 Prompt、评测和结果展示。",
      affects: ["Prompt 设计", "评测指标", "用户体验"],
      answerType: "text",
      priority: "high",
      required: true
    },
    {
      id: "q_003",
      category: "privacy_security",
      targetField: "privacy_security",
      question: "用户输入的数据是否包含敏感信息，是否需要保存？",
      reason: "数据策略会影响隐私、安全和后端存储。",
      affects: ["数据隐私", "后端存储", "合规风险"],
      answerType: "single_choice",
      options: ["不保存", "保存历史记录", "只保存生成结果", "待确认"],
      priority: "high",
      required: true
    },
    {
      id: "q_004",
      category: "technical_integration",
      targetField: "technical_integration",
      question: "首版是否需要接入外部平台或第三方工具？",
      reason: "外部集成会显著影响开发周期和上线风险。",
      affects: ["技术架构", "开发周期", "MVP 范围"],
      answerType: "single_choice",
      options: ["不需要", "需要读数据", "需要写入或发送", "后续版本再考虑"],
      priority: "medium",
      required: true
    },
    {
      id: "q_005",
      category: "evaluation_metric",
      targetField: "evaluation_metric",
      question: "用什么指标判断产品是否真的解决了问题？",
      reason: "指标会影响验证计划、埋点和迭代判断。",
      affects: ["评估指标", "研究计划", "MVP 验证"],
      answerType: "text",
      priority: "medium",
      required: false
    },
    {
      id: "q_006",
      category: "risk_boundary",
      targetField: "risk_boundary",
      question: "哪些输出或行为必须被限制在产品边界之外？",
      reason: "边界会影响风控、免责声明和产品可信度。",
      affects: ["产品边界", "风控策略", "PRD"],
      answerType: "text",
      priority: "medium",
      required: false
    }
  ];
}

function dedupeQuestions(
  questions: Step4ClarificationQuestion[],
  maxQuestionCount: number
): Step4ClarificationQuestion[] {
  const seen = new Set<string>();

  return questions
    .filter((question) => {
      const key = question.question.trim();

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, maxQuestionCount);
}

function createFallbackStep4Clarification(
  input: Step4AgentInput
): Step4ClarificationResult {
  const completeness = evaluateContextCompleteness(input);
  const depth = routeClarificationDepth(completeness, input.step3AnalysisResult);
  const questionPlan = planQuestions(depth, completeness);
  const isJobGreeting = includesAny(input.rawIdea, [
    "求职者",
    "岗位 JD",
    "简历",
    "HR",
    "打招呼",
    "个性化"
  ]);
  const generatedQuestions =
    depth === "discovery_basic"
      ? createBasicQuestions(questionPlan)
      : isJobGreeting
        ? createJobGreetingDeepQuestions()
        : createGenericDeepQuestions();

  return Step4ClarificationResultSchema.parse({
    completeness,
    depth,
    questionPlan,
    questions: dedupeQuestions(generatedQuestions, questionPlan.maxQuestionCount)
  });
}

async function runStep4ClarificationAgent(
  input: Step4AgentInput,
  state: AgentState,
  deps: AgentNodeDeps
): Promise<Step4ClarificationResult> {
  const fallback = createFallbackStep4Clarification(input);

  try {
    const model = deps.modelRouter.selectModel({
      nodeName: "step4_clarification",
      state
    });
    const output = await deps.llmProvider.complete({
      prompt: step4ClarificationPrompt.buildPrompt(input),
      nodeName: "step4_clarification",
      model,
      state,
      traceLogger: deps.traceLogger
    });
    const parsed = extractJsonObject(output);

    return parsed ? Step4ClarificationResultSchema.parse(parsed) : fallback;
  } catch {
    return fallback;
  }
}

function toDiscoveryClarificationQuestions(
  questions: Step4ClarificationQuestion[]
): DiscoveryClarificationQuestion[] {
  return questions.map((question) => ({
    id: question.id,
    category: question.category,
    question: question.question,
    reason: question.reason,
    targetField: question.targetField,
    affects: question.affects,
    answerType: question.answerType,
    inputType: question.answerType,
    options: question.options,
    priority: question.priority,
    required: question.required
  }));
}

function createCompatibilityQuestions(
  questions: DiscoveryClarificationQuestion[]
): ClarificationQuestion[] {
  return questions.map((question) => ({
    id: question.id,
    question: question.question,
    reason: question.reason,
    required: question.required
  }));
}

function createInitialProfile(state: AgentState): ProductDiscoveryProfile {
  const targetUsers = state.targetUserIdentification?.targetUsers ?? [];
  const confidence =
    targetUsers.find((user) => user.confidence === "high") !== undefined
      ? "high"
      : targetUsers.length > 0
        ? "medium"
        : "low";

  return ProductDiscoveryProfileSchema.parse({
    workflowVersion: "product_discovery_v1",
    status: "running",
    rawIdea: createField(state.input.idea, {
      confidence: "high",
      source: "user_input",
      status: "confirmed",
      evidence: ["用户在首页输入的产品想法"]
    }),
    targetUsers: createField(targetUsers, {
      confidence,
      source: targetUsers.some((user) => user.evidenceType === "keyword")
        ? "keyword"
        : "task_inference",
      status: targetUsers.length > 0 ? "inferred" : "needs_input",
      evidence: targetUsers.flatMap((user) => user.evidence)
    }),
    scenarios: createField([], {
      confidence: "low",
      source: "agent_inference",
      status: "needs_input",
      evidence: []
    }),
    problems: createField([], {
      confidence: "low",
      source: "agent_inference",
      status: "needs_input",
      evidence: []
    }),
    alternatives: createField([], {
      confidence: "low",
      source: "agent_inference",
      status: "needs_input",
      evidence: []
    }),
    painStrength: createField(null, {
      confidence: "low",
      source: "agent_inference",
      status: "needs_input",
      evidence: []
    }),
    desiredOutcomes: createField([], {
      confidence: "low",
      source: "agent_inference",
      status: "needs_input",
      evidence: []
    }),
    step3Analysis: null,
    step4Clarification: null,
    clarificationQuestions: [],
    userAnswers: [],
    revisionSummary: [],
    researchPlan: null,
    step7ResearchPlan: null,
    step8MarketAnalysis: null,
    step9CompetitorIdentification: null,
    step10CompetitorAnalysisTable: null,
    step11UserPersonas: null,
    step12MvpPrd: null,
    supplementalResearch: null
  });
}

function integrateAnswers(
  profile: ProductDiscoveryProfile,
  answers: UserAnswer[]
): ProductDiscoveryProfile {
  const answerByField = new Map<
    DiscoveryClarificationQuestion["targetField"],
    string[]
  >();

  for (const answer of answers) {
    const question = profile.clarificationQuestions.find(
      (item) => item.id === answer.questionId
    );
    const answerText = Array.isArray(answer.answer)
      ? answer.answer.join("；")
      : answer.answer;

    if (!question || !answerText.trim()) {
      continue;
    }

    const existing = answerByField.get(question.targetField) ?? [];
    answerByField.set(question.targetField, [...existing, answerText.trim()]);
  }

  const revisionSummary = [...answerByField.entries()].map(([field, values]) =>
    `已根据用户回答确认 ${field}：${values.join("；")}`
  );

  return ProductDiscoveryProfileSchema.parse({
    ...profile,
    status: "completed",
    scenarios: answerByField.has("scenarios")
      ? {
          ...profile.scenarios,
          confidence: "high",
          source: "user_confirmed",
          status: "confirmed",
          evidence: [...profile.scenarios.evidence, ...answerByField.get("scenarios")!]
        }
      : profile.scenarios,
    problems: answerByField.has("real_problems")
      ? {
          ...profile.problems,
          confidence: "high",
          source: "user_confirmed",
          status: "confirmed",
          evidence: [
            ...profile.problems.evidence,
            ...answerByField.get("real_problems")!
          ]
        }
      : profile.problems,
    alternatives: answerByField.has("alternatives")
      ? {
          ...profile.alternatives,
          confidence: "high",
          source: "user_confirmed",
          status: "confirmed",
          evidence: [
            ...profile.alternatives.evidence,
            ...answerByField.get("alternatives")!
          ]
        }
      : profile.alternatives,
    painStrength: answerByField.has("pain_strength")
      ? {
          ...profile.painStrength,
          confidence: "high",
          source: "user_confirmed",
          status: "confirmed",
          evidence: [
            ...profile.painStrength.evidence,
            ...answerByField.get("pain_strength")!
          ]
        }
      : profile.painStrength,
    desiredOutcomes: answerByField.has("desired_outcomes")
      ? {
          ...profile.desiredOutcomes,
          confidence: "high",
          source: "user_confirmed",
          status: "confirmed",
          evidence: [
            ...profile.desiredOutcomes.evidence,
            ...answerByField.get("desired_outcomes")!
          ]
        }
      : profile.desiredOutcomes,
    userAnswers: answers,
    revisionSummary:
      revisionSummary.length > 0
        ? revisionSummary
        : ["用户回答已记录，但尚未形成新的确认字段。"]
  });
}

type Step7AgentInput = {
  rawIdea: string;
  targetUsers: TargetUser[];
  step3AnalysisResult: Step3AnalysisResult;
  clarificationQuestions: DiscoveryClarificationQuestion[];
  userAnswers: UserAnswer[];
  revisedDiscoveryProfile: ProductDiscoveryProfile;
};

function createResearchContext(input: Step7AgentInput) {
  const coreUsers =
    input.targetUsers
      .filter((user) => user.userType === "core_user")
      .map((user) => user.name) ||
    input.targetUsers.map((user) => user.name);
  const painLevel = input.step3AnalysisResult.painStrength.level;

  return {
    productIdea: input.rawIdea,
    coreUsers: coreUsers.length > 0 ? coreUsers : ["待验证核心用户"],
    coreScenario: input.step3AnalysisResult.productBoundary.primaryScenario,
    realProblems: input.step3AnalysisResult.realProblems.map(
      (problem) => problem.title
    ),
    alternatives: input.step3AnalysisResult.alternativeSolutions.map(
      (alternative) => alternative.name
    ),
    painLevel,
    researchFocus: [
      "user_research",
      "competitor_research",
      "mvp_validation",
      "usability_testing",
      ...(painLevel === "high" ? ["pricing_validation" as const] : [])
    ],
    reason:
      "前置产品发现已经形成目标用户、核心场景、真实问题、替代方案和痛点强度判断，下一步需要用研究验证这些判断，并服务 PRD、原型和 MVP 范围。"
  } satisfies Step7ResearchPlanResult["researchPlan"]["context"];
}

function createJobGreetingStep7(input: Step7AgentInput): Step7ResearchPlanResult {
  const context = createResearchContext(input);

  return Step7ResearchPlanResultSchema.parse({
    step: "step7",
    title: "研究计划生成",
    status: input.userAnswers.length > 0 ? "completed" : "needs_more_info",
    researchPlan: {
      title: "求职沟通 AI 助手研究计划",
      summary:
        "围绕求职者在投递前基于岗位 JD 和简历生成个性化 HR 打招呼内容的场景，验证真实痛点、替代方案缺口、内容偏好、隐私顾虑、使用意愿和 MVP 首版范围。",
      context,
      goals: [
        {
          id: "goal_001",
          goal: "明确核心目标用户画像及其求职沟通痛点",
          reason: "不同求职阶段的人对打招呼内容的频率、质量和信任要求不同。",
          relatedDecision: "用户画像、MVP 首批人群、访谈招募标准",
          priority: "high"
        },
        {
          id: "goal_002",
          goal: "验证个性化 HR 打招呼内容是否是强需求",
          reason: "需要确认该问题是否真的影响 HR 回复率、投递效率或用户信心。",
          relatedDecision: "MVP 是否继续、核心功能优先级",
          priority: "high"
        },
        {
          id: "goal_003",
          goal: "理解现有替代方案的缺口",
          reason: "手写、模板、通用 AI 和平台默认话术都可能替代本产品。",
          relatedDecision: "差异化、竞品分析、Agent 工作流设计",
          priority: "high"
        },
        {
          id: "goal_004",
          goal: "判断首版输入、生成和隐私处理边界",
          reason: "简历与 JD 输入方式、保存策略和生成解释会显著影响首版复杂度。",
          relatedDecision: "PRD、原型、技术架构、数据安全",
          priority: "high"
        },
        {
          id: "goal_005",
          goal: "评估使用意愿和付费可能性",
          reason: "高频求职场景不一定意味着用户愿意付费，需要验证商业化空间。",
          relatedDecision: "定价策略、增长策略、商业化判断",
          priority: "medium"
        }
      ],
      keyQuestions: [
        {
          id: "rq_001",
          question: "求职者在给 HR 打招呼时最大困惑是什么？",
          category: "pain_validation",
          whyImportant: "用于验证 Step3 中识别的真实问题是否成立。",
          expectedInsight: "明确用户最难的是 JD 理解、简历匹配、表达风格还是回复率焦虑。",
          priority: "high"
        },
        {
          id: "rq_002",
          question: "用户现有打招呼内容主要从哪里获得？",
          category: "alternative_solution",
          whyImportant: "用于比较手写、模板、通用 AI 和平台默认话术的真实使用情况。",
          expectedInsight: "识别最强替代方案和产品机会点。",
          priority: "high"
        },
        {
          id: "rq_003",
          question: "用户需要多大程度的 JD 与简历匹配解释？",
          category: "content_preference",
          whyImportant: "决定产品是只生成文案，还是提供可解释匹配分析。",
          expectedInsight: "明确结果页是否需要高亮匹配点、来源依据和多个版本。",
          priority: "high"
        },
        {
          id: "rq_004",
          question: "用户是否在意内容重复、AI 感、准确性和合规性？",
          category: "trust_risk",
          whyImportant: "影响生成策略、风控边界和免责声明。",
          expectedInsight: "明确需要避免的内容风险和信任机制。",
          priority: "high"
        },
        {
          id: "rq_005",
          question: "不同求职人群在内容偏好上有什么差异？",
          category: "scenario_difference",
          whyImportant: "应届生、转行者、资深候选人可能需要不同生成策略。",
          expectedInsight: "确定 MVP 是否需要分人群模板或场景变体。",
          priority: "medium"
        },
        {
          id: "rq_006",
          question: "用户愿意为高质量打招呼内容付费吗？",
          category: "pricing",
          whyImportant: "验证独立工具的商业化可能性。",
          expectedInsight: "初步判断免费、按次、订阅或求职服务捆绑的可行性。",
          priority: "medium"
        },
        {
          id: "rq_007",
          question: "市场上现有替代产品还有哪些未满足需求？",
          category: "competitor_gap",
          whyImportant: "避免直接进入 PRD 前忽略强替代方案。",
          expectedInsight: "形成竞品差异点和 MVP 切入角度。",
          priority: "medium"
        }
      ],
      methods: [
        {
          id: "method_001",
          method: "桌面研究与竞品分析",
          purpose: "梳理招聘平台、简历工具、通用 AI 和求职话术工具的替代关系。",
          targetParticipants: "公开产品、招聘平台功能、求职社区内容",
          sampleSize: "8-12 个替代方案",
          executionSteps: [
            "整理招聘平台默认打招呼能力",
            "测试通用 AI 生成 JD + 简历打招呼内容的效果",
            "收集求职社区中常见话术模板",
            "对比输入方式、个性化程度、解释能力和隐私处理"
          ],
          expectedOutput: "替代方案矩阵和差异化机会点",
          priority: "high"
        },
        {
          id: "method_002",
          method: "定性用户访谈",
          purpose: "理解求职者真实沟通行为、痛点和内容信任标准。",
          targetParticipants: "正在主动投递岗位的求职者、应届生、转行求职者",
          sampleSize: "10-15 人",
          executionSteps: [
            "筛选近 30 天有主动投递经历的用户",
            "访谈现有打招呼流程和失败经验",
            "让用户展示或回忆最近一次打招呼内容",
            "询问对 AI 生成内容、隐私和付费的态度"
          ],
          expectedOutput: "用户画像、痛点证据、内容偏好和信任风险",
          priority: "high"
        },
        {
          id: "method_003",
          method: "问卷调研",
          purpose: "量化投递频率、替代方案使用、付费意愿和隐私顾虑。",
          targetParticipants: "近 3 个月有求职行为的人群",
          sampleSize: "100-200 份",
          executionSteps: [
            "设计 10-15 个围绕频率、痛点、替代方案和付费的问题",
            "在求职社群、校园群或职业平台分发",
            "按应届生、转行者、社招候选人分层统计",
            "筛选愿意参与原型测试的用户"
          ],
          expectedOutput: "量化需求强度、用户分层和付费意愿初判",
          priority: "high"
        },
        {
          id: "method_004",
          method: "快速原型可用性测试",
          purpose: "验证用户是否能理解输入流程、信任生成结果并愿意复制使用。",
          targetParticipants: "目标求职者",
          sampleSize: "5-8 人",
          executionSteps: [
            "制作低保真原型或可点击流程",
            "让用户输入 JD 与简历片段",
            "观察用户是否理解匹配点和生成结果",
            "记录复制、修改、拒绝和隐私顾虑"
          ],
          expectedOutput: "首版流程问题、结果展示优化点和 MVP 功能建议",
          priority: "high"
        }
      ],
      timeline: [
        {
          id: "time_001",
          phase: "研究范围确认",
          task: "确认研究目标、招募条件和访谈提纲",
          duration: "1 天",
          owner: "产品经理",
          output: "研究计划与访谈脚本"
        },
        {
          id: "time_002",
          phase: "桌面研究",
          task: "完成替代方案和竞品桌面研究",
          duration: "2 天",
          owner: "产品经理 / 研究员",
          dependency: "研究范围确认",
          output: "替代方案矩阵"
        },
        {
          id: "time_003",
          phase: "用户访谈",
          task: "招募并访谈 10-15 名目标用户",
          duration: "3 天",
          owner: "用户研究员",
          dependency: "访谈脚本",
          output: "访谈纪要与痛点证据"
        },
        {
          id: "time_004",
          phase: "问卷调研",
          task: "设计、分发并回收 100-200 份问卷",
          duration: "2 天",
          owner: "产品经理 / 运营",
          dependency: "访谈初步发现",
          output: "问卷分析报告"
        },
        {
          id: "time_005",
          phase: "原型测试",
          task: "完成 5-8 名用户的快速原型可用性测试",
          duration: "2 天",
          owner: "设计师 / 产品经理",
          dependency: "低保真原型",
          output: "可用性问题和 MVP 建议"
        },
        {
          id: "time_006",
          phase: "总结决策",
          task: "汇总研究结论并输出 MVP 范围建议",
          duration: "1 天",
          owner: "产品经理",
          dependency: "全部研究材料",
          output: "研究结论与下一步 PRD 输入"
        }
      ],
      deliverables: [
        {
          id: "deliverable_001",
          deliverable: "用户研究摘要",
          description: "总结核心用户画像、求职沟通痛点和高频场景。",
          usedFor: ["PRD", "用户画像", "MVP 范围"]
        },
        {
          id: "deliverable_002",
          deliverable: "替代方案与竞品矩阵",
          description: "对比手写、模板、通用 AI、招聘平台默认话术和垂直工具。",
          usedFor: ["竞品分析", "差异化定位", "Agent 能力设计"]
        },
        {
          id: "deliverable_003",
          deliverable: "MVP 功能范围建议",
          description: "明确首版输入方式、生成结果、解释能力和隐私策略。",
          usedFor: ["MVP_scope", "PRD", "prototype"]
        },
        {
          id: "deliverable_004",
          deliverable: "验证指标建议",
          description: "定义复制率、修改率、重复使用、满意度和 HR 回复率等指标。",
          usedFor: ["evaluation_metrics", "增长策略", "商业化判断"]
        }
      ],
      risks: [
        {
          id: "risk_001",
          risk: "用户说法与真实投递行为不一致",
          impact: "可能高估内容生成需求或付费意愿。",
          mitigation: "访谈时要求用户展示最近一次真实投递或打招呼内容。",
          priority: "high"
        },
        {
          id: "risk_002",
          risk: "HR 回复率难以在短期内验证",
          impact: "无法直接证明产品能提升最终求职结果。",
          mitigation: "先用复制率、修改率、满意度和愿意再次使用作为近端指标。",
          priority: "medium"
        },
        {
          id: "risk_003",
          risk: "简历隐私顾虑影响测试参与",
          impact: "用户可能不愿上传或粘贴真实简历。",
          mitigation: "允许使用脱敏简历片段，并明确不保存原始内容。",
          priority: "high"
        }
      ],
      usages: [
        {
          id: "usage_001",
          usage: "转化为 PRD 问题定义和功能范围",
          description: "把研究确认的核心痛点、用户流程和首版边界写入 PRD。",
          downstreamArtifact: "PRD"
        },
        {
          id: "usage_002",
          usage: "指导原型页面结构",
          description: "根据输入方式、匹配点展示和结果编辑需求设计原型。",
          downstreamArtifact: "prototype"
        },
        {
          id: "usage_003",
          usage: "定义 MVP 首版能力",
          description: "决定是否支持文件上传、匹配解释、多版本生成和复制导出。",
          downstreamArtifact: "MVP_scope"
        },
        {
          id: "usage_004",
          usage: "明确 Agent 能力边界",
          description: "确定 JD 解析、简历亮点提取、匹配理由和内容安全策略。",
          downstreamArtifact: "agent_capability"
        },
        {
          id: "usage_005",
          usage: "形成商业化初判",
          description: "根据付费意愿和使用频率判断免费、按次或订阅策略。",
          downstreamArtifact: "pricing_strategy"
        }
      ],
      confidence: input.userAnswers.length > 0 ? "high" : "medium"
    }
  });
}

function createGenericStep7(input: Step7AgentInput): Step7ResearchPlanResult {
  const context = createResearchContext(input);
  const coreProblem = context.realProblems[0] ?? "核心问题";

  return Step7ResearchPlanResultSchema.parse({
    step: "step7",
    title: "研究计划生成",
    status: input.userAnswers.length > 0 ? "completed" : "needs_more_info",
    researchPlan: {
      title: `${context.coreUsers[0] ?? "核心用户"}产品验证研究计划`,
      summary: `围绕 ${context.coreScenario} 中的 ${coreProblem}，验证用户需求强度、替代方案缺口、MVP 范围和后续 PRD 输入。`,
      context,
      goals: [
        {
          id: "goal_001",
          goal: "验证核心用户是否真实存在该问题",
          reason: "避免基于推断直接进入 PRD。",
          relatedDecision: "是否继续推进 MVP",
          priority: "high"
        },
        {
          id: "goal_002",
          goal: "理解用户当前替代方案和未满足需求",
          reason: "替代方案决定产品差异化。",
          relatedDecision: "差异化定位与 Agent 能力",
          priority: "high"
        },
        {
          id: "goal_003",
          goal: "判断 MVP 首版范围",
          reason: "把研究结论转化为可开发的首版功能边界。",
          relatedDecision: "PRD 与原型设计",
          priority: "high"
        }
      ],
      keyQuestions: [
        {
          id: "rq_001",
          question: "目标用户在该场景中最难完成的动作是什么？",
          category: "pain_validation",
          whyImportant: "用于验证真实问题是否成立。",
          expectedInsight: "找到最值得 MVP 解决的任务切入点。",
          priority: "high"
        },
        {
          id: "rq_002",
          question: "用户现在如何解决同一问题，现有方案哪里不足？",
          category: "alternative_solution",
          whyImportant: "用于判断产品机会和替代风险。",
          expectedInsight: "形成替代方案差异矩阵。",
          priority: "high"
        },
        {
          id: "rq_003",
          question: "用户愿意用什么结果判断产品有效？",
          category: "user_behavior",
          whyImportant: "用于定义 MVP 近端指标。",
          expectedInsight: "明确评估指标和后续埋点。",
          priority: "medium"
        }
      ],
      methods: [
        {
          id: "method_001",
          method: "桌面研究与竞品分析",
          purpose: "梳理替代方案、竞品能力和差异化机会。",
          sampleSize: "5-10 个替代方案",
          executionSteps: ["收集替代方案", "对比工作流", "总结未满足需求"],
          expectedOutput: "竞品与替代方案矩阵",
          priority: "high"
        },
        {
          id: "method_002",
          method: "定性用户访谈",
          purpose: "验证真实问题、使用场景和现有行为。",
          targetParticipants: context.coreUsers.join("、"),
          sampleSize: "8-12 人",
          executionSteps: ["招募目标用户", "访谈当前流程", "验证痛点和替代方案"],
          expectedOutput: "用户痛点证据和画像",
          priority: "high"
        },
        {
          id: "method_003",
          method: "问卷调研",
          purpose: "量化需求频率、痛点强度和使用意愿。",
          sampleSize: "80-150 份",
          executionSteps: ["设计问卷", "分发回收", "按用户类型分析"],
          expectedOutput: "需求强度和用户分层数据",
          priority: "medium"
        },
        {
          id: "method_004",
          method: "快速原型可用性测试",
          purpose: "验证首版流程和结果是否可理解、可使用。",
          sampleSize: "5-8 人",
          executionSteps: ["制作低保真原型", "观察用户完成任务", "记录问题"],
          expectedOutput: "MVP 流程优化建议",
          priority: "medium"
        }
      ],
      timeline: [
        {
          id: "time_001",
          phase: "准备",
          task: "确认研究范围和脚本",
          duration: "1 天",
          owner: "产品经理",
          output: "研究脚本"
        },
        {
          id: "time_002",
          phase: "桌面研究",
          task: "完成替代方案和竞品整理",
          duration: "2 天",
          owner: "产品经理",
          dependency: "研究脚本",
          output: "替代方案矩阵"
        },
        {
          id: "time_003",
          phase: "用户研究",
          task: "访谈并发放问卷",
          duration: "4 天",
          owner: "研究员",
          dependency: "招募目标用户",
          output: "访谈纪要和问卷数据"
        },
        {
          id: "time_004",
          phase: "验证与总结",
          task: "原型测试并形成 MVP 建议",
          duration: "3 天",
          owner: "产品经理 / 设计师",
          dependency: "研究发现",
          output: "研究结论和 PRD 输入"
        }
      ],
      deliverables: [
        {
          id: "deliverable_001",
          deliverable: "研究结论摘要",
          description: "总结用户、场景、问题、替代方案和痛点证据。",
          usedFor: ["PRD", "MVP_scope"]
        },
        {
          id: "deliverable_002",
          deliverable: "MVP 范围建议",
          description: "把研究结论转化为首版功能边界。",
          usedFor: ["prototype", "agent_capability"]
        }
      ],
      risks: [
        {
          id: "risk_001",
          risk: "样本和真实目标用户不匹配",
          impact: "可能导致需求判断偏差。",
          mitigation: "用明确筛选问题招募目标用户。",
          priority: "high"
        }
      ],
      usages: [
        {
          id: "usage_001",
          usage: "支持 PRD 问题定义",
          description: "将验证过的问题和用户证据写入 PRD。",
          downstreamArtifact: "PRD"
        },
        {
          id: "usage_002",
          usage: "确定 MVP 范围",
          description: "明确首版做什么、不做什么。",
          downstreamArtifact: "MVP_scope"
        },
        {
          id: "usage_003",
          usage: "定义 Agent 能力",
          description: "把用户任务拆成需要的 Agent 能力模块。",
          downstreamArtifact: "agent_capability"
        }
      ],
      confidence: input.userAnswers.length > 0 ? "medium" : "low"
    }
  });
}

function createFallbackStep7ResearchPlan(
  input: Step7AgentInput
): Step7ResearchPlanResult {
  return includesAny(input.rawIdea, ["求职者", "岗位 JD", "简历", "HR", "打招呼", "个性化"])
    ? createJobGreetingStep7(input)
    : createGenericStep7(input);
}

async function runStep7ResearchPlanAgent(
  input: Step7AgentInput,
  state: AgentState,
  deps: AgentNodeDeps
): Promise<Step7ResearchPlanResult> {
  const fallback = createFallbackStep7ResearchPlan(input);

  try {
    const model = deps.modelRouter.selectModel({
      nodeName: "step7_research_plan",
      state
    });
    const output = await deps.llmProvider.complete({
      prompt: step7ResearchPlanPrompt.buildPrompt(input),
      nodeName: "step7_research_plan",
      model,
      state,
      traceLogger: deps.traceLogger
    });
    const parsed = extractJsonObject(output);

    return parsed ? Step7ResearchPlanResultSchema.parse(parsed) : fallback;
  } catch {
    return fallback;
  }
}

function toLegacyResearchPlan(
  result: Step7ResearchPlanResult
): DiscoveryResearchPlan {
  return {
    researchGoals: result.researchPlan.goals.map((goal) => goal.goal),
    keyQuestions: result.researchPlan.keyQuestions.map(
      (question) => question.question
    ),
    targetCompetitors: result.researchPlan.context.alternatives,
    researchMethods: result.researchPlan.methods.map((method) => method.method),
    expectedOutputs: result.researchPlan.deliverables.map(
      (deliverable) => deliverable.deliverable
    ),
    nextSteps: result.researchPlan.timeline.map(
      (item) => `${item.phase}：${item.task}`
    )
  };
}

type Step8AgentInput = {
  rawIdea: string;
  targetUsers: TargetUser[];
  step3AnalysisResult: Step3AnalysisResult;
  clarificationQuestions: DiscoveryClarificationQuestion[];
  userAnswers: UserAnswer[];
  revisedDiscoveryProfile: ProductDiscoveryProfile;
  researchPlan: Step7ResearchPlanResult;
};

const isRealSource = (source: SourceItem): boolean =>
  source.sourceType !== "mock_search" &&
  !source.sourceType.includes("untrusted") &&
  !source.url?.startsWith("https://mock.local");

function createLayeredEvidence(input: {
  id: string;
  claim: string;
  evidence: string[];
  sources?: SourceItem[];
  sourceUrl?: string;
  preferredLayer?: LayeredEvidenceItem["layer"];
  confidence: LayeredEvidenceItem["confidence"];
}): LayeredEvidenceItem {
  const realSources = (input.sources ?? []).filter(isRealSource).slice(0, 3);
  const sourceUrls = [
    ...(input.sourceUrl ? [input.sourceUrl] : []),
    ...realSources.flatMap((source) => (source.url ? [source.url] : []))
  ].filter((url, index, items) => items.indexOf(url) === index);
  const hasVerifiedSource = sourceUrls.length > 0;
  const layer =
    input.preferredLayer ??
    (hasVerifiedSource ? "fact" : input.confidence === "low" ? "assumption" : "inference");

  return {
    id: input.id,
    claim: input.claim,
    layer,
    evidence: input.evidence,
    sourceIds: realSources.map((source) => source.id),
    sourceUrls,
    confidence: hasVerifiedSource && input.confidence === "low" ? "medium" : input.confidence,
    validationStatus:
      layer === "fact" && hasVerifiedSource
        ? "verified"
        : layer === "assumption"
          ? "needs_validation"
          : "inferred"
  };
}

function attachStep8EvidenceLayers(
  result: Step8MarketAnalysisResult,
  sources: SourceItem[]
): Step8MarketAnalysisResult {
  const analysis = result.marketAnalysis;
  const evidenceLayers: LayeredEvidenceItem[] = [
    createLayeredEvidence({
      id: "market_industry_background",
      claim: analysis.industryBackground.backgroundSummary,
      evidence: analysis.industryBackground.keyChanges,
      sources,
      confidence: analysis.industryBackground.confidence
    }),
    ...analysis.trends.map((trend) =>
      createLayeredEvidence({
        id: `market_${trend.id}`,
        claim: trend.trend,
        evidence: [trend.description, trend.impactOnProduct],
        sources,
        confidence: trend.confidence
      })
    ),
    ...analysis.opportunities.map((opportunity) =>
      createLayeredEvidence({
        id: `market_${opportunity.id}`,
        claim: opportunity.opportunity,
        evidence: [opportunity.description, opportunity.whyNow],
        sources,
        preferredLayer: "inference",
        confidence: analysis.confidence
      })
    ),
    ...analysis.assumptions.map((assumption) =>
      createLayeredEvidence({
        id: `market_${assumption.id}`,
        claim: assumption.assumption,
        evidence: [assumption.whyImportant, assumption.validationMethod],
        preferredLayer: "assumption",
        confidence: "low"
      })
    )
  ];

  return Step8MarketAnalysisResultSchema.parse({
    ...result,
    marketAnalysis: {
      ...analysis,
      evidenceLayers
    }
  });
}

function attachStep9EvidenceLayers(
  result: Step9CompetitorIdentificationResult,
  sources: SourceItem[]
): Step9CompetitorIdentificationResult {
  const analysis = result.competitorIdentification;
  const competitors = [
    ...analysis.directCompetitors,
    ...analysis.indirectCompetitors,
    ...analysis.substituteSolutions
  ];
  const evidenceLayers = competitors.map((competitor) =>
    createLayeredEvidence({
      id: `competitor_${competitor.id}`,
      claim: `${competitor.name}：${competitor.positioning}`,
      evidence: [
        ...competitor.evidence,
        `分类依据：${competitor.relationReason}`,
        `能力判断：${competitor.coreCapabilities.join("、")}`
      ],
      sources,
      sourceUrl: competitor.sourceUrl,
      preferredLayer:
        competitor.verificationStatus === "verified"
          ? "fact"
          : competitor.verificationStatus === "needs_validation"
            ? "assumption"
            : "inference",
      confidence: competitor.confidence
    })
  );

  return Step9CompetitorIdentificationResultSchema.parse({
    ...result,
    competitorIdentification: {
      ...analysis,
      evidenceLayers
    }
  });
}

function attachStep10EvidenceLayers(
  result: Step10CompetitorAnalysisTableResult,
  sources: SourceItem[]
): Step10CompetitorAnalysisTableResult {
  const analysis = result.competitorAnalysisTable;
  const evidenceLayers = analysis.rows.map((row) =>
    createLayeredEvidence({
      id: `competitor_table_${row.id}`,
      claim: `${row.name}：${row.positioning}`,
      evidence: [
        ...row.evidence,
        `核心功能：${row.coreFunctions.join("、")}`,
        `差异化机会：${row.differentiationOpportunity}`
      ],
      sources,
      sourceUrl: row.sourceUrl,
      preferredLayer:
        row.verificationStatus === "verified"
          ? "fact"
          : row.verificationStatus === "needs_validation"
            ? "assumption"
            : "inference",
      confidence: row.confidence
    })
  );

  return Step10CompetitorAnalysisTableResultSchema.parse({
    ...result,
    competitorAnalysisTable: {
      ...analysis,
      evidenceLayers
    }
  });
}

function attachSupplementalSourcesToProfile(
  profile: ProductDiscoveryProfile,
  sources: SourceItem[],
  round: number
): ProductDiscoveryProfile {
  if (!profile.step8MarketAnalysis || sources.length === 0) {
    return profile;
  }

  const supplementalLayers: LayeredEvidenceItem[] = sources.slice(0, 6).map(
    (source, index) => ({
      id: `supplemental_round_${round}_source_${index + 1}`,
      claim: `补充研究来源：${source.title}`,
      layer: "inference",
      evidence: [source.summary],
      sourceIds: [source.id],
      sourceUrls: source.url ? [source.url] : [],
      confidence: source.relevanceScore >= 0.75 ? "medium" : "low",
      validationStatus: "inferred"
    })
  );
  const step8MarketAnalysis = Step8MarketAnalysisResultSchema.parse({
    ...profile.step8MarketAnalysis,
    marketAnalysis: {
      ...profile.step8MarketAnalysis.marketAnalysis,
      evidenceLayers: [
        ...(profile.step8MarketAnalysis.marketAnalysis.evidenceLayers ?? []),
        ...supplementalLayers
      ]
    }
  });

  return ProductDiscoveryProfileSchema.parse({
    ...profile,
    step8MarketAnalysis
  });
}

function createJobGreetingStep8(input: Step8AgentInput): Step8MarketAnalysisResult {
  return Step8MarketAnalysisResultSchema.parse({
    step: "step8",
    title: "行业与市场初步分析",
    status: input.researchPlan ? "completed" : "needs_more_info",
    marketAnalysis: {
      summary:
        "该产品处于招聘求职数字化与 AI 内容生成交叉场景，核心机会不是泛化求职助手，而是聚焦 JD、简历和 HR 沟通之间的个性化表达卡点。当前判断仍属于初步市场判断，需要通过 Step7 研究计划验证需求频率、替代方案缺口、隐私顾虑和付费意愿。",
      industryBackground: {
        industry: "招聘与求职服务",
        subMarket: "AI 求职沟通与个性化内容生成",
        backgroundSummary:
          "招聘与求职流程正在持续数字化，AI 辅助工具开始进入简历优化、岗位匹配、求职沟通和面试准备等环节。求职者需要在大量岗位中快速完成差异化表达，HR 端也面临模板化沟通内容过载。",
        keyChanges: [
          "AI 内容生成进入求职辅助场景",
          "求职沟通从模板化话术走向岗位定制表达",
          "JD 与简历匹配分析开始成为求职工具的重要能力",
          "移动端和多渠道求职沟通普及",
          "简历和岗位数据隐私安全受到更多关注"
        ],
        relevanceToProduct:
          "产品核心任务是基于岗位 JD 与简历生成个性化 HR 打招呼内容，正好处于求职沟通效率、个性化表达和隐私信任的交叉点。",
        confidence: "medium"
      },
      targetMarket: {
        primaryUsers: [
          "主动求职者",
          "应届毕业生",
          "职场转型者",
          "高频投递人群",
          "中高端人才"
        ],
        secondaryUsers: ["求职顾问", "简历优化服务提供者", "职业发展内容创作者"],
        bSideCustomers: [
          "招聘服务平台",
          "职业发展平台",
          "猎头公司",
          "求职培训机构",
          "校园就业服务机构"
        ],
        initialMarket: "中国线上招聘市场中的主动投递和即时沟通场景",
        expansionMarket: [
          "海外求职市场",
          "LinkedIn / Indeed 等国际求职场景",
          "多语言职业沟通",
          "猎头与职业顾问工作流"
        ],
        marketReason:
          "C 端用户有直接使用场景，B 端平台和机构可能将该能力作为求职服务、转化或增值模块接入。",
        confidence: "medium"
      },
      trends: [
        {
          id: "trend_001",
          trend: "AI 内容生成渗透求职沟通场景",
          description:
            "求职者开始使用通用 AI 辅助写简历、邮件、打招呼内容和面试回答。",
          impactOnProduct:
            "降低用户接受 AI 生成求职内容的门槛，但也要求产品做出比通用 AI 更稳定的垂直流程。",
          opportunityLevel: "high",
          confidence: "medium"
        },
        {
          id: "trend_002",
          trend: "求职表达从模板化走向个性化",
          description:
            "大量候选人使用相似模板，差异化表达和岗位匹配度成为提升注意力的重要因素。",
          impactOnProduct:
            "支持 JD + 简历匹配和个性化生成可以成为产品差异化核心。",
          opportunityLevel: "high",
          confidence: "medium"
        },
        {
          id: "trend_003",
          trend: "JD 与简历匹配分析自动化",
          description:
            "求职辅助工具正在从单纯文本润色扩展到岗位要求与候选人经历的匹配判断。",
          impactOnProduct:
            "产品不应只生成文案，还应展示匹配点、依据和可编辑结果。",
          opportunityLevel: "high",
          confidence: "medium"
        },
        {
          id: "trend_004",
          trend: "隐私安全和数据合规关注上升",
          description:
            "简历包含手机号、邮箱、教育和工作经历等敏感信息，用户对上传和保存策略敏感。",
          impactOnProduct:
            "首版需要明确不保存或可删除策略，并把隐私设计作为信任基础。",
          opportunityLevel: "medium",
          confidence: "medium"
        }
      ],
      userDemands: [
        {
          id: "demand_001",
          demand: "快速生成针对岗位定制的 HR 打招呼内容",
          type: "core",
          description:
            "用户需要根据不同岗位快速生成不模板化、可直接复制或编辑的沟通内容。",
          source: "real_problem",
          productImplication: "首版必须支持 JD + 简历输入和个性化文案生成。",
          priority: "high"
        },
        {
          id: "demand_002",
          demand: "自动提取 JD 重点和简历亮点",
          type: "core",
          description:
            "用户不只是需要写作，还需要知道哪些岗位要求和个人经历应该被突出。",
          source: "real_problem",
          productImplication: "需要匹配点提取、依据展示和高亮能力。",
          priority: "high"
        },
        {
          id: "demand_003",
          demand: "生成自然、差异化、低 AI 感的表达",
          type: "core",
          description:
            "用户担心模板化、雷同和过度 AI 感影响 HR 感知。",
          source: "alternative_solution",
          productImplication: "需要风格控制、多版本生成和反模板化约束。",
          priority: "high"
        },
        {
          id: "demand_004",
          demand: "简单输入和隐私安全",
          type: "secondary",
          description:
            "用户希望粘贴或上传 JD / 简历，同时明确数据不被滥用。",
          source: "user_answer",
          productImplication: "需要清晰输入流程、脱敏提示和数据保存策略。",
          priority: "high"
        },
        {
          id: "demand_005",
          demand: "适配不同渠道、语气和长度",
          type: "latent",
          description:
            "不同招聘平台和沟通渠道对内容长度、语气和格式有差异。",
          source: "research_plan",
          productImplication: "后续可扩展为多场景变体和渠道模板。",
          priority: "medium"
        }
      ],
      opportunities: [
        {
          id: "opportunity_001",
          opportunity: "聚焦求职沟通环节的 AI 微工具",
          description:
            "避开泛化求职助手，先解决主动联系 HR 前的高频表达卡点。",
          whyNow:
            "通用 AI 已教育用户，但垂直流程、匹配依据和隐私处理仍有空间。",
          targetSegment: "主动投递岗位的求职者",
          productDirection: "JD + 简历输入、匹配点解释、个性化打招呼生成",
          businessPotential: "medium",
          validationNeeded: ["使用频率", "复制率", "用户满意度", "付费意愿"],
          priority: "high"
        },
        {
          id: "opportunity_002",
          opportunity: "招聘平台或职业服务平台的增值能力",
          description:
            "将个性化打招呼生成作为平台内提升求职沟通效率的能力模块。",
          whyNow:
            "平台已有沟通入口，但默认话术通常个性化不足。",
          targetSegment: "招聘平台、求职培训机构、职业发展平台",
          productDirection: "API / 插件 / 平台内能力模块",
          businessPotential: "medium",
          validationNeeded: ["平台合作意愿", "集成成本", "合规要求"],
          priority: "medium"
        },
        {
          id: "opportunity_003",
          opportunity: "从打招呼扩展到完整求职沟通助手",
          description:
            "在验证单点价值后，可扩展到简历优化、岗位匹配、投递跟进和多语言职业沟通。",
          whyNow:
            "用户求职链路中多个环节都存在文本生成和匹配判断需求。",
          targetSegment: "高频求职者、中高端人才、海外求职人群",
          productDirection: "求职沟通 Copilot",
          businessPotential: "medium",
          validationNeeded: ["单点留存", "扩展功能需求", "多语言场景需求"],
          priority: "medium"
        }
      ],
      assumptions: [
        {
          id: "assumption_001",
          assumption: "求职者愿意上传或粘贴简历与 JD 来换取更高质量的打招呼内容",
          whyImportant: "如果用户不愿提供输入，产品核心生成质量会受限。",
          validationMethod: "用户访谈、原型测试、输入方式 A/B 测试",
          riskIfWrong: "产品只能退化为通用模板生成，差异化下降。",
          priority: "high"
        },
        {
          id: "assumption_002",
          assumption: "个性化打招呼内容能提升用户感知价值或 HR 回复可能性",
          whyImportant: "这是产品从工具转化为高价值求职辅助的关键。",
          validationMethod: "原型测试、内容偏好评分、后续真实投递跟踪",
          riskIfWrong: "用户可能只把产品当作低付费意愿的文本小工具。",
          priority: "high"
        },
        {
          id: "assumption_003",
          assumption: "B 端平台或机构愿意接入该能力作为求职服务增值模块",
          whyImportant: "影响后续商业化和分发路径。",
          validationMethod: "专家访谈、平台需求访谈、合作方访谈",
          riskIfWrong: "产品需要更依赖 C 端获客和付费转化。",
          priority: "medium"
        }
      ],
      confidence: "medium"
    }
  });
}

function createGenericStep8(input: Step8AgentInput): Step8MarketAnalysisResult {
  const context = input.researchPlan.researchPlan.context;
  const coreProblem =
    input.step3AnalysisResult.realProblems[0]?.title ?? "核心问题";

  return Step8MarketAnalysisResultSchema.parse({
    step: "step8",
    title: "行业与市场初步分析",
    status: input.researchPlan ? "completed" : "needs_more_info",
    marketAnalysis: {
      summary: `该产品处于 ${context.coreScenario} 相关的垂直效率工具场景，初步机会来自目标用户对 ${coreProblem} 的解决需求。当前不输出市场规模数字，需要通过研究计划进一步验证用户频率、替代方案缺口和商业化可能性。`,
      industryBackground: {
        industry: "垂直 AI 工具与效率软件",
        subMarket: context.coreScenario,
        backgroundSummary:
          "AI 正在进入越来越多具体任务场景，用户希望从通用对话转向更贴合任务流程的结构化工具。",
        keyChanges: [
          "通用 AI 降低用户对智能工具的接受门槛",
          "垂直场景更强调输入结构、输出质量和可解释性",
          "用户对数据处理和结果可信度提出更高要求"
        ],
        relevanceToProduct:
          "产品需要证明自己比手工流程或通用 AI 更贴合目标用户的关键任务。",
        confidence: "low"
      },
      targetMarket: {
        primaryUsers: context.coreUsers,
        secondaryUsers: ["协作用户", "相关业务支持者"],
        bSideCustomers: ["垂直服务平台", "咨询或培训机构", "企业内部效率团队"],
        initialMarket: "先聚焦最明确、最高频的细分用户场景",
        expansionMarket: ["相邻任务场景", "团队协作场景", "行业平台集成"],
        marketReason:
          "当前目标市场仍需通过用户研究和替代方案分析验证，不宜过早扩大范围。",
        confidence: "low"
      },
      trends: [
        {
          id: "trend_001",
          trend: "从通用 AI 到垂直 Agent 工作流",
          description:
            "用户逐渐需要更稳定、可复用、可追踪的任务型 AI 工具。",
          impactOnProduct:
            "产品机会在于把目标用户的具体任务固化为结构化流程。",
          opportunityLevel: "medium",
          confidence: "medium"
        }
      ],
      userDemands: context.realProblems.map((problem, index) => ({
        id: `demand_${String(index + 1).padStart(3, "0")}`,
        demand: problem,
        type: index === 0 ? "core" : "secondary",
        description: `该需求来自前置真实问题：${problem}`,
        source: "real_problem",
        productImplication: "需要在 MVP 中验证是否值得转化为核心功能。",
        priority: index === 0 ? "high" : "medium"
      })),
      opportunities: [
        {
          id: "opportunity_001",
          opportunity: "聚焦单一高频任务的 AI 微工具",
          description: "先在明确场景中证明效率和质量价值。",
          whyNow: "通用 AI 已教育市场，但垂直工作流仍有机会。",
          targetSegment: context.coreUsers.join("、"),
          productDirection: "结构化输入、可解释输出、可追踪结果",
          businessPotential: "medium",
          validationNeeded: ["使用频率", "替代方案成本", "付费意愿"],
          priority: "high"
        }
      ],
      assumptions: [
        {
          id: "assumption_001",
          assumption: "目标用户存在足够高频且强烈的场景需求",
          whyImportant: "决定产品是否值得进入 MVP。",
          validationMethod: "用户访谈和问卷调研",
          riskIfWrong: "产品可能缺少真实使用频率。",
          priority: "high"
        }
      ],
      confidence: "low"
    }
  });
}

function createFallbackStep8MarketAnalysis(
  input: Step8AgentInput
): Step8MarketAnalysisResult {
  return includesAny(input.rawIdea, [
    "求职者",
    "岗位 JD",
    "简历",
    "HR",
    "打招呼",
    "个性化"
  ])
    ? createJobGreetingStep8(input)
    : createGenericStep8(input);
}

async function runStep8MarketAnalysisAgent(
  input: Step8AgentInput,
  state: AgentState,
  deps: AgentNodeDeps
): Promise<Step8MarketAnalysisResult> {
  const fallback = createFallbackStep8MarketAnalysis(input);

  try {
    const model = deps.modelRouter.selectModel({
      nodeName: "step8_market_analysis",
      state
    });
    const output = await deps.llmProvider.complete({
      prompt: step8MarketAnalysisPrompt.buildPrompt(input),
      nodeName: "step8_market_analysis",
      model,
      state,
      traceLogger: deps.traceLogger
    });
    const parsed = extractJsonObject(output);

    const result = parsed ? Step8MarketAnalysisResultSchema.parse(parsed) : fallback;
    return attachStep8EvidenceLayers(result, state.sources);
  } catch {
    return attachStep8EvidenceLayers(fallback, state.sources);
  }
}

type Step9AgentInput = {
  rawIdea: string;
  targetUsers: TargetUser[];
  step3AnalysisResult: Step3AnalysisResult;
  revisedDiscoveryProfile: ProductDiscoveryProfile;
  researchPlan: Step7ResearchPlanResult;
  marketAnalysis: Step8MarketAnalysisResult;
};

function createJobGreetingStep9(
  input: Step9AgentInput
): Step9CompetitorIdentificationResult {
  return Step9CompetitorIdentificationResultSchema.parse({
    step: "step9",
    title: "竞品识别与分析",
    status: "completed",
    competitorIdentification: {
      summary:
        `围绕“${input.rawIdea}”，直接竞争主要来自基于简历和岗位信息生成求职内容的 AI 工具；间接竞争来自通用大模型与招聘平台内置沟通能力；最常见替代方案仍是手写模板、人工修改和求职服务。当前结论用于缩小后续研究范围，不代表完整竞品报告。`,
      directCompetitors: [
        {
          id: "direct_jobscan",
          name: "Jobscan Cover Letter Generator",
          relation: "direct_competitor",
          positioning: "基于简历与岗位信息生成定制求职信的 AI 求职工具。",
          targetUsers: ["需要针对具体岗位准备申请材料的求职者"],
          coreCapabilities: ["读取岗位信息", "结合简历生成求职内容", "岗位匹配辅助"],
          strengths: ["求职垂直场景明确", "输入与岗位申请任务紧密关联"],
          weaknesses: ["重点偏英文求职信", "中文招聘 IM 打招呼场景仍需验证"],
          relationReason:
            "目标用户与输入材料高度重合，都围绕岗位 JD、个人经历和个性化求职沟通内容。",
          differenceFromProduct:
            "目标产品更聚焦短消息式 HR 打招呼、多渠道输出和中文招聘沟通。",
          evidence: [
            "官方产品页面明确提供 AI Cover Letter Generator",
            "核心任务使用岗位与求职者信息生成个性化申请内容"
          ],
          sourceUrl: "https://www.jobscan.co/cover-letter-generator",
          confidence: "high",
          verificationStatus: "verified"
        },
        {
          id: "direct_teal",
          name: "Teal AI Cover Letter Generator",
          relation: "direct_competitor",
          positioning: "面向求职者的 AI 求职信与求职管理工具。",
          targetUsers: ["主动投递岗位的求职者", "需要管理多岗位申请的人群"],
          coreCapabilities: ["生成定制求职信", "结合岗位描述", "求职申请管理"],
          strengths: ["与求职工作流结合", "覆盖多岗位申请场景"],
          weaknesses: ["产品范围较宽", "是否适配中文短消息沟通需要验证"],
          relationReason:
            "同样基于岗位描述和个人经历生成个性化求职沟通内容。",
          differenceFromProduct:
            "目标产品可将单次短消息生成与本地招聘平台沟通习惯作为核心切入点。",
          evidence: [
            "官方产品页面提供 AI Cover Letter Generator",
            "产品定位包含求职申请管理与岗位定制内容"
          ],
          sourceUrl: "https://www.tealhq.com/tools/cover-letter-generator",
          confidence: "high",
          verificationStatus: "verified"
        },
        {
          id: "direct_kickresume",
          name: "Kickresume AI Cover Letter Writer",
          relation: "direct_competitor",
          positioning: "为求职者生成简历和求职信内容的 AI 工具。",
          targetUsers: ["需要快速准备求职材料的求职者"],
          coreCapabilities: ["AI 求职信生成", "简历内容生成", "模板化输出"],
          strengths: ["求职内容生成链路成熟", "模板与内容编辑能力较完整"],
          weaknesses: ["更偏正式申请材料", "短消息个性化和中文渠道适配较弱"],
          relationReason:
            "解决个性化求职表达任务，但主要输出形态是正式求职信。",
          differenceFromProduct:
            "目标产品聚焦高频、短文本、即时沟通，而非完整求职信。",
          evidence: [
            "官方产品页面明确提供 AI Cover Letter Writer",
            "产品同时覆盖简历与求职信生成"
          ],
          sourceUrl: "https://www.kickresume.com/en/ai-cover-letter-writer/",
          confidence: "high",
          verificationStatus: "verified"
        }
      ],
      indirectCompetitors: [
        {
          id: "indirect_general_llm",
          name: "ChatGPT、豆包等通用大模型",
          relation: "indirect_competitor",
          positioning: "通过用户自行组织 Prompt 生成任意求职沟通内容。",
          targetUsers: ["愿意自行整理材料和编写 Prompt 的求职者"],
          coreCapabilities: ["自由文本生成", "多轮修改", "风格调整"],
          strengths: ["灵活", "覆盖多种语言和表达场景"],
          weaknesses: ["依赖用户 Prompt 能力", "缺少固定求职工作流与质量标准"],
          relationReason:
            "可以完成相同内容生成任务，但不是为岗位匹配与 HR 沟通专门设计。",
          differenceFromProduct:
            "目标产品应降低输入整理成本，并提供稳定的岗位匹配与表达质量控制。",
          evidence: ["通用大模型能够根据用户提供的 JD 与简历生成沟通文本"],
          sourceUrl: "https://chatgpt.com/",
          confidence: "high",
          verificationStatus: "verified"
        },
        {
          id: "indirect_recruitment_platform",
          name: "招聘平台站内打招呼话术",
          relation: "indirect_competitor",
          positioning: "招聘平台内置的快捷沟通和预设话术能力。",
          targetUsers: ["在招聘平台主动联系招聘者的求职者"],
          coreCapabilities: ["站内即时沟通", "快捷话术", "职位上下文"],
          strengths: ["使用路径短", "与招聘沟通场景直接集成"],
          weaknesses: ["内容可能模板化", "深度结合个人简历的程度需要验证"],
          relationReason:
            "覆盖相同沟通时刻，但通常不是独立的深度个性化生成产品。",
          differenceFromProduct:
            "目标产品可跨平台生成，并以简历与岗位的结构化匹配作为差异。",
          evidence: ["招聘平台普遍提供站内求职沟通入口和快捷表达能力"],
          confidence: "medium",
          verificationStatus: "needs_validation"
        }
      ],
      substituteSolutions: [
        {
          id: "substitute_template",
          name: "自拟或套用打招呼模板",
          relation: "substitute_solution",
          positioning: "用户从社交媒体、论坛或历史文本中复制并修改话术。",
          targetUsers: ["希望低成本快速联系 HR 的求职者"],
          coreCapabilities: ["复制模板", "手动替换岗位关键词"],
          strengths: ["成本低", "无需学习新工具"],
          weaknesses: ["模板化明显", "质量依赖个人表达能力", "批量修改耗时"],
          relationReason: "这是用户当前最容易采用的现实替代方法。",
          differenceFromProduct: "目标产品应证明自动个性化比手工改模板更快且更可信。",
          evidence: ["前置替代方案分析与产品方向均指向模板和手动编辑"],
          confidence: "high",
          verificationStatus: "inferred"
        },
        {
          id: "substitute_human_help",
          name: "朋友、导师或求职顾问人工修改",
          relation: "substitute_solution",
          positioning: "由有经验的人提供个性化表达建议和润色。",
          targetUsers: ["重视沟通质量或缺少求职经验的人群"],
          coreCapabilities: ["人工判断", "个性化修改", "行业语境建议"],
          strengths: ["个性化强", "能结合复杂背景"],
          weaknesses: ["成本和时间较高", "难以高频批量处理"],
          relationReason: "人工服务解决的是同一表达质量问题。",
          differenceFromProduct: "目标产品需要在效率与可接受质量之间建立优势。",
          evidence: ["求职沟通内容常通过朋友、导师或顾问获得修改建议"],
          confidence: "medium",
          verificationStatus: "inferred"
        }
      ],
      differentiationOpportunities: [
        {
          id: "diff_chinese_short_message",
          opportunity: "中文招聘短消息深度适配",
          competitorGap: "多数直接竞品偏英文正式求职信，间接方案又过于通用或模板化。",
          productDirection: "围绕中文招聘 IM、微信等短消息场景生成自然开场内容。",
          targetUserValue: "减少手动改写时间，同时降低模板感。",
          validationNeeded: ["用户是否高频主动联系 HR", "HR 是否更愿意回复个性化短消息"],
          priority: "high"
        },
        {
          id: "diff_match_explanation",
          opportunity: "岗位与简历匹配依据可解释",
          competitorGap: "通用生成工具常只给文本，不解释为何这样表达。",
          productDirection: "展示从 JD 和简历提取的匹配点，并允许用户控制采用内容。",
          targetUserValue: "增强内容可信度和可控性。",
          validationNeeded: ["用户是否需要查看匹配依据", "可解释性是否提升采用率"],
          priority: "high"
        },
        {
          id: "diff_multi_channel",
          opportunity: "一份匹配结果生成多渠道版本",
          competitorGap: "正式求职信、平台话术和通用大模型通常只覆盖单一输出。",
          productDirection: "生成招聘平台、邮件、微信等不同长度和语气版本。",
          targetUserValue: "减少跨渠道重复编辑。",
          validationNeeded: ["目标用户实际使用的渠道组合", "不同渠道内容差异是否足够明显"],
          priority: "medium"
        }
      ],
      researchGaps: [
        "需要验证国内招聘平台是否已经提供基于简历和 JD 的深度个性化话术。",
        "需要验证目标用户使用正式求职信工具与短消息工具的场景差异。",
        "需要通过真实用户访谈确认手动模板是否仍是最强替代方案。"
      ],
      confidence: "medium"
    }
  });
}

function createGenericStep9(
  input: Step9AgentInput
): Step9CompetitorIdentificationResult {
  const context = input.researchPlan.researchPlan.context;
  const alternatives = input.step3AnalysisResult.alternativeSolutions;

  return Step9CompetitorIdentificationResultSchema.parse({
    step: "step9",
    title: "竞品识别与分析",
    status: "needs_more_info",
    competitorIdentification: {
      summary:
        "当前可以根据产品方向识别竞品类别和现实替代方案，但缺少经过检索验证的具体产品证据。建议先将竞品池作为研究假设，再通过官网、产品体验和用户访谈确认。",
      directCompetitors: [
        {
          id: "direct_category_001",
          name: `${context.coreScenario}垂直工具`,
          relation: "direct_competitor",
          positioning: `面向 ${context.coreUsers.join("、")} 解决 ${context.coreScenario} 中核心任务的专用工具。`,
          targetUsers: context.coreUsers,
          coreCapabilities: ["围绕核心任务提供专用工作流"],
          strengths: ["场景聚焦", "用户学习成本可能较低"],
          weaknesses: ["具体产品能力和覆盖范围待检索验证"],
          relationReason: "与当前产品服务相近用户并解决同一核心任务。",
          differenceFromProduct: "需要通过真实产品体验确认差异。",
          evidence: ["来自 Step8 目标市场和产品方向推断"],
          confidence: "low",
          verificationStatus: "needs_validation"
        }
      ],
      indirectCompetitors: [
        {
          id: "indirect_general_tool",
          name: "通用 AI 与通用效率工具",
          relation: "indirect_competitor",
          positioning: "通过灵活配置或 Prompt 覆盖部分核心任务。",
          targetUsers: context.coreUsers,
          coreCapabilities: ["通用内容生成", "多轮修改", "自由配置"],
          strengths: ["灵活", "用户可能已经在使用"],
          weaknesses: ["缺少垂直工作流与稳定输出标准"],
          relationReason: "可以完成部分相同任务，但并非针对该场景设计。",
          differenceFromProduct: "当前产品方向需要证明专用工作流带来的效率与质量优势。",
          evidence: ["来自前置替代方案与市场需求推断"],
          confidence: "medium",
          verificationStatus: "inferred"
        }
      ],
      substituteSolutions: alternatives.slice(0, 4).map((alternative, index) => ({
        id: `substitute_${String(index + 1).padStart(3, "0")}`,
        name: alternative.name,
        relation: "substitute_solution" as const,
        positioning: alternative.description,
        targetUsers: context.coreUsers,
        coreCapabilities: [alternative.howItSolves],
        strengths: ["用户当前已经可以采用该方法完成部分任务"],
        weaknesses: [alternative.weakness],
        relationReason: "用户当前已经可以使用该方法完成部分任务。",
        differenceFromProduct: alternative.opportunity,
        evidence: alternative.evidence,
        confidence: alternative.confidence,
        verificationStatus: "inferred" as const
      })),
      differentiationOpportunities: input.marketAnalysis.marketAnalysis.opportunities
        .slice(0, 3)
        .map((opportunity, index) => ({
          id: `diff_${String(index + 1).padStart(3, "0")}`,
          opportunity: opportunity.opportunity,
          competitorGap: opportunity.description,
          productDirection: opportunity.productDirection,
          targetUserValue: opportunity.whyNow,
          validationNeeded: opportunity.validationNeeded,
          priority: opportunity.priority
        })),
      researchGaps: [
        "需要通过搜索和官网验证具体直接竞品。",
        "需要体验核心竞品并记录真实功能、工作流和限制。",
        "需要访谈用户确认最常使用的替代方案。"
      ],
      confidence: "low"
    }
  });
}

function createFallbackStep9CompetitorIdentification(
  input: Step9AgentInput
): Step9CompetitorIdentificationResult {
  return includesAny(input.rawIdea, [
    "求职者",
    "岗位 JD",
    "简历",
    "HR",
    "打招呼",
    "个性化"
  ])
    ? createJobGreetingStep9(input)
    : createGenericStep9(input);
}

async function runStep9CompetitorIdentificationAgent(
  input: Step9AgentInput,
  state: AgentState,
  deps: AgentNodeDeps
): Promise<Step9CompetitorIdentificationResult> {
  const fallback = createFallbackStep9CompetitorIdentification(input);

  try {
    const model = deps.modelRouter.selectModel({
      nodeName: "step9_competitor_identification",
      state
    });
    const output = await deps.llmProvider.complete({
      prompt: step9CompetitorIdentificationPrompt.buildPrompt(input),
      nodeName: "step9_competitor_identification",
      model,
      state,
      traceLogger: deps.traceLogger
    });
    const parsed = extractJsonObject(output);

    const result = parsed
      ? Step9CompetitorIdentificationResultSchema.parse(parsed)
      : fallback;
    return attachStep9EvidenceLayers(result, state.sources);
  } catch {
    return attachStep9EvidenceLayers(fallback, state.sources);
  }
}

type Step10AgentInput = {
  rawIdea: string;
  marketAnalysis: Step8MarketAnalysisResult;
  competitorIdentification: Step9CompetitorIdentificationResult;
};

function getCompetitorTableDetails(name: string): {
  channels: string[];
  languages: string[];
  personalizationCapability: "high" | "medium" | "low" | "unknown";
  personalizationDescription: string;
  typicalScenarios: string[];
} {
  if (name.includes("Jobscan") || name.includes("Teal") || name.includes("Kickresume")) {
    return {
      channels: ["Web", "Email 求职材料"],
      languages: ["英文"],
      personalizationCapability: "high",
      personalizationDescription: "支持结合岗位描述和个人经历生成定制求职内容。",
      typicalScenarios: ["海外岗位申请", "正式求职信准备"]
    };
  }

  if (name.includes("ChatGPT") || name.includes("豆包")) {
    return {
      channels: ["Web", "App", "全渠道复制使用"],
      languages: ["多语言"],
      personalizationCapability: "high",
      personalizationDescription: "用户可自由提供 JD、简历和风格要求，但依赖 Prompt 与人工判断。",
      typicalScenarios: ["有 AI 使用经验的求职者自行生成和修改内容"]
    };
  }

  if (name.includes("招聘平台")) {
    return {
      channels: ["招聘平台站内 IM"],
      languages: ["中文"],
      personalizationCapability: "low",
      personalizationDescription: "通常以快捷话术或模板为主，深度人岗匹配能力待验证。",
      typicalScenarios: ["普通求职者在招聘平台快速发起沟通"]
    };
  }

  if (name.includes("模板")) {
    return {
      channels: ["全渠道"],
      languages: ["中文", "英文"],
      personalizationCapability: "medium",
      personalizationDescription: "个性化程度取决于用户手动改写能力。",
      typicalScenarios: ["低成本快速投递", "传统求职沟通"]
    };
  }

  if (name.includes("导师") || name.includes("顾问") || name.includes("朋友")) {
    return {
      channels: ["全渠道"],
      languages: ["中文", "英文"],
      personalizationCapability: "high",
      personalizationDescription: "人工能够结合用户背景和岗位语境深度修改，但难以批量处理。",
      typicalScenarios: ["高价值岗位", "缺少求职经验的人群"]
    };
  }

  return {
    channels: [],
    languages: [],
    personalizationCapability: "unknown",
    personalizationDescription: "当前证据不足，需要通过产品体验或官网资料验证。",
    typicalScenarios: []
  };
}

function createFallbackStep10CompetitorAnalysisTable(
  input: Step10AgentInput
): Step10CompetitorAnalysisTableResult {
  const identification = input.competitorIdentification.competitorIdentification;
  const competitors = [
    ...identification.directCompetitors,
    ...identification.indirectCompetitors,
    ...identification.substituteSolutions
  ];

  return Step10CompetitorAnalysisTableResultSchema.parse({
    step: "step10",
    title: "竞品分析表",
    status: competitors.length > 0 ? "completed" : "needs_more_info",
    competitorAnalysisTable: {
      summary:
        "该表将已识别竞品按定位、用户、功能、渠道、语言、个性化能力和差异化机会横向比较。未经验证的信息保留为待验证状态，避免把推断当作事实。",
      rows: competitors.map((competitor) => {
        const details = getCompetitorTableDetails(competitor.name);

        return {
          id: `table_${competitor.id}`,
          name: competitor.name,
          relation: competitor.relation,
          positioning: competitor.positioning,
          targetUsers: competitor.targetUsers,
          coreFunctions: competitor.coreCapabilities,
          channels: details.channels,
          languages: details.languages,
          personalizationCapability: details.personalizationCapability,
          personalizationDescription: details.personalizationDescription,
          strengths: competitor.strengths,
          weaknesses: competitor.weaknesses,
          differentiationOpportunity: competitor.differenceFromProduct,
          typicalScenarios: details.typicalScenarios,
          evidence: competitor.evidence,
          ...(competitor.sourceUrl ? { sourceUrl: competitor.sourceUrl } : {}),
          confidence: competitor.confidence,
          verificationStatus: competitor.verificationStatus
        };
      }),
      keyFindings: [
        "直接竞品更擅长正式求职材料和英文市场，中文招聘短消息仍存在差异化空间。",
        "通用大模型个性化能力强，但用户需要自行整理输入、设计 Prompt 和判断质量。",
        "模板和人工修改仍是重要替代方案，产品必须证明效率、质量或规模化优势。"
      ],
      recommendedFocus: identification.differentiationOpportunities.map(
        (opportunity) => opportunity.productDirection
      ),
      researchGaps: identification.researchGaps,
      confidence: identification.confidence
    }
  });
}

async function runStep10CompetitorAnalysisTableAgent(
  input: Step10AgentInput,
  state: AgentState,
  deps: AgentNodeDeps
): Promise<Step10CompetitorAnalysisTableResult> {
  const fallback = createFallbackStep10CompetitorAnalysisTable(input);

  try {
    const model = deps.modelRouter.selectModel({
      nodeName: "step10_competitor_analysis_table",
      state
    });
    const output = await deps.llmProvider.complete({
      prompt: step10CompetitorAnalysisTablePrompt.buildPrompt(input),
      nodeName: "step10_competitor_analysis_table",
      model,
      state,
      traceLogger: deps.traceLogger
    });
    const parsed = extractJsonObject(output);

    const result = parsed
      ? Step10CompetitorAnalysisTableResultSchema.parse(parsed)
      : fallback;
    return attachStep10EvidenceLayers(result, state.sources);
  } catch {
    return attachStep10EvidenceLayers(fallback, state.sources);
  }
}

type Step11AgentInput = {
  rawIdea: string;
  targetUsers: TargetUser[];
  step3AnalysisResult: Step3AnalysisResult;
  clarificationQuestions: DiscoveryClarificationQuestion[];
  userAnswers: UserAnswer[];
  revisedDiscoveryProfile: ProductDiscoveryProfile;
  researchPlan: Step7ResearchPlanResult;
  marketAnalysis: Step8MarketAnalysisResult;
  competitorIdentification: Step9CompetitorIdentificationResult;
  competitorAnalysisTable: Step10CompetitorAnalysisTableResult;
};

function createJobGreetingStep11(input: Step11AgentInput): Step11UserPersonaResult {
  const rawIdeaEvidence = `原始产品方向：${input.rawIdea}`;

  return Step11UserPersonaResultSchema.parse({
    step: "step11",
    title: "用户画像生成",
    status: "completed",
    userPersonas: {
      summary:
        "该产品的 MVP 核心用户应优先围绕主动投递岗位且需要高频生成个性化沟通内容的求职者展开，画像重点不是年龄标签，而是求职阶段、沟通渠道、表达压力和人岗匹配难度。",
      personas: [
        {
          id: "persona_graduate_wang",
          name: "应届毕业生小王",
          segment: "首次正式求职的应届生",
          role: "21-25 岁，本科或硕士应届毕业生，实习和项目经历有限。",
          profile:
            "正在参与秋招、春招或实习转正，希望通过主动联系 HR 获得更多面试机会，但缺少成熟的职场表达经验。",
          scenarios: [
            "在 BOSS 直聘、邮箱或微信中主动联系目标岗位 HR。",
            "参加校招双选会或实习转正时，需要快速发送自我介绍和打招呼内容。",
            "批量投递多个岗位，需要针对不同 JD 调整表达重点。"
          ],
          painPoints: [
            "不知道如何用专业且有吸引力的方式表达自己。",
            "担心内容模板化，被 HR 忽略。",
            "高强度投递下，逐个岗位改写内容耗时高且质量不稳定。"
          ],
          goals: [
            "获得岗位定制化的打招呼话术，提高被注意和回复概率。",
            "节省内容准备时间，把精力投入面试准备。",
            "用更专业的第一印象弥补经验不足。"
          ],
          motivations: [
            "降低首次求职沟通压力。",
            "快速获得看起来有准备、有针对性的表达。",
            "希望用 AI 提高求职沟通成功率。"
          ],
          behaviors: [
            "会同时投递多个岗位，频繁复制和修改自我介绍。",
            "容易参考网络模板或向同学朋友寻求修改建议。",
            "对一键生成和可编辑版本接受度较高。"
          ],
          preferredChannels: ["BOSS 直聘", "邮箱", "微信", "校招系统"],
          decisionFactors: ["生成内容是否自然", "是否能结合 JD 与简历", "是否节省时间"],
          evidence: [
            rawIdeaEvidence,
            "目标用户识别中包含求职者和主动投递岗位人群。",
            "场景与问题识别指出核心任务是根据 JD 与简历生成个性化 HR 打招呼内容。",
            "竞品分析表显示模板和平台话术个性化能力较弱。"
          ],
          assumptions: [
            "应届生是否是最强付费人群仍需访谈验证。",
            "不同学校、专业和岗位类型的沟通压力可能存在差异。"
          ],
          confidence: "medium"
        },
        {
          id: "persona_transition_li",
          name: "职场转型人小李",
          segment: "跨行业或跨职能转型求职者",
          role: "28-35 岁，有约 5 年工作经验，准备从销售转市场、传统行业转互联网等。",
          profile:
            "有一定经验但与目标岗位并非完全匹配，需要在短消息里解释转型动机和可迁移能力。",
          scenarios: [
            "针对转型岗位主动联系 HR，说明为什么自己匹配岗位。",
            "通过内推、社交平台、邮件等多渠道寻找机会。",
            "根据不同岗位突出不同经历和能力。"
          ],
          painPoints: [
            "难以简明解释转型理由和岗位匹配点。",
            "担心表达尴尬、跑题或被认为不够对口。",
            "不确定微信、邮件、招聘平台的表达风格如何切换。"
          ],
          goals: [
            "获得具备说服力和逻辑性的个性化开场内容。",
            "突出可迁移技能，争取进入面试环节。",
            "降低转型求职中的心理负担。"
          ],
          motivations: [
            "希望 AI 帮助梳理经历与岗位之间的连接。",
            "希望减少重复改写和表达试错。",
            "希望在弱相关经验下提升沟通可信度。"
          ],
          behaviors: [
            "会反复修改自我介绍，强调不同经历。",
            "可能使用 ChatGPT 等通用 AI，但需要自己设计 Prompt。",
            "对可解释匹配点和多渠道版本更敏感。"
          ],
          preferredChannels: ["微信", "邮件", "LinkedIn", "招聘平台 IM"],
          decisionFactors: ["是否能解释转型逻辑", "是否突出可迁移技能", "表达是否自然可信"],
          evidence: [
            "市场分析显示 AI 求职沟通与个性化内容生成存在机会。",
            "竞品识别中通用大模型可替代但需要用户自行组织 Prompt。",
            "竞品分析表指出多渠道和中文短消息是差异化方向。"
          ],
          assumptions: [
            "转型用户对付费和深度个性化的意愿需要进一步验证。",
            "不同转型跨度对内容生成要求不同。"
          ],
          confidence: "medium"
        },
        {
          id: "persona_senior_zhao",
          name: "资深白领小赵",
          segment: "中高端机会探索者",
          role: "32-45 岁，高级经理或专业骨干，有丰富专业和管理经验。",
          profile:
            "通常不是大规模海投，而是在猎头、LinkedIn、定向邮件等渠道中谨慎联系高价值岗位。",
          scenarios: [
            "主动联系目标企业 HR 或猎头，发送高度个性化自荐内容。",
            "将复杂工作经历压缩成精炼的岗位匹配表达。",
            "维护专业形象，避免被认为是模板化群发。"
          ],
          painPoints: [
            "经历复杂，难以在短时间内提炼与岗位最相关的亮点。",
            "担心模板化表达损害高级职场形象。",
            "需要针对不同高端岗位控制语气和信息密度。"
          ],
          goals: [
            "精准突出核心成就与岗位匹配点。",
            "用简洁表达体现自己值得被进一步沟通。",
            "在猎头或私域沟通中保持专业形象。"
          ],
          motivations: [
            "节省高价值沟通前的准备时间。",
            "降低复杂经历梳理成本。",
            "获得更稳妥、更精炼的表达草稿。"
          ],
          behaviors: [
            "更重视内容质量和语气控制，不会轻易一键发送。",
            "可能愿意为高质量结果付费，但对隐私更敏感。",
            "倾向在正式渠道中使用更克制的表达。"
          ],
          preferredChannels: ["邮箱", "LinkedIn", "猎头私域", "定向邀约"],
          decisionFactors: ["隐私安全", "专业语气", "高级经历提炼能力", "可编辑性"],
          evidence: [
            "目标市场中包含中高端人才和高频投递人群。",
            "竞品分析显示人工修改个性化强但无法批量。",
            "产品差异化机会包括岗位与简历匹配依据可解释。"
          ],
          assumptions: [
            "中高端用户是否需要独立工具而非人工顾问仍需验证。",
            "隐私顾虑可能显著影响使用意愿。"
          ],
          confidence: "low"
        }
      ],
      commonPainPoints: [
        "不知道如何高效、专业、个性化表达自我优势与岗位匹配点。",
        "手工制作内容耗时大，难以批量产出高质量内容。",
        "担心被识别为模板化群发，影响 HR 第一印象。"
      ],
      commonMotivations: [
        "提升求职沟通专业感和被注意概率。",
        "降低写作与沟通心理压力。",
        "利用 AI 快速获得可编辑、高质量的表达草稿。"
      ],
      productImplications: [
        "MVP 应优先支持 JD 与简历双输入，并输出短消息版本。",
        "需要展示匹配依据，帮助用户判断内容是否可信。",
        "应提供不同渠道语气和长度版本，但不要过早扩展成全套求职平台。"
      ],
      researchGaps: [
        "需要验证哪个细分用户的使用频率和付费意愿最高。",
        "需要访谈 HR 对不同打招呼内容的真实接受度。",
        "需要验证隐私顾虑对简历上传和内容生成的影响。"
      ],
      confidence: "medium"
    }
  });
}

function createGenericStep11(input: Step11AgentInput): Step11UserPersonaResult {
  const coreUsers = input.targetUsers
    .filter((user) => user.userType === "core_user")
    .slice(0, 2);
  const fallbackUsers = coreUsers.length > 0 ? coreUsers : input.targetUsers.slice(0, 2);
  const coreProblem =
    input.step3AnalysisResult.realProblems[0]?.title ?? "当前核心问题";

  return Step11UserPersonaResultSchema.parse({
    step: "step11",
    title: "用户画像生成",
    status: fallbackUsers.length > 0 ? "completed" : "needs_more_info",
    userPersonas: {
      summary:
        "当前画像基于目标用户识别、场景问题分析和澄清上下文生成，仍需要通过真实访谈验证。",
      personas: fallbackUsers.map((user, index) => ({
        id: `persona_${String(index + 1).padStart(3, "0")}`,
        name: `${user.name}代表用户`,
        segment: user.name,
        role: user.description,
        profile: user.description,
        scenarios: input.revisedDiscoveryProfile.scenarios.value
          .slice(0, 3)
          .map((scenario) => scenario.name),
        painPoints: input.step3AnalysisResult.realProblems
          .slice(0, 3)
          .map((problem) => problem.description),
        goals: input.revisedDiscoveryProfile.desiredOutcomes.value
          .slice(0, 3)
          .map((outcome) => outcome.description),
        motivations: [
          `希望更高效地解决 ${coreProblem}`,
          "希望降低当前替代方案带来的时间和质量成本"
        ],
        behaviors: ["会尝试低成本替代方案", "需要看到清晰结果后才会持续使用"],
        preferredChannels: ["待验证"],
        decisionFactors: ["结果质量", "使用成本", "是否贴合当前任务"],
        evidence: [
          "来自目标用户识别、场景问题识别和需求澄清上下文。",
          ...user.evidence
        ],
        assumptions: ["画像仍缺少真实访谈样本，需要进一步验证。"],
        confidence: user.confidence
      })),
      commonPainPoints: input.step3AnalysisResult.realProblems
        .slice(0, 3)
        .map((problem) => problem.title),
      commonMotivations: ["提升效率", "降低试错", "获得更稳定的输出质量"],
      productImplications: input.competitorAnalysisTable.competitorAnalysisTable.recommendedFocus,
      researchGaps: ["需要真实用户访谈验证画像准确性。"],
      confidence: "low"
    }
  });
}

function createFallbackStep11UserPersonas(
  input: Step11AgentInput
): Step11UserPersonaResult {
  return includesAny(input.rawIdea, [
    "求职者",
    "岗位 JD",
    "简历",
    "HR",
    "打招呼",
    "个性化"
  ])
    ? createJobGreetingStep11(input)
    : createGenericStep11(input);
}

async function runStep11UserPersonaAgent(
  input: Step11AgentInput,
  state: AgentState,
  deps: AgentNodeDeps
): Promise<Step11UserPersonaResult> {
  const fallback = createFallbackStep11UserPersonas(input);

  try {
    const model = deps.modelRouter.selectModel({
      nodeName: "step11_user_persona_generation",
      state
    });
    const output = await deps.llmProvider.complete({
      prompt: step11UserPersonaPrompt.buildPrompt(input),
      nodeName: "step11_user_persona_generation",
      model,
      state,
      traceLogger: deps.traceLogger
    });
    const parsed = extractJsonObject(output);

    return parsed ? Step11UserPersonaResultSchema.parse(parsed) : fallback;
  } catch {
    return fallback;
  }
}

type Step12AgentInput = Step11AgentInput & {
  userPersonas: Step11UserPersonaResult;
};

function createJobGreetingStep12(input: Step12AgentInput): Step12MvpPrdResult {
  const personaNames = input.userPersonas.userPersonas.personas.map(
    (persona) => persona.name
  );

  return Step12MvpPrdResultSchema.parse({
    step: "step12",
    title: "MVP PRD 生成",
    status: "completed",
    mvpPrd: {
      productName: "智能职位匹配个性化 HR 打招呼生成器（MVP 版）",
      background:
        "在线求职渠道多样化后，求职者需要在微信、邮件、招聘平台 IM 等渠道主动联系 HR。应届生、转型人群和部分资深求职者常遇到不会写、模板感强、无法结合 JD 与简历突出匹配点、批量投递效率低等问题。当前替代方案包括通用大模型、平台预置话术、网络模板和人工润色，但要么需要用户自己组织 Prompt，要么个性化不足，要么难以规模化。因此 MVP 应聚焦 JD 与简历双输入下的个性化打招呼内容生成。",
      goals: [
        "帮助目标用户在 2 分钟内完成 JD + 简历输入、内容生成和复制。",
        "生成内容能体现 JD 中 2-3 个关键要求，并匹配用户简历中的相关经历。",
        "提供至少正式、自然两种表达风格，覆盖招聘平台 IM、微信和邮件等常见沟通场景。",
        "验证目标用户是否认为生成内容比手写或模板更有针对性。"
      ],
      targetUsers: personaNames.length
        ? personaNames
        : ["应届毕业生", "职场转型求职者", "常规主动投递求职者"],
      scenarios: [
        "用户在 BOSS 直聘、微信、邮箱等渠道主动联系目标岗位 HR。",
        "用户参加校招、企业开放日、实习转正等场景，需要快速生成自我介绍。",
        "用户批量投递多个岗位，需要针对不同 JD 快速调整打招呼内容。"
      ],
      featureScope: [
        {
          id: "feature_001",
          name: "岗位 JD 文本输入",
          description: "支持用户粘贴目标岗位 JD，系统提取岗位关键词、能力要求和沟通重点。",
          priority: "must_have",
          rationale: "JD 是个性化匹配的主要依据，缺少 JD 无法体现岗位针对性。"
        },
        {
          id: "feature_002",
          name: "个人简历文本输入",
          description: "支持用户粘贴个人简历或经历文本，系统提取与岗位相关的经验和亮点。",
          priority: "must_have",
          rationale: "简历内容决定生成内容是否能体现用户差异化。"
        },
        {
          id: "feature_003",
          name: "个性化打招呼内容生成",
          description: "基于 JD 和简历自动生成一段可复制的 HR 打招呼内容。",
          priority: "must_have",
          rationale: "这是 MVP 的核心价值交付。"
        },
        {
          id: "feature_004",
          name: "表达风格选择",
          description: "支持正式、自然两种风格，生成不同语气版本。",
          priority: "should_have",
          rationale: "不同渠道和岗位需要不同语气，但不应在 MVP 阶段扩展过多风格。"
        },
        {
          id: "feature_005",
          name: "生成内容复制与手工修改",
          description: "用户可以编辑生成结果并一键复制到目标沟通渠道。",
          priority: "must_have",
          rationale: "MVP 不直接发送到平台，复制和编辑是最低成本闭环。"
        },
        {
          id: "feature_006",
          name: "匹配依据提示",
          description: "展示生成内容引用了哪些 JD 关键词和简历亮点。",
          priority: "could_have",
          rationale: "有助于提升信任感，但可在首版中以轻量方式呈现。"
        }
      ],
      outOfScope: [
        "用户注册、登录和会员体系。",
        "历史记录和多版本管理。",
        "自动投递或自动发送到第三方招聘平台。",
        "完整简历优化、岗位推荐、面试准备和职业规划。",
        "复杂多语言支持和企业招聘侧功能。"
      ],
      userStories: [
        {
          id: "story_001",
          user: "应届毕业生",
          story:
            "作为应届毕业生，我想一键生成适合微信或招聘平台 IM 的岗位定制自我介绍，这样可以更自信地主动联系 HR。",
          value: "降低首次求职沟通压力，提高被 HR 注意的概率。",
          acceptanceCriteria: [
            "用户输入 JD 和简历后可以生成一段 80-180 字的打招呼内容。",
            "生成内容至少包含 2 个岗位关键词和 1 个个人经历亮点。",
            "用户可以复制生成内容。"
          ],
          priority: "high"
        },
        {
          id: "story_002",
          user: "职场转型求职者",
          story:
            "作为转型求职者，我希望生成内容能解释我的转型动机并展示与目标岗位相关的可迁移能力。",
          value: "降低被认为不匹配的风险，争取进入面试沟通。",
          acceptanceCriteria: [
            "生成内容能体现转型理由或岗位关联能力。",
            "当简历与 JD 匹配信息不足时，系统提示用户补充相关经历。",
            "正式和自然风格输出存在明显语气差异。"
          ],
          priority: "high"
        },
        {
          id: "story_003",
          user: "批量投递求职者",
          story:
            "作为需要批量投递岗位的求职者，我希望快速生成不同岗位的专业自荐话术，减少重复编辑时间。",
          value: "提升投递效率，同时避免直接套用模板。",
          acceptanceCriteria: [
            "用户可以在不刷新页面的情况下替换 JD 并重新生成。",
            "生成流程从输入到复制在 2 分钟内完成。",
            "输出内容不会完全复用固定模板句式。"
          ],
          priority: "medium"
        }
      ],
      userFlow: [
        {
          id: "flow_001",
          stepName: "进入生成页",
          userAction: "用户打开产品页面，看到 JD + 简历生成打招呼内容的说明。",
          systemResponse: "系统展示 JD 输入区、简历输入区、风格选择和生成按钮。",
          output: "用户理解当前工具的输入和输出。"
        },
        {
          id: "flow_002",
          stepName: "输入岗位 JD",
          userAction: "用户粘贴目标岗位 JD 文本。",
          systemResponse: "系统接收文本并进行基本为空校验。",
          output: "获得岗位要求输入。"
        },
        {
          id: "flow_003",
          stepName: "输入个人简历",
          userAction: "用户粘贴个人简历或相关经历文本。",
          systemResponse: "系统接收文本并提示不要输入无关敏感信息。",
          output: "获得候选人经历输入。"
        },
        {
          id: "flow_004",
          stepName: "选择表达风格",
          userAction: "用户选择正式或自然风格。",
          systemResponse: "系统记录语气偏好。",
          output: "确定生成风格。"
        },
        {
          id: "flow_005",
          stepName: "生成并编辑",
          userAction: "用户点击生成，查看结果并手工微调。",
          systemResponse: "系统生成打招呼内容，并展示可复制文本。",
          output: "获得可发送的个性化打招呼内容。"
        },
        {
          id: "flow_006",
          stepName: "复制使用",
          userAction: "用户点击复制，并粘贴到目标沟通渠道。",
          systemResponse: "系统提示复制成功。",
          output: "完成一次求职沟通内容准备。"
        }
      ],
      acceptanceCriteria: [
        {
          id: "ac_001",
          criterion: "用户能在 2 分钟内完成 JD + 简历输入、生成、编辑和复制。",
          verificationMethod: "5-8 名目标用户可用性测试计时。",
          priority: "high"
        },
        {
          id: "ac_002",
          criterion: "生成内容能准确提取 JD 中 2-3 个关键要求，并结合至少 1 条简历相关经历。",
          verificationMethod: "人工抽样评审 20 组 JD-简历-输出结果。",
          priority: "high"
        },
        {
          id: "ac_003",
          criterion: "至少 50% 目标用户认为生成内容比自己手写或模板更有针对性。",
          verificationMethod: "用户盲测评分或访谈反馈。",
          priority: "high"
        },
        {
          id: "ac_004",
          criterion: "正式和自然两种风格在语气、长度或表达方式上有可感知差异。",
          verificationMethod: "同一输入生成两种风格并由用户判断差异。",
          priority: "medium"
        },
        {
          id: "ac_005",
          criterion: "主流程在移动端常见屏幕宽度下可完成输入、生成和复制。",
          verificationMethod: "移动端浏览器手动测试。",
          priority: "medium"
        }
      ],
      successMetrics: [
        "核心流程完成率 >= 80%。",
        "从输入到复制的中位耗时 <= 2 分钟。",
        "用户对输出针对性的平均评分 >= 4/5。",
        "生成后用户编辑字符占比低于 30%，作为输出可用性的初步信号。"
      ],
      risks: [
        "简历和 JD 文本质量差可能导致输出泛化。",
        "用户可能担心简历隐私，不愿上传完整材料。",
        "HR 对 AI 生成内容的接受度仍需验证。",
        "如果只做文本生成，可能容易被通用大模型替代。"
      ],
      assumptions: [
        `当前 PRD 基于产品发现上下文生成，原始想法为：${input.rawIdea}`,
        "目标用户愿意在求职前输入 JD 和简历文本。",
        "个性化匹配和可复制输出足以支撑 MVP 初始验证。",
        "微信、招聘平台 IM 和邮件是首批需要覆盖的主要渠道。"
      ],
      confidence: "medium"
    }
  });
}

function createGenericStep12(input: Step12AgentInput): Step12MvpPrdResult {
  const coreUser =
    getCoreUser(input.targetUsers)?.name ??
    input.userPersonas.userPersonas.personas[0]?.segment ??
    "核心用户";
  const coreProblem =
    input.step3AnalysisResult.realProblems[0]?.title ?? "核心问题待进一步明确";
  const primaryScenario =
    input.revisedDiscoveryProfile.scenarios.value[0]?.name ??
    "核心使用场景待进一步明确";

  return Step12MvpPrdResultSchema.parse({
    step: "step12",
    title: "MVP PRD 生成",
    status: "completed",
    mvpPrd: {
      productName: `${input.rawIdea.slice(0, 24)} MVP`,
      background: `当前产品方向已经完成目标用户、场景问题、澄清、研究计划、市场分析、竞品分析和用户画像。MVP 应聚焦 ${coreUser} 在「${primaryScenario}」中遇到的「${coreProblem}」，优先验证是否存在稳定、高频、可感知的产品价值。`,
      goals: [
        "验证核心用户是否愿意使用该工具完成关键任务。",
        "验证 MVP 输出是否优于当前替代方案。",
        "验证核心流程是否足够低门槛。"
      ],
      targetUsers: input.userPersonas.userPersonas.personas.map(
        (persona) => persona.segment
      ),
      scenarios: input.revisedDiscoveryProfile.scenarios.value.map(
        (scenario) => scenario.name
      ),
      featureScope: [
        {
          id: "feature_001",
          name: "核心输入采集",
          description: "采集用户完成当前任务所需的最小输入信息。",
          priority: "must_have",
          rationale: "输入质量决定 MVP 输出质量。"
        },
        {
          id: "feature_002",
          name: "结构化结果生成",
          description: "根据输入生成可直接使用或继续编辑的结构化结果。",
          priority: "must_have",
          rationale: "这是 MVP 的核心价值交付。"
        },
        {
          id: "feature_003",
          name: "结果复制与编辑",
          description: "允许用户修改结果并复制到外部工作流。",
          priority: "must_have",
          rationale: "用最低成本完成使用闭环，避免过早集成第三方平台。"
        }
      ],
      outOfScope: [
        "账号系统和权限体系。",
        "复杂团队协作。",
        "第三方平台深度集成。",
        "长期历史数据分析。"
      ],
      userStories: [
        {
          id: "story_001",
          user: coreUser,
          story: `作为${coreUser}，我想快速完成${primaryScenario}中的关键任务，这样可以减少手动整理和反复试错。`,
          value: "降低任务完成成本，获得更稳定的输出。",
          acceptanceCriteria: [
            "用户能完成关键输入。",
            "系统能返回结构化结果。",
            "用户可以复制或继续编辑结果。"
          ],
          priority: "high"
        }
      ],
      userFlow: [
        {
          id: "flow_001",
          stepName: "输入信息",
          userAction: "用户输入完成任务所需的关键信息。",
          systemResponse: "系统校验输入是否为空或明显不足。",
          output: "形成可用于生成的输入上下文。"
        },
        {
          id: "flow_002",
          stepName: "生成结果",
          userAction: "用户点击生成。",
          systemResponse: "系统输出结构化结果。",
          output: "获得可评估的 MVP 结果。"
        },
        {
          id: "flow_003",
          stepName: "使用结果",
          userAction: "用户编辑、复制或保存结果。",
          systemResponse: "系统提供基础操作反馈。",
          output: "完成一次任务闭环。"
        }
      ],
      acceptanceCriteria: [
        {
          id: "ac_001",
          criterion: "核心用户能独立完成一次主流程。",
          verificationMethod: "可用性测试。",
          priority: "high"
        },
        {
          id: "ac_002",
          criterion: "输出结果至少覆盖用户当前任务所需的主要信息。",
          verificationMethod: "人工评审和用户反馈。",
          priority: "high"
        }
      ],
      successMetrics: [
        "主流程完成率 >= 80%。",
        "用户对结果可用性评分 >= 4/5。",
        "用户愿意继续使用或推荐给同类用户。"
      ],
      risks: input.userPersonas.userPersonas.researchGaps,
      assumptions: [
        "当前 PRD 仍基于产品发现推断，需要用户访谈验证。",
        "MVP 范围需要继续根据真实使用反馈收敛。"
      ],
      confidence: "low"
    }
  });
}

function createFallbackStep12MvpPrd(input: Step12AgentInput): Step12MvpPrdResult {
  return includesAny(input.rawIdea, [
    "求职者",
    "岗位 JD",
    "简历",
    "HR",
    "打招呼",
    "个性化"
  ])
    ? createJobGreetingStep12(input)
    : createGenericStep12(input);
}

async function runStep12MvpPrdAgent(
  input: Step12AgentInput,
  state: AgentState,
  deps: AgentNodeDeps
): Promise<Step12MvpPrdResult> {
  const fallback = createFallbackStep12MvpPrd(input);

  try {
    const model = deps.modelRouter.selectModel({
      nodeName: "step12_mvp_prd_generation",
      state
    });
    const output = await deps.llmProvider.complete({
      prompt: step12MvpPrdPrompt.buildPrompt(input),
      nodeName: "step12_mvp_prd_generation",
      model,
      state,
      traceLogger: deps.traceLogger
    });
    const parsed = extractJsonObject(output);

    return parsed ? Step12MvpPrdResultSchema.parse(parsed) : fallback;
  } catch {
    return fallback;
  }
}

export async function runProductDiscoveryStartWorkflow(
  input: ProductIdeaInput,
  options: RunProductDiscoveryWorkflowOptions = {}
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  let state = createRawIdeaState(input);

  await emit(options, {
    stage: "idea_input",
    message: "原始想法已记录",
    stateSnapshot: state
  });

  state = await inputParserNode(state, deps);
  state = normalizeTargetUserTrace(state);
  await emit(options, {
    stage: "product_context",
    message: "目标用户识别完成",
    stateSnapshot: state
  });

  const profile = createInitialProfile(state);
  state = AgentStateSchema.parse({
    ...state,
    productDiscoveryProfile: profile,
    stage: "product_context",
    currentStage: "product_context",
    updatedAt: new Date().toISOString()
  });

  return state;
}

export async function continueProductDiscoveryToClarification(
  state: AgentState,
  options: RunProductDiscoveryWorkflowOptions = {}
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  let profile = state.productDiscoveryProfile ?? createInitialProfile(state);

  if (profile.step4Clarification) {
    return state;
  }

  profile = await runEnhancedStep3Agent(profile, state, deps);
  const step3Analysis = profile.step3Analysis;

  if (!step3Analysis) {
    throw new Error("Step3 analysis result is missing.");
  }
  state = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "productBoundaryAgent",
      stage: "usage_scenario",
      nodeInput: {
        rawIdea: profile.rawIdea.value,
        targetUsers: profile.targetUsers.value,
        scenarios: profile.scenarios.value
      },
      output: step3Analysis.productBoundary
    }),
    {
      productDiscoveryProfile: profile,
      stage: "usage_scenario",
      currentStage: "usage_scenario"
    }
  );
  state = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "realProblemAgent",
      stage: "usage_scenario",
      nodeInput: step3Analysis.productBoundary,
      output: {
        realProblems: step3Analysis.realProblems,
        falseProblems: step3Analysis.falseProblems
      }
    })
  );
  state = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "alternativeSolutionAgent",
      stage: "usage_scenario",
      nodeInput: step3Analysis.realProblems,
      output: step3Analysis.alternativeSolutions
    })
  );
  state = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "painStrengthAgent",
      stage: "usage_scenario",
      nodeInput: {
        realProblems: step3Analysis.realProblems,
        alternativeSolutions: step3Analysis.alternativeSolutions
      },
      output: step3Analysis.painStrength
    })
  );
  state = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "confidenceGapAgent",
      stage: "usage_scenario",
      nodeInput: step3Analysis,
      output: step3Analysis.gapResult
    })
  );
  await emit(options, {
    stage: "usage_scenario",
    message: "场景与问题识别完成",
    stateSnapshot: state
  });

  const step4Result = await runStep4ClarificationAgent(
    {
      rawIdea: profile.rawIdea.value,
      targetUsers: profile.targetUsers.value,
      step3AnalysisResult: step3Analysis
    },
    state,
    deps
  );
  const questions = toDiscoveryClarificationQuestions(step4Result.questions);
  profile = ProductDiscoveryProfileSchema.parse({
    ...profile,
    status: questions.length > 0 ? "needs_input" : "completed",
    step4Clarification: step4Result,
    clarificationQuestions: questions
  });
  state = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "contextCompletenessAgent",
      stage: "clarification",
      nodeInput: {
        rawIdea: profile.rawIdea.value,
        targetUsers: profile.targetUsers.value,
        step3Analysis
      },
      output: step4Result.completeness
    }),
    {
      productDiscoveryProfile: profile,
      clarificationQuestions: createCompatibilityQuestions(questions),
      stage: "clarification",
      currentStage: "clarification"
    }
  );
  state = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "clarificationDepthRouterAgent",
      stage: "clarification",
      nodeInput: step4Result.completeness,
      output: step4Result.depth
    })
  );
  state = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "questionPlanningAgent",
      stage: "clarification",
      nodeInput: {
        completeness: step4Result.completeness,
        depth: step4Result.depth
      },
      output: step4Result.questionPlan
    })
  );
  state = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "questionGenerationAgent",
      stage: "clarification",
      nodeInput: step4Result.questionPlan,
      output: step4Result.questions
    })
  );
  state = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "questionDeduplicationAgent",
      stage: "clarification",
      nodeInput: step4Result.questions,
      output: questions
    })
  );
  await emit(options, {
    stage: "clarification",
    message:
      questions.length > 0 ? "等待用户补充关键信息" : "澄清问题生成完成",
    stateSnapshot: state
  });

  return state;
}

export async function runProductDiscoveryWorkflow(
  input: ProductIdeaInput,
  options: RunProductDiscoveryWorkflowOptions = {}
): Promise<AgentState> {
  const state = await runProductDiscoveryStartWorkflow(input, options);

  return continueProductDiscoveryToClarification(state, options);
}

export type ProductDiscoveryStepAdvanceInput = {
  answers?: UserAnswer[];
};

function getRequiredStep3Analysis(profile: ProductDiscoveryProfile): Step3AnalysisResult {
  if (!profile.step3Analysis) {
    throw new Error("Step3 analysis result is missing.");
  }

  return profile.step3Analysis;
}

async function runProductDiscoveryStep3Only(
  state: AgentState,
  options: RunProductDiscoveryWorkflowOptions
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  const baseProfile = state.productDiscoveryProfile ?? createInitialProfile(state);

  if (baseProfile.step3Analysis) {
    return state;
  }

  const profile = await runEnhancedStep3Agent(baseProfile, state, deps);
  const step3Analysis = getRequiredStep3Analysis(profile);
  let nextState = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "productBoundaryAgent",
      stage: "usage_scenario",
      nodeInput: {
        rawIdea: profile.rawIdea.value,
        targetUsers: profile.targetUsers.value,
        scenarios: profile.scenarios.value
      },
      output: step3Analysis.productBoundary
    }),
    {
      productDiscoveryProfile: profile,
      stage: "usage_scenario",
      currentStage: "usage_scenario"
    }
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "realProblemAgent",
      stage: "usage_scenario",
      nodeInput: step3Analysis.productBoundary,
      output: {
        realProblems: step3Analysis.realProblems,
        falseProblems: step3Analysis.falseProblems
      }
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "alternativeSolutionAgent",
      stage: "usage_scenario",
      nodeInput: step3Analysis.realProblems,
      output: step3Analysis.alternativeSolutions
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "painStrengthAgent",
      stage: "usage_scenario",
      nodeInput: {
        realProblems: step3Analysis.realProblems,
        alternativeSolutions: step3Analysis.alternativeSolutions
      },
      output: step3Analysis.painStrength
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "confidenceGapAgent",
      stage: "usage_scenario",
      nodeInput: step3Analysis,
      output: step3Analysis.gapResult
    }),
    {
      stage: "usage_scenario",
      currentStage: "usage_scenario"
    }
  );

  await emit(options, {
    stage: "usage_scenario",
    message: "场景与问题识别完成",
    stateSnapshot: nextState
  });

  return nextState;
}

async function runProductDiscoveryStep4Only(
  state: AgentState,
  options: RunProductDiscoveryWorkflowOptions
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  let profile = state.productDiscoveryProfile;

  if (!profile) {
    throw new Error("Product discovery profile is missing.");
  }

  if (profile.step4Clarification) {
    return state;
  }

  const step3Analysis = getRequiredStep3Analysis(profile);
  const step4Result = await runStep4ClarificationAgent(
    {
      rawIdea: profile.rawIdea.value,
      targetUsers: profile.targetUsers.value,
      step3AnalysisResult: step3Analysis
    },
    state,
    deps
  );
  const questions = toDiscoveryClarificationQuestions(step4Result.questions);
  profile = ProductDiscoveryProfileSchema.parse({
    ...profile,
    status: questions.length > 0 ? "needs_input" : "completed",
    step4Clarification: step4Result,
    clarificationQuestions: questions
  });
  let nextState = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "contextCompletenessAgent",
      stage: "clarification",
      nodeInput: {
        rawIdea: profile.rawIdea.value,
        targetUsers: profile.targetUsers.value,
        step3Analysis
      },
      output: step4Result.completeness
    }),
    {
      productDiscoveryProfile: profile,
      clarificationQuestions: createCompatibilityQuestions(questions),
      stage: "clarification",
      currentStage: "clarification"
    }
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "clarificationDepthRouterAgent",
      stage: "clarification",
      nodeInput: step4Result.completeness,
      output: step4Result.depth
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "questionPlanningAgent",
      stage: "clarification",
      nodeInput: {
        completeness: step4Result.completeness,
        depth: step4Result.depth
      },
      output: step4Result.questionPlan
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "questionGenerationAgent",
      stage: "clarification",
      nodeInput: step4Result.questionPlan,
      output: step4Result.questions
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "questionDeduplicationAgent",
      stage: "clarification",
      nodeInput: step4Result.questions,
      output: questions
    })
  );

  await emit(options, {
    stage: "clarification",
    message:
      questions.length > 0 ? "等待用户补充关键信息" : "澄清问题生成完成",
    stateSnapshot: nextState
  });

  return nextState;
}

function integrateProductDiscoveryAnswersOnly(
  state: AgentState,
  answers: UserAnswer[]
): AgentState {
  const profile = state.productDiscoveryProfile;

  if (!profile) {
    throw new Error("Product discovery profile is missing.");
  }

  if (profile.userAnswers.length > 0) {
    return state;
  }

  const nextProfile = integrateAnswers(profile, answers);

  return applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "answerIntegrationAgent",
      stage: "clarification",
      nodeInput: answers,
      output: {
        revisionSummary: nextProfile.revisionSummary
      }
    }),
    {
      productDiscoveryProfile: nextProfile,
      clarificationAnswers: answers.map((answer) => ({
        questionId: answer.questionId,
        answer: Array.isArray(answer.answer) ? answer.answer.join("；") : answer.answer,
        isMock: false
      })),
      stage: "clarification",
      currentStage: "clarification"
    }
  );
}

const dedupeSources = (sources: SourceItem[]): SourceItem[] => {
  const seen = new Set<string>();

  return sources.filter((source) => {
    const key = source.url ?? source.title;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

function createSupplementalResearchBase(): SupplementalResearchResult {
  return {
    maxRounds: 2,
    rounds: [],
    latestStatus: "idle",
    recommendedAction:
      "当结论存在低置信度、研究缺口或待验证假设时，可运行补充研究。"
  };
}

function collectSupplementalResearchQueries(
  profile: ProductDiscoveryProfile,
  evaluation?: EvaluationResult | null
): SupplementalResearchQuery[] {
  const queries: SupplementalResearchQuery[] = [];
  const rawIdea = profile.rawIdea.value;
  const addQuery = (
    query: string,
    reason: string,
    source: SupplementalResearchQuery["source"]
  ) => {
    if (
      query.trim() &&
      !queries.some((item) => item.query.toLowerCase() === query.toLowerCase())
    ) {
      queries.push({
        id: `supplemental_query_${String(queries.length + 1).padStart(3, "0")}`,
        query,
        reason,
        source
      });
    }
  };

  if (evaluation && evaluation.credibilityScore < 75) {
    for (const reason of evaluation.dimensionDetails.credibility.deductions) {
      addQuery(
        `${rawIdea} ${reason}`,
        `评测可信度得分 ${evaluation.credibilityScore}，需要补充来源证据：${reason}`,
        "evaluation_gap"
      );
    }
  }

  if (evaluation && evaluation.differentiationScore < 75) {
    for (const reason of evaluation.dimensionDetails.differentiation.deductions) {
      addQuery(
        `${rawIdea} 竞品 替代方案 ${reason}`,
        `评测差异化得分 ${evaluation.differentiationScore}，需要补充竞品研究：${reason}`,
        "evaluation_gap"
      );
    }
  }

  for (const gap of profile.step9CompetitorIdentification?.competitorIdentification
    .researchGaps ?? []) {
    addQuery(`${rawIdea} ${gap}`, `竞品识别仍存在研究缺口：${gap}`, "competitor_gap");
  }

  for (const gap of profile.step10CompetitorAnalysisTable?.competitorAnalysisTable
    .researchGaps ?? []) {
    addQuery(`${rawIdea} ${gap}`, `竞品分析表仍存在研究缺口：${gap}`, "research_gap");
  }

  for (const gap of profile.step11UserPersonas?.userPersonas.researchGaps ?? []) {
    addQuery(`${rawIdea} ${gap}`, `用户画像仍存在待验证问题：${gap}`, "research_gap");
  }

  for (const assumption of profile.step8MarketAnalysis?.marketAnalysis.assumptions ??
    []) {
    addQuery(
      `${rawIdea} ${assumption.assumption}`,
      `市场分析假设需要验证：${assumption.assumption}`,
      "assumption"
    );
  }

  for (const assumption of profile.step12MvpPrd?.mvpPrd.assumptions ?? []) {
    addQuery(`${rawIdea} ${assumption}`, `MVP PRD 假设需要验证：${assumption}`, "assumption");
  }

  if (profile.step8MarketAnalysis?.marketAnalysis.confidence === "low") {
    addQuery(`${rawIdea} 行业 市场 用户需求`, "行业与市场分析置信度较低。", "low_confidence");
  }

  if (profile.step9CompetitorIdentification?.competitorIdentification.confidence === "low") {
    addQuery(`${rawIdea} 直接竞品 间接竞品 替代方案`, "竞品识别置信度较低。", "low_confidence");
  }

  if (queries.length === 0) {
    addQuery(
      `${rawIdea} 用户需求 竞品 替代方案 MVP 验证`,
      "当前没有明确研究缺口，执行一轮通用补充研究。",
      "manual_followup"
    );
  }

  return queries.slice(0, 4);
}

function summarizeSupplementalFindings(sources: SourceItem[]): string[] {
  return sources.slice(0, 5).map((source) => `${source.title}：${source.summary}`);
}

function getSupplementalUnresolvedQuestions(
  profile: ProductDiscoveryProfile,
  evaluation?: EvaluationResult | null
): string[] {
  return [
    ...(evaluation?.dimensionDetails.credibility.deductions ?? []),
    ...(evaluation?.dimensionDetails.differentiation.deductions ?? []),
    ...(profile.step9CompetitorIdentification?.competitorIdentification
      .researchGaps ?? []),
    ...(profile.step10CompetitorAnalysisTable?.competitorAnalysisTable
      .researchGaps ?? []),
    ...(profile.step11UserPersonas?.userPersonas.researchGaps ?? []),
    ...(profile.step12MvpPrd?.mvpPrd.risks ?? [])
  ].slice(0, 6);
}

export function shouldTriggerSupplementalResearchFromEvaluation(
  state: AgentState
): boolean {
  const evaluation = state.evaluation;
  const research = state.productDiscoveryProfile?.supplementalResearch;

  if (!evaluation || !state.productDiscoveryProfile?.step7ResearchPlan) {
    return false;
  }

  if ((research?.rounds.length ?? 0) >= (research?.maxRounds ?? 2)) {
    return false;
  }

  return (
    evaluation.credibilityScore < 75 ||
    evaluation.differentiationScore < 70 ||
    evaluation.dimensionDetails.credibility.deductions.length > 0
  );
}

export async function runSupplementalResearchRound(
  state: AgentState,
  options: RunProductDiscoveryWorkflowOptions = {}
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  const profile = state.productDiscoveryProfile;

  if (!profile) {
    throw new Error("Product discovery profile is missing.");
  }

  const currentResearch = profile.supplementalResearch ?? createSupplementalResearchBase();

  if (currentResearch.rounds.length >= currentResearch.maxRounds) {
    const nextProfile = ProductDiscoveryProfileSchema.parse({
      ...profile,
      supplementalResearch: {
        ...currentResearch,
        latestStatus: "max_rounds_reached",
        recommendedAction:
          "补充研究已达到 2 轮上限，建议进入人工判断或用户访谈。"
      }
    });

    return AgentStateSchema.parse({
      ...state,
      productDiscoveryProfile: nextProfile,
      updatedAt: nowIso()
    });
  }

  const round = currentResearch.rounds.length + 1;
  const queries = collectSupplementalResearchQueries(profile, state.evaluation);
  let nextState = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "supplementalResearchPlannerAgent",
      stage: "supplemental_research",
      nodeInput: {
        currentStage: state.currentStage,
        profileSummary: {
          step8Confidence: profile.step8MarketAnalysis?.marketAnalysis.confidence,
          step9Confidence:
            profile.step9CompetitorIdentification?.competitorIdentification.confidence,
          priorRounds: currentResearch.rounds.length
        }
      },
      output: queries
    }),
    {
      stage: "supplemental_research",
      currentStage: "supplemental_research"
    }
  );
  const toolResult = await deps.toolRegistry.execute<MockSearchOutput>(
    "mockSearch",
    {
      searchQueries: queries.map((query) => query.query),
      limit: 3
    },
    {
      state: nextState,
      traceLogger: deps.traceLogger
    }
  );
  const sources = dedupeSources([...nextState.sources, ...toolResult.output.sources]);
  const roundSources = dedupeSources(toolResult.output.sources);
  const status = toolResult.status === "success" ? "completed" : "degraded";
  const researchRound = {
    id: `supplemental_round_${round}`,
    round,
    triggerStage: state.currentStage,
    reason:
      queries[0]?.reason ??
      "当前产品发现结论仍存在信息不足或不确定性，需要补充研究。",
    queries,
    sources: roundSources,
    findings: summarizeSupplementalFindings(roundSources),
    unresolvedQuestions: getSupplementalUnresolvedQuestions(profile, state.evaluation),
    status,
    createdAt: nowIso()
  } satisfies SupplementalResearchResult["rounds"][number];
  const nextResearch: SupplementalResearchResult = {
    ...currentResearch,
    rounds: [...currentResearch.rounds, researchRound],
    latestStatus: status,
    recommendedAction:
      round >= currentResearch.maxRounds
        ? "已完成第 2 轮补充研究，建议进入人工判断或用户访谈。"
        : "如仍存在低置信度或关键研究缺口，可再运行一轮补充研究。"
  };
  const profileWithSupplementalEvidence = attachSupplementalSourcesToProfile(
    profile,
    roundSources,
    round
  );
  const nextProfile = ProductDiscoveryProfileSchema.parse({
    ...profileWithSupplementalEvidence,
    supplementalResearch: nextResearch
  });

  nextState = AgentStateSchema.parse({
    ...nextState,
    productDiscoveryProfile: nextProfile,
    sources,
    evaluation: state.evaluation ? null : state.evaluation,
    rewriteRequired: state.evaluation ? false : state.rewriteRequired,
    trace: [...nextState.trace, toolResult.traceEvent],
    errors: toolResult.error ? [...nextState.errors, toolResult.error] : nextState.errors,
    updatedAt: nowIso()
  });
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "supplementalResearchSynthesisAgent",
      stage: "supplemental_research",
      nodeInput: {
        queries,
        sourceCount: roundSources.length
      },
      output: {
        findings: researchRound.findings,
        unresolvedQuestions: researchRound.unresolvedQuestions,
        recommendedAction: nextResearch.recommendedAction
      },
      status: status === "completed" ? "success" : "degraded"
    }),
    {
      stage: state.stage,
      currentStage: state.currentStage
    }
  );

  await emit(options, {
    stage: "supplemental_research",
    message: `第 ${round} 轮补充研究完成`,
    stateSnapshot: nextState
  });

  return nextState;
}

async function runProductDiscoveryStep7Only(
  state: AgentState,
  options: RunProductDiscoveryWorkflowOptions
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  const profile = state.productDiscoveryProfile;

  if (!profile) {
    throw new Error("Product discovery profile is missing.");
  }

  if (profile.step7ResearchPlan) {
    return state;
  }

  const step3Analysis = getRequiredStep3Analysis(profile);
  const step7Result = await runStep7ResearchPlanAgent(
    {
      rawIdea: profile.rawIdea.value,
      targetUsers: profile.targetUsers.value,
      step3AnalysisResult: step3Analysis,
      clarificationQuestions: profile.clarificationQuestions,
      userAnswers: profile.userAnswers,
      revisedDiscoveryProfile: profile
    },
    state,
    deps
  );
  const nextProfile = ProductDiscoveryProfileSchema.parse({
    ...profile,
    researchPlan: toLegacyResearchPlan(step7Result),
    step7ResearchPlan: step7Result
  });
  let nextState = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "researchContextAgent",
      stage: "research_plan",
      nodeInput: nextProfile,
      output: step7Result.researchPlan.context
    }),
    {
      productDiscoveryProfile: nextProfile,
      stage: "research_plan",
      currentStage: "research_plan"
    }
  );
  for (const eventInput of [
    ["researchGoalAgent", step7Result.researchPlan.context, step7Result.researchPlan.goals],
    ["researchQuestionAgent", step7Result.researchPlan.goals, step7Result.researchPlan.keyQuestions],
    ["researchMethodAgent", step7Result.researchPlan.keyQuestions, step7Result.researchPlan.methods],
    ["researchTimelineAgent", step7Result.researchPlan.methods, step7Result.researchPlan.timeline],
    ["researchDeliverableAgent", step7Result.researchPlan.timeline, step7Result.researchPlan.deliverables],
    ["researchRiskAgent", step7Result.researchPlan.deliverables, step7Result.researchPlan.risks],
    ["researchUsageAgent", step7Result.researchPlan, step7Result.researchPlan.usages]
  ] as const) {
    nextState = applyTrace(
      nextState,
      createTraceEvent({
        state: nextState,
        nodeName: eventInput[0],
        stage: "research_plan",
        nodeInput: eventInput[1],
        output: eventInput[2]
      })
    );
  }

  await emit(options, {
    stage: "research_plan",
    message: "研究计划生成完成",
    stateSnapshot: nextState
  });

  return nextState;
}

async function runProductDiscoveryStep8Only(
  state: AgentState,
  options: RunProductDiscoveryWorkflowOptions
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  const profile = state.productDiscoveryProfile;

  if (!profile?.step7ResearchPlan) {
    throw new Error("Step7 research plan is missing.");
  }

  if (profile.step8MarketAnalysis) {
    return state;
  }

  const step3Analysis = getRequiredStep3Analysis(profile);
  const step8Result = await runStep8MarketAnalysisAgent(
    {
      rawIdea: profile.rawIdea.value,
      targetUsers: profile.targetUsers.value,
      step3AnalysisResult: step3Analysis,
      clarificationQuestions: profile.clarificationQuestions,
      userAnswers: profile.userAnswers,
      revisedDiscoveryProfile: profile,
      researchPlan: profile.step7ResearchPlan
    },
    state,
    deps
  );
  const nextProfile = ProductDiscoveryProfileSchema.parse({
    ...profile,
    step8MarketAnalysis: step8Result
  });
  let nextState = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "marketContextAgent",
      stage: "market_analysis",
      nodeInput: {
        rawIdea: profile.rawIdea.value,
        researchContext: profile.step7ResearchPlan.researchPlan.context
      },
      output: step8Result.marketAnalysis.industryBackground
    }),
    {
      productDiscoveryProfile: nextProfile,
      stage: "market_analysis",
      currentStage: "market_analysis"
    }
  );
  for (const eventInput of [
    ["targetMarketAgent", step8Result.marketAnalysis.industryBackground, step8Result.marketAnalysis.targetMarket],
    ["trendAnalysisAgent", step8Result.marketAnalysis.targetMarket, step8Result.marketAnalysis.trends],
    ["userDemandAgent", { targetMarket: step8Result.marketAnalysis.targetMarket, step3Analysis }, step8Result.marketAnalysis.userDemands],
    ["opportunityAgent", { trends: step8Result.marketAnalysis.trends, userDemands: step8Result.marketAnalysis.userDemands }, step8Result.marketAnalysis.opportunities],
    ["marketAssumptionAgent", step8Result.marketAnalysis.opportunities, step8Result.marketAnalysis.assumptions]
  ] as const) {
    nextState = applyTrace(
      nextState,
      createTraceEvent({
        state: nextState,
        nodeName: eventInput[0],
        stage: "market_analysis",
        nodeInput: eventInput[1],
        output: eventInput[2]
      })
    );
  }

  await emit(options, {
    stage: "market_analysis",
    message: "行业与市场初步分析完成",
    stateSnapshot: nextState
  });

  return nextState;
}

async function runProductDiscoveryStep9Only(
  state: AgentState,
  options: RunProductDiscoveryWorkflowOptions
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  const profile = state.productDiscoveryProfile;

  if (!profile?.step7ResearchPlan || !profile.step8MarketAnalysis) {
    throw new Error("Step7 or Step8 result is missing.");
  }

  if (profile.step9CompetitorIdentification) {
    return state;
  }

  const step3Analysis = getRequiredStep3Analysis(profile);
  const step9Result = await runStep9CompetitorIdentificationAgent(
    {
      rawIdea: profile.rawIdea.value,
      targetUsers: profile.targetUsers.value,
      step3AnalysisResult: step3Analysis,
      revisedDiscoveryProfile: profile,
      researchPlan: profile.step7ResearchPlan,
      marketAnalysis: profile.step8MarketAnalysis
    },
    state,
    deps
  );
  const nextProfile = ProductDiscoveryProfileSchema.parse({
    ...profile,
    step9CompetitorIdentification: step9Result
  });
  let nextState = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "competitorLandscapeAgent",
      stage: "competitor_analysis",
      nodeInput: {
        marketAnalysis: profile.step8MarketAnalysis.marketAnalysis,
        researchContext: profile.step7ResearchPlan.researchPlan.context
      },
      output: step9Result.competitorIdentification.summary
    }),
    {
      productDiscoveryProfile: nextProfile,
      stage: "competitor_analysis",
      currentStage: "competitor_analysis"
    }
  );
  for (const eventInput of [
    ["directCompetitorAgent", step9Result.competitorIdentification.summary, step9Result.competitorIdentification.directCompetitors],
    ["indirectCompetitorAgent", step9Result.competitorIdentification.directCompetitors, step9Result.competitorIdentification.indirectCompetitors],
    ["substituteSolutionAgent", step3Analysis.alternativeSolutions, step9Result.competitorIdentification.substituteSolutions],
    [
      "differentiationOpportunityAgent",
      {
        directCompetitors: step9Result.competitorIdentification.directCompetitors,
        indirectCompetitors: step9Result.competitorIdentification.indirectCompetitors,
        substituteSolutions: step9Result.competitorIdentification.substituteSolutions
      },
      {
        opportunities: step9Result.competitorIdentification.differentiationOpportunities,
        researchGaps: step9Result.competitorIdentification.researchGaps
      }
    ]
  ] as const) {
    nextState = applyTrace(
      nextState,
      createTraceEvent({
        state: nextState,
        nodeName: eventInput[0],
        stage: "competitor_analysis",
        nodeInput: eventInput[1],
        output: eventInput[2]
      })
    );
  }

  await emit(options, {
    stage: "competitor_analysis",
    message: "竞品识别与分析完成",
    stateSnapshot: nextState
  });

  return nextState;
}

async function runProductDiscoveryStep10Only(
  state: AgentState,
  options: RunProductDiscoveryWorkflowOptions
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  const profile = state.productDiscoveryProfile;

  if (!profile?.step8MarketAnalysis || !profile.step9CompetitorIdentification) {
    throw new Error("Step8 or Step9 result is missing.");
  }

  if (profile.step10CompetitorAnalysisTable) {
    return state;
  }

  const step10Result = await runStep10CompetitorAnalysisTableAgent(
    {
      rawIdea: profile.rawIdea.value,
      marketAnalysis: profile.step8MarketAnalysis,
      competitorIdentification: profile.step9CompetitorIdentification
    },
    state,
    deps
  );
  const nextProfile = ProductDiscoveryProfileSchema.parse({
    ...profile,
    step10CompetitorAnalysisTable: step10Result
  });
  let nextState = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "competitorTableDimensionAgent",
      stage: "competitor_analysis",
      nodeInput: profile.step9CompetitorIdentification.competitorIdentification,
      output: [
        "产品定位",
        "目标用户",
        "核心功能",
        "适用渠道",
        "支持语言",
        "个性化能力",
        "优势",
        "劣势",
        "差异化机会",
        "典型场景"
      ]
    }),
    {
      productDiscoveryProfile: nextProfile,
      stage: "competitor_analysis",
      currentStage: "competitor_analysis"
    }
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "competitorComparisonTableAgent",
      stage: "competitor_analysis",
      nodeInput: profile.step9CompetitorIdentification.competitorIdentification,
      output: step10Result.competitorAnalysisTable.rows
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "competitorTableInsightAgent",
      stage: "competitor_analysis",
      nodeInput: step10Result.competitorAnalysisTable.rows,
      output: {
        keyFindings: step10Result.competitorAnalysisTable.keyFindings,
        recommendedFocus: step10Result.competitorAnalysisTable.recommendedFocus,
        researchGaps: step10Result.competitorAnalysisTable.researchGaps
      }
    })
  );

  await emit(options, {
    stage: "competitor_analysis",
    message: "竞品分析表生成完成",
    stateSnapshot: nextState
  });

  return nextState;
}

async function runProductDiscoveryStep11Only(
  state: AgentState,
  options: RunProductDiscoveryWorkflowOptions
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  const profile = state.productDiscoveryProfile;

  if (
    !profile?.step7ResearchPlan ||
    !profile.step8MarketAnalysis ||
    !profile.step9CompetitorIdentification ||
    !profile.step10CompetitorAnalysisTable
  ) {
    throw new Error("Required Step7-Step10 results are missing.");
  }

  if (profile.step11UserPersonas) {
    return state;
  }

  const step3Analysis = getRequiredStep3Analysis(profile);
  const step11Result = await runStep11UserPersonaAgent(
    {
      rawIdea: profile.rawIdea.value,
      targetUsers: profile.targetUsers.value,
      step3AnalysisResult: step3Analysis,
      clarificationQuestions: profile.clarificationQuestions,
      userAnswers: profile.userAnswers,
      revisedDiscoveryProfile: profile,
      researchPlan: profile.step7ResearchPlan,
      marketAnalysis: profile.step8MarketAnalysis,
      competitorIdentification: profile.step9CompetitorIdentification,
      competitorAnalysisTable: profile.step10CompetitorAnalysisTable
    },
    state,
    deps
  );
  const nextProfile = ProductDiscoveryProfileSchema.parse({
    ...profile,
    step11UserPersonas: step11Result
  });
  let nextState = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "personaSegmentationAgent",
      stage: "persona_generation",
      nodeInput: {
        targetUsers: profile.targetUsers.value,
        userDemands: profile.step8MarketAnalysis.marketAnalysis.userDemands
      },
      output: step11Result.userPersonas.personas.map((persona) => ({
        name: persona.name,
        segment: persona.segment,
        role: persona.role,
        confidence: persona.confidence
      }))
    }),
    {
      productDiscoveryProfile: nextProfile,
      stage: "persona_generation",
      currentStage: "persona_generation"
    }
  );
  for (const eventInput of [
    [
      "personaScenarioAgent",
      step3Analysis.realProblems,
      step11Result.userPersonas.personas.map((persona) => ({
        name: persona.name,
        scenarios: persona.scenarios,
        behaviors: persona.behaviors
      }))
    ],
    [
      "personaPainGoalAgent",
      { realProblems: step3Analysis.realProblems, userAnswers: profile.userAnswers },
      step11Result.userPersonas.personas.map((persona) => ({
        name: persona.name,
        painPoints: persona.painPoints,
        goals: persona.goals,
        motivations: persona.motivations
      }))
    ],
    [
      "personaInsightAgent",
      {
        marketAnalysis: profile.step8MarketAnalysis.marketAnalysis.summary,
        competitorTable: profile.step10CompetitorAnalysisTable.competitorAnalysisTable.summary
      },
      {
        commonPainPoints: step11Result.userPersonas.commonPainPoints,
        commonMotivations: step11Result.userPersonas.commonMotivations,
        productImplications: step11Result.userPersonas.productImplications,
        researchGaps: step11Result.userPersonas.researchGaps
      }
    ]
  ] as const) {
    nextState = applyTrace(
      nextState,
      createTraceEvent({
        state: nextState,
        nodeName: eventInput[0],
        stage: "persona_generation",
        nodeInput: eventInput[1],
        output: eventInput[2]
      })
    );
  }

  await emit(options, {
    stage: "persona_generation",
    message: "用户画像生成完成",
    stateSnapshot: nextState
  });

  return nextState;
}

async function runProductDiscoveryStep12Only(
  state: AgentState,
  options: RunProductDiscoveryWorkflowOptions
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  const profile = state.productDiscoveryProfile;

  if (
    !profile?.step7ResearchPlan ||
    !profile.step8MarketAnalysis ||
    !profile.step9CompetitorIdentification ||
    !profile.step10CompetitorAnalysisTable ||
    !profile.step11UserPersonas
  ) {
    throw new Error("Required Step7-Step11 results are missing.");
  }

  if (profile.step12MvpPrd) {
    return state;
  }

  const step3Analysis = getRequiredStep3Analysis(profile);
  const step12Result = await runStep12MvpPrdAgent(
    {
      rawIdea: profile.rawIdea.value,
      targetUsers: profile.targetUsers.value,
      step3AnalysisResult: step3Analysis,
      clarificationQuestions: profile.clarificationQuestions,
      userAnswers: profile.userAnswers,
      revisedDiscoveryProfile: profile,
      researchPlan: profile.step7ResearchPlan,
      marketAnalysis: profile.step8MarketAnalysis,
      competitorIdentification: profile.step9CompetitorIdentification,
      competitorAnalysisTable: profile.step10CompetitorAnalysisTable,
      userPersonas: profile.step11UserPersonas
    },
    state,
    deps
  );
  const nextProfile = ProductDiscoveryProfileSchema.parse({
    ...profile,
    step12MvpPrd: step12Result
  });
  let nextState = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "prdContextAgent",
      stage: "prd_generation",
      nodeInput: {
        rawIdea: profile.rawIdea.value,
        personas: profile.step11UserPersonas.userPersonas.personas.map(
          (persona) => persona.name
        ),
        marketSummary: profile.step8MarketAnalysis.marketAnalysis.summary
      },
      output: {
        productName: step12Result.mvpPrd.productName,
        background: step12Result.mvpPrd.background,
        goals: step12Result.mvpPrd.goals,
        targetUsers: step12Result.mvpPrd.targetUsers,
        scenarios: step12Result.mvpPrd.scenarios
      }
    }),
    {
      productDiscoveryProfile: nextProfile,
      stage: "prd_generation",
      currentStage: "prd_generation"
    }
  );
  for (const eventInput of [
    [
      "prdScopeAgent",
      {
        productBoundary: step3Analysis.productBoundary,
        competitorFocus:
          profile.step10CompetitorAnalysisTable.competitorAnalysisTable.recommendedFocus
      },
      {
        featureScope: step12Result.mvpPrd.featureScope,
        outOfScope: step12Result.mvpPrd.outOfScope
      }
    ],
    [
      "prdUserStoryAgent",
      profile.step11UserPersonas.userPersonas.personas,
      {
        userStories: step12Result.mvpPrd.userStories,
        userFlow: step12Result.mvpPrd.userFlow
      }
    ],
    [
      "prdAcceptanceAgent",
      {
        goals: step12Result.mvpPrd.goals,
        risks: step12Result.mvpPrd.risks
      },
      {
        acceptanceCriteria: step12Result.mvpPrd.acceptanceCriteria,
        successMetrics: step12Result.mvpPrd.successMetrics,
        assumptions: step12Result.mvpPrd.assumptions
      }
    ]
  ] as const) {
    nextState = applyTrace(
      nextState,
      createTraceEvent({
        state: nextState,
        nodeName: eventInput[0],
        stage: "prd_generation",
        nodeInput: eventInput[1],
        output: eventInput[2]
      }),
      eventInput[0] === "prdAcceptanceAgent"
        ? {
            stage: "completed",
            currentStage: "completed"
          }
        : {}
    );
  }

  await emit(options, {
    stage: "prd_generation",
    message: "MVP PRD 生成完成",
    stateSnapshot: nextState
  });

  return nextState;
}

export async function continueProductDiscoveryOneStep(
  state: AgentState,
  input: ProductDiscoveryStepAdvanceInput = {},
  options: RunProductDiscoveryWorkflowOptions = {}
): Promise<AgentState> {
  const profile = state.productDiscoveryProfile;

  if (!profile) {
    throw new Error("Product discovery profile is missing.");
  }

  if (!profile.step3Analysis) {
    return runProductDiscoveryStep3Only(state, options);
  }

  if (!profile.step4Clarification) {
    return runProductDiscoveryStep4Only(state, options);
  }

  if (profile.clarificationQuestions.length > 0 && profile.userAnswers.length === 0) {
    if (!input.answers?.length) {
      throw new Error("Clarification answers are required before continuing.");
    }

    return integrateProductDiscoveryAnswersOnly(state, input.answers);
  }

  if (!profile.step7ResearchPlan) {
    return runProductDiscoveryStep7Only(state, options);
  }

  if (!profile.step8MarketAnalysis) {
    return runProductDiscoveryStep8Only(state, options);
  }

  if (!profile.step9CompetitorIdentification) {
    return runProductDiscoveryStep9Only(state, options);
  }

  if (!profile.step10CompetitorAnalysisTable) {
    return runProductDiscoveryStep10Only(state, options);
  }

  if (!profile.step11UserPersonas) {
    return runProductDiscoveryStep11Only(state, options);
  }

  if (!profile.step12MvpPrd) {
    return runProductDiscoveryStep12Only(state, options);
  }

  if (!state.evaluation) {
    return evaluationNode(state, mergeDeps(options.deps));
  }

  if (shouldTriggerSupplementalResearchFromEvaluation(state)) {
    return runSupplementalResearchRound(state, options);
  }

  return state;
}

export async function continueProductDiscoveryWorkflow(
  state: AgentState,
  answers: UserAnswer[],
  options: RunProductDiscoveryWorkflowOptions = {}
): Promise<AgentState> {
  const deps = mergeDeps(options.deps);
  const profile = state.productDiscoveryProfile;

  if (!profile) {
    throw new Error("Product discovery profile is missing.");
  }

  let nextProfile = integrateAnswers(profile, answers);
  let nextState = applyTrace(
    state,
    createTraceEvent({
      state,
      nodeName: "answerIntegrationAgent",
      stage: "clarification",
      nodeInput: answers,
      output: {
        revisionSummary: nextProfile.revisionSummary
      }
    }),
    {
      productDiscoveryProfile: nextProfile,
      clarificationAnswers: answers.map((answer) => ({
        questionId: answer.questionId,
        answer: Array.isArray(answer.answer) ? answer.answer.join("；") : answer.answer,
        isMock: false
      })),
      stage: "clarification",
      currentStage: "clarification"
    }
  );

  await emit(options, {
    stage: "clarification",
    message: "用户回答已整合",
    stateSnapshot: nextState
  });

  const step3Analysis = nextProfile.step3Analysis;

  if (!step3Analysis) {
    throw new Error("Step3 analysis result is missing.");
  }

  const step7Result = await runStep7ResearchPlanAgent(
    {
      rawIdea: nextProfile.rawIdea.value,
      targetUsers: nextProfile.targetUsers.value,
      step3AnalysisResult: step3Analysis,
      clarificationQuestions: nextProfile.clarificationQuestions,
      userAnswers: answers,
      revisedDiscoveryProfile: nextProfile
    },
    nextState,
    deps
  );
  const researchPlan = toLegacyResearchPlan(step7Result);
  const step8Result = await runStep8MarketAnalysisAgent(
    {
      rawIdea: nextProfile.rawIdea.value,
      targetUsers: nextProfile.targetUsers.value,
      step3AnalysisResult: step3Analysis,
      clarificationQuestions: nextProfile.clarificationQuestions,
      userAnswers: answers,
      revisedDiscoveryProfile: nextProfile,
      researchPlan: step7Result
    },
    nextState,
    deps
  );
  const step9Result = await runStep9CompetitorIdentificationAgent(
    {
      rawIdea: nextProfile.rawIdea.value,
      targetUsers: nextProfile.targetUsers.value,
      step3AnalysisResult: step3Analysis,
      revisedDiscoveryProfile: nextProfile,
      researchPlan: step7Result,
      marketAnalysis: step8Result
    },
    nextState,
    deps
  );
  const step10Result = await runStep10CompetitorAnalysisTableAgent(
    {
      rawIdea: nextProfile.rawIdea.value,
      marketAnalysis: step8Result,
      competitorIdentification: step9Result
    },
    nextState,
    deps
  );
  const step11Result = await runStep11UserPersonaAgent(
    {
      rawIdea: nextProfile.rawIdea.value,
      targetUsers: nextProfile.targetUsers.value,
      step3AnalysisResult: step3Analysis,
      clarificationQuestions: nextProfile.clarificationQuestions,
      userAnswers: answers,
      revisedDiscoveryProfile: nextProfile,
      researchPlan: step7Result,
      marketAnalysis: step8Result,
      competitorIdentification: step9Result,
      competitorAnalysisTable: step10Result
    },
    nextState,
    deps
  );
  const step12Result = await runStep12MvpPrdAgent(
    {
      rawIdea: nextProfile.rawIdea.value,
      targetUsers: nextProfile.targetUsers.value,
      step3AnalysisResult: step3Analysis,
      clarificationQuestions: nextProfile.clarificationQuestions,
      userAnswers: answers,
      revisedDiscoveryProfile: nextProfile,
      researchPlan: step7Result,
      marketAnalysis: step8Result,
      competitorIdentification: step9Result,
      competitorAnalysisTable: step10Result,
      userPersonas: step11Result
    },
    nextState,
    deps
  );
  nextProfile = ProductDiscoveryProfileSchema.parse({
    ...nextProfile,
    researchPlan,
    step7ResearchPlan: step7Result,
    step8MarketAnalysis: step8Result,
    step9CompetitorIdentification: step9Result,
    step10CompetitorAnalysisTable: step10Result,
    step11UserPersonas: step11Result,
    step12MvpPrd: step12Result
  });
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "researchContextAgent",
      stage: "research_plan",
      nodeInput: nextProfile,
      output: step7Result.researchPlan.context
    }),
    {
      productDiscoveryProfile: nextProfile,
      stage: "research_plan",
      currentStage: "research_plan"
    }
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "researchGoalAgent",
      stage: "research_plan",
      nodeInput: step7Result.researchPlan.context,
      output: step7Result.researchPlan.goals
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "researchQuestionAgent",
      stage: "research_plan",
      nodeInput: step7Result.researchPlan.goals,
      output: step7Result.researchPlan.keyQuestions
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "researchMethodAgent",
      stage: "research_plan",
      nodeInput: step7Result.researchPlan.keyQuestions,
      output: step7Result.researchPlan.methods
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "researchTimelineAgent",
      stage: "research_plan",
      nodeInput: step7Result.researchPlan.methods,
      output: step7Result.researchPlan.timeline
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "researchDeliverableAgent",
      stage: "research_plan",
      nodeInput: step7Result.researchPlan.timeline,
      output: step7Result.researchPlan.deliverables
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "researchRiskAgent",
      stage: "research_plan",
      nodeInput: step7Result.researchPlan.deliverables,
      output: step7Result.researchPlan.risks
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "researchUsageAgent",
      stage: "research_plan",
      nodeInput: step7Result.researchPlan,
      output: step7Result.researchPlan.usages
    })
  );

  await emit(options, {
    stage: "research_plan",
    message: "研究计划生成完成",
    stateSnapshot: nextState
  });

  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "marketContextAgent",
      stage: "market_analysis",
      nodeInput: {
        rawIdea: nextProfile.rawIdea.value,
        researchContext: step7Result.researchPlan.context
      },
      output: step8Result.marketAnalysis.industryBackground
    }),
    {
      stage: "market_analysis",
      currentStage: "market_analysis"
    }
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "targetMarketAgent",
      stage: "market_analysis",
      nodeInput: step8Result.marketAnalysis.industryBackground,
      output: step8Result.marketAnalysis.targetMarket
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "trendAnalysisAgent",
      stage: "market_analysis",
      nodeInput: step8Result.marketAnalysis.targetMarket,
      output: step8Result.marketAnalysis.trends
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "userDemandAgent",
      stage: "market_analysis",
      nodeInput: {
        targetMarket: step8Result.marketAnalysis.targetMarket,
        step3Analysis
      },
      output: step8Result.marketAnalysis.userDemands
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "opportunityAgent",
      stage: "market_analysis",
      nodeInput: {
        trends: step8Result.marketAnalysis.trends,
        userDemands: step8Result.marketAnalysis.userDemands
      },
      output: step8Result.marketAnalysis.opportunities
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "marketAssumptionAgent",
      stage: "market_analysis",
      nodeInput: step8Result.marketAnalysis.opportunities,
      output: step8Result.marketAnalysis.assumptions
    }),
    {
      stage: "market_analysis",
      currentStage: "market_analysis"
    }
  );

  await emit(options, {
    stage: "market_analysis",
    message: "行业与市场初步分析完成",
    stateSnapshot: nextState
  });

  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "competitorLandscapeAgent",
      stage: "competitor_analysis",
      nodeInput: {
        marketAnalysis: step8Result.marketAnalysis,
        researchContext: step7Result.researchPlan.context
      },
      output: step9Result.competitorIdentification.summary
    }),
    {
      stage: "competitor_analysis",
      currentStage: "competitor_analysis"
    }
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "directCompetitorAgent",
      stage: "competitor_analysis",
      nodeInput: step9Result.competitorIdentification.summary,
      output: step9Result.competitorIdentification.directCompetitors
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "indirectCompetitorAgent",
      stage: "competitor_analysis",
      nodeInput: step9Result.competitorIdentification.directCompetitors,
      output: step9Result.competitorIdentification.indirectCompetitors
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "substituteSolutionAgent",
      stage: "competitor_analysis",
      nodeInput: step3Analysis.alternativeSolutions,
      output: step9Result.competitorIdentification.substituteSolutions
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "differentiationOpportunityAgent",
      stage: "competitor_analysis",
      nodeInput: {
        directCompetitors: step9Result.competitorIdentification.directCompetitors,
        indirectCompetitors:
          step9Result.competitorIdentification.indirectCompetitors,
        substituteSolutions:
          step9Result.competitorIdentification.substituteSolutions
      },
      output: {
        opportunities:
          step9Result.competitorIdentification.differentiationOpportunities,
        researchGaps: step9Result.competitorIdentification.researchGaps
      }
    }),
    {
      stage: "completed",
      currentStage: "completed"
    }
  );

  await emit(options, {
    stage: "competitor_analysis",
    message: "竞品识别与分析完成",
    stateSnapshot: nextState
  });

  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "competitorTableDimensionAgent",
      stage: "competitor_analysis",
      nodeInput: step9Result.competitorIdentification,
      output: [
        "产品定位",
        "目标用户",
        "核心功能",
        "适用渠道",
        "支持语言",
        "个性化能力",
        "优势",
        "劣势",
        "差异化机会",
        "典型场景"
      ]
    }),
    {
      stage: "competitor_analysis",
      currentStage: "competitor_analysis"
    }
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "competitorComparisonTableAgent",
      stage: "competitor_analysis",
      nodeInput: step9Result.competitorIdentification,
      output: step10Result.competitorAnalysisTable.rows
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "competitorTableInsightAgent",
      stage: "competitor_analysis",
      nodeInput: step10Result.competitorAnalysisTable.rows,
      output: {
        keyFindings: step10Result.competitorAnalysisTable.keyFindings,
        recommendedFocus: step10Result.competitorAnalysisTable.recommendedFocus,
        researchGaps: step10Result.competitorAnalysisTable.researchGaps
      }
    }),
    {
      stage: "completed",
      currentStage: "completed"
    }
  );

  await emit(options, {
    stage: "competitor_analysis",
    message: "竞品分析表生成完成",
    stateSnapshot: nextState
  });

  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "personaSegmentationAgent",
      stage: "persona_generation",
      nodeInput: {
        targetUsers: nextProfile.targetUsers.value,
        userDemands: step8Result.marketAnalysis.userDemands
      },
      output: step11Result.userPersonas.personas.map((persona) => ({
        name: persona.name,
        segment: persona.segment,
        role: persona.role,
        confidence: persona.confidence
      }))
    }),
    {
      stage: "persona_generation",
      currentStage: "persona_generation"
    }
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "personaScenarioAgent",
      stage: "persona_generation",
      nodeInput: step3Analysis.realProblems,
      output: step11Result.userPersonas.personas.map((persona) => ({
        name: persona.name,
        scenarios: persona.scenarios,
        behaviors: persona.behaviors
      }))
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "personaPainGoalAgent",
      stage: "persona_generation",
      nodeInput: {
        realProblems: step3Analysis.realProblems,
        userAnswers: answers
      },
      output: step11Result.userPersonas.personas.map((persona) => ({
        name: persona.name,
        painPoints: persona.painPoints,
        goals: persona.goals,
        motivations: persona.motivations
      }))
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "personaInsightAgent",
      stage: "persona_generation",
      nodeInput: {
        marketAnalysis: step8Result.marketAnalysis.summary,
        competitorTable: step10Result.competitorAnalysisTable.summary
      },
      output: {
        commonPainPoints: step11Result.userPersonas.commonPainPoints,
        commonMotivations: step11Result.userPersonas.commonMotivations,
        productImplications: step11Result.userPersonas.productImplications,
        researchGaps: step11Result.userPersonas.researchGaps
      }
    }),
    {
      stage: "completed",
      currentStage: "completed"
    }
  );

  await emit(options, {
    stage: "persona_generation",
    message: "用户画像生成完成",
    stateSnapshot: nextState
  });

  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "prdContextAgent",
      stage: "prd_generation",
      nodeInput: {
        rawIdea: nextProfile.rawIdea.value,
        personas: step11Result.userPersonas.personas.map((persona) => persona.name),
        marketSummary: step8Result.marketAnalysis.summary
      },
      output: {
        productName: step12Result.mvpPrd.productName,
        background: step12Result.mvpPrd.background,
        goals: step12Result.mvpPrd.goals,
        targetUsers: step12Result.mvpPrd.targetUsers,
        scenarios: step12Result.mvpPrd.scenarios
      }
    }),
    {
      stage: "prd_generation",
      currentStage: "prd_generation"
    }
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "prdScopeAgent",
      stage: "prd_generation",
      nodeInput: {
        productBoundary: step3Analysis.productBoundary,
        competitorFocus: step10Result.competitorAnalysisTable.recommendedFocus
      },
      output: {
        featureScope: step12Result.mvpPrd.featureScope,
        outOfScope: step12Result.mvpPrd.outOfScope
      }
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "prdUserStoryAgent",
      stage: "prd_generation",
      nodeInput: step11Result.userPersonas.personas,
      output: {
        userStories: step12Result.mvpPrd.userStories,
        userFlow: step12Result.mvpPrd.userFlow
      }
    })
  );
  nextState = applyTrace(
    nextState,
    createTraceEvent({
      state: nextState,
      nodeName: "prdAcceptanceAgent",
      stage: "prd_generation",
      nodeInput: {
        goals: step12Result.mvpPrd.goals,
        risks: step12Result.mvpPrd.risks
      },
      output: {
        acceptanceCriteria: step12Result.mvpPrd.acceptanceCriteria,
        successMetrics: step12Result.mvpPrd.successMetrics,
        assumptions: step12Result.mvpPrd.assumptions
      }
    }),
    {
      stage: "completed",
      currentStage: "completed"
    }
  );

  await emit(options, {
    stage: "prd_generation",
    message: "MVP PRD 生成完成",
    stateSnapshot: nextState
  });

  return nextState;
}
