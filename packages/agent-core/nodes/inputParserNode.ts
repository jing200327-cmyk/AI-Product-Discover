import { z } from "zod";
import type {
  AgentState,
  ProductContext,
  ProductIdeaInput,
  TargetUser,
  TargetUserIdentificationResult
} from "../../shared/types";
import { inputParserPrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

const ConfidenceSchema = z.enum(["low", "medium", "high"]);
const TargetUserTypeSchema = z.enum([
  "core_user",
  "secondary_user",
  "influencer",
  "decision_maker"
]);
const EvidenceTypeSchema = z.enum([
  "keyword",
  "scenario_inference",
  "task_inference",
  "business_inference"
]);

const TargetUserSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    userType: TargetUserTypeSchema,
    description: z.string().trim().min(1),
    evidenceType: EvidenceTypeSchema,
    evidence: z.array(z.string().trim().min(1)).min(1),
    confidence: ConfidenceSchema
  })
  .strict();

const TargetUserIdentificationSchema = z
  .object({
    step: z.literal("step2"),
    title: z.literal("目标用户识别"),
    status: z.enum(["completed", "needs_more_info"]),
    targetUsers: z.array(TargetUserSchema),
    missingInfoPrompt: z.string().trim().min(1).optional()
  })
  .strict();

const missingInfoPrompt =
  "当前想法中缺少明确的用户信息，请补充：这个产品主要给谁用？";

const userTypeOrder: TargetUser["userType"][] = [
  "core_user",
  "secondary_user",
  "influencer",
  "decision_maker"
];

const uniqueNonEmpty = (items: string[]): string[] => [
  ...new Set(items.map((item) => item.trim()).filter(Boolean))
];

const createUserId = (index: number): string =>
  `user_${String(index + 1).padStart(3, "0")}`;

const inferKeywordUsers = (input: ProductIdeaInput): string[] => {
  const candidates = [input.targetAudience ?? ""];
  const patterns = [
    /面向(.+?)的/,
    /给(.+?)用/,
    /给(.+?)做/,
    /为(.+?)提供/,
    /帮助(.+?)(?:，|,|。|\.|$)/,
    /针对(.+?)的/
  ];

  for (const pattern of patterns) {
    const match = input.idea.match(pattern);
    const value = match?.[1]?.trim();

    if (value) {
      candidates.push(value);
    }
  }

  return uniqueNonEmpty(
    candidates.map((item) =>
      item
        .replace(/^一个/, "")
        .replace(/^一款/, "")
        .replace(/AI 产品$/, "")
        .replace(/产品$/, "")
        .trim()
    )
  ).slice(0, 2);
};

const inferTaskUser = (idea: string): string => {
  if (/求职|岗位|简历|HR|JD/i.test(idea)) {
    return "正在主动投递岗位的人";
  }

  if (/跨境|卖家|库存|电商/i.test(idea)) {
    return "跨境电商卖家";
  }

  if (/PRD|产品经理|产品想法|原型/i.test(idea)) {
    return "需要梳理产品想法的人";
  }

  if (/客服|销售|客户/i.test(idea)) {
    return "需要高频处理客户沟通的人";
  }

  return "需要完成该任务的一线使用者";
};

const inferSecondaryUser = (idea: string, coreUser: string): string | null => {
  if (/求职|岗位|简历|HR|JD/i.test(idea)) {
    return "职场新人或应届生";
  }

  if (/跨境|卖家|库存|电商/i.test(idea)) {
    return "负责库存和运营的团队成员";
  }

  if (/PRD|产品经理|产品想法|原型/i.test(idea)) {
    return "创业者或独立开发者";
  }

  if (coreUser.includes("一线")) {
    return null;
  }

  return `与${coreUser}协作的次级使用者`;
};

const inferDecisionMaker = (idea: string): string | null => {
  if (/企业|团队|SaaS|B端|管理|公司|商家|卖家|机构/i.test(idea)) {
    return "团队负责人或业务决策者";
  }

  if (/求职|简历|岗位|HR|JD/i.test(idea)) {
    return "求职培训机构或职业规划顾问";
  }

  return null;
};

const createFallbackTargetUsers = (
  input: ProductIdeaInput
): TargetUserIdentificationResult => {
  const idea = input.idea.trim();

  if (idea.length < 8) {
    return {
      step: "step2",
      title: "目标用户识别",
      status: "needs_more_info",
      targetUsers: [],
      missingInfoPrompt
    };
  }

  const keywordUsers = inferKeywordUsers(input);
  const coreUser = keywordUsers[0] ?? inferTaskUser(idea);
  const targetUsers: TargetUser[] = [
    {
      id: createUserId(0),
      name: coreUser,
      userType: "core_user",
      description: `这类用户最可能直接使用该产品完成相关任务。`,
      evidenceType: keywordUsers[0] ? "keyword" : "task_inference",
      evidence: keywordUsers[0]
        ? [`用户想法中出现“${keywordUsers[0]}”`]
        : ["用户输入主要描述了一个具体任务，需要从任务执行者反推使用者"],
      confidence: keywordUsers[0] ? "high" : "medium"
    }
  ];
  const taskUser = inferTaskUser(idea);

  if (taskUser !== coreUser) {
    targetUsers.push({
      id: createUserId(targetUsers.length),
      name: taskUser,
      userType: "core_user",
      description: "这类用户需要频繁完成该任务，可能是 MVP 阶段的高频使用者。",
      evidenceType: "task_inference",
      evidence: ["产品任务指向高频执行场景", "该任务通常由一线使用者直接完成"],
      confidence: "high"
    });
  }

  const secondaryUser = inferSecondaryUser(idea, coreUser);

  if (secondaryUser) {
    targetUsers.push({
      id: createUserId(targetUsers.length),
      name: secondaryUser,
      userType: "secondary_user",
      description: "这类用户可能也会使用该产品，但不应优先于核心用户。",
      evidenceType: "scenario_inference",
      evidence: ["该人群与核心任务相关", "使用频率和直接需求强度仍需验证"],
      confidence: "medium"
    });
  }

  const decisionMaker = inferDecisionMaker(idea);

  if (decisionMaker) {
    targetUsers.push({
      id: createUserId(targetUsers.length),
      name: decisionMaker,
      userType: "decision_maker",
      description: "这类角色可能不一定高频使用，但可能影响采购、付费或推荐。",
      evidenceType: "business_inference",
      evidence: ["产品存在工具采购、推荐或团队使用关系", "需要区分使用者和付费决策者"],
      confidence: "medium"
    });
  }

  return {
    step: "step2",
    title: "目标用户识别",
    status: "completed",
    targetUsers: normalizeTargetUsers(targetUsers)
  };
};

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

const normalizeTargetUsers = (users: TargetUser[]): TargetUser[] => {
  const seenNames = new Set<string>();
  const normalized = users
    .filter((user) => {
      const key = user.name.trim();

      if (!key || seenNames.has(key)) {
        return false;
      }

      seenNames.add(key);
      return true;
    })
    .map((user, index) => ({
      ...user,
      id: user.id || createUserId(index),
      evidence: uniqueNonEmpty(user.evidence)
    }))
    .sort(
      (left, right) =>
        userTypeOrder.indexOf(left.userType) - userTypeOrder.indexOf(right.userType)
    );

  const coreUsers = normalized.filter((user) => user.userType === "core_user");

  if (coreUsers.length > 2) {
    let coreCount = 0;

    return normalized.map((user) => {
      if (user.userType !== "core_user") {
        return user;
      }

      coreCount += 1;

      return coreCount <= 2
        ? user
        : {
            ...user,
            userType: "secondary_user"
          };
    });
  }

  return normalized;
};

const extractTargetUserIdentification = (
  llmOutput: string,
  fallback: TargetUserIdentificationResult
): TargetUserIdentificationResult => {
  const parsed = extractJsonFromText(llmOutput);

  if (!parsed) {
    return fallback;
  }

  try {
    const result = TargetUserIdentificationSchema.parse(parsed);

    return {
      ...result,
      targetUsers: normalizeTargetUsers(result.targetUsers),
      missingInfoPrompt:
        result.status === "needs_more_info"
          ? result.missingInfoPrompt ?? missingInfoPrompt
          : result.missingInfoPrompt
    };
  } catch {
    return fallback;
  }
};

const toLegacyUserContext = (
  result: TargetUserIdentificationResult,
  input: ProductIdeaInput
) => {
  const coreUser =
    result.targetUsers.find((user) => user.userType === "core_user") ??
    result.targetUsers[0];
  const confidence = coreUser?.confidence ?? "low";

  return {
    step: "user_identification",
    raw_idea_summary: input.idea,
    explicit_user_info: {
      mentioned_users: result.targetUsers
        .filter((user) => user.evidenceType === "keyword")
        .map((user) => user.name),
      mentioned_customers: result.targetUsers
        .filter((user) => user.userType === "decision_maker")
        .map((user) => user.name),
      mentioned_beneficiaries: result.targetUsers.map((user) => user.name),
      confidence
    },
    inferred_user_segments: result.targetUsers.map((user) => ({
      segment_name: user.name,
      user_identity: user.name,
      current_stage: "待由后续步骤继续判断",
      main_goal: user.description,
      current_difficulty: "待由后续步骤继续判断",
      motivation: user.description,
      inference_basis: user.evidence.join("；"),
      confidence: user.confidence,
      mvp_priority: user.userType === "core_user" ? "high" : "medium"
    })),
    recommended_core_user: {
      segment_name: coreUser?.name ?? "待补充目标用户",
      definition: coreUser?.description ?? missingInfoPrompt,
      reason: coreUser?.evidence.join("；") ?? missingInfoPrompt,
      risk:
        result.status === "needs_more_info"
          ? missingInfoPrompt
          : "仍需在后续步骤验证使用场景和任务频率"
    },
    role_mapping: {
      user: coreUser?.name ?? "待补充",
      buyer:
        result.targetUsers.find((user) => user.userType === "decision_maker")
          ?.name ?? coreUser?.name ?? "待补充",
      decision_maker:
        result.targetUsers.find((user) => user.userType === "decision_maker")
          ?.name ?? coreUser?.name ?? "待补充",
      beneficiary: coreUser?.name ?? "待补充"
    },
    user_definition_risks:
      result.status === "needs_more_info"
        ? [missingInfoPrompt]
        : ["仍需验证核心用户是否足够具体", "仍需验证使用者和付费决策者是否一致"],
    clarifying_questions: [
      "这个产品主要给谁用？",
      "谁会最高频地使用它？",
      "谁会决定是否付费或采购？"
    ],
    ready_for_next_step: result.status === "completed",
    next_step: "usage_scenario_analysis"
  };
};

const buildProductContext = (
  result: TargetUserIdentificationResult,
  input: ProductIdeaInput
): ProductContext => {
  const targetUsers = result.targetUsers
    .filter((user) => user.userType === "core_user")
    .map((user) => user.name);
  const coreUser = result.targetUsers.find((user) => user.userType === "core_user");
  const legacyContext = toLegacyUserContext(result, input);

  return {
    summary: input.idea,
    targetUsers: targetUsers.length > 0 ? targetUsers : ["待补充目标用户"],
    coreProblem:
      coreUser?.description ?? "当前想法中缺少明确的用户信息，需要先补充用户对象",
    valueProposition:
      coreUser?.evidence.join("；") ?? "需要先明确目标用户，再继续后续分析",
    assumptions: uniqueNonEmpty([
      `Step2目标用户识别：${JSON.stringify(result)}`,
      `用户识别结构化上下文：${JSON.stringify(legacyContext)}`,
      ...result.targetUsers.map(
        (user) =>
          `目标用户：${user.name}｜${user.userType}｜${user.evidenceType}｜${user.confidence}`
      )
    ])
  };
};

export async function inputParserNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "inputParserNode",
    traceStage: "product_context",
    input: state.input,
    execute: async () => {
      const fallbackResult = createFallbackTargetUsers(state.input);
      const llmOutput =
        state.input.idea.trim().length < 8
          ? ""
          : await completeWithPrompt(
              deps,
              state,
              "target_user_identification",
              inputParserPrompt.buildPrompt(state.input)
            );
      const targetUserIdentification = llmOutput
        ? extractTargetUserIdentification(llmOutput, fallbackResult)
        : fallbackResult;
      const context = buildProductContext(targetUserIdentification, state.input);

      return {
        context,
        targetUserIdentification
      };
    }
  });
}
