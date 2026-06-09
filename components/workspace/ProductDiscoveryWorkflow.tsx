"use client";

import { useMemo, useState } from "react";
import type {
  AgentState,
  CompetitorIdentificationItem,
  DiscoveryClarificationQuestion,
  ProductPersonaItem,
  ProductDiscoveryProfile,
  TargetUser
} from "@/packages/shared/types";

type ProductDiscoveryWorkflowProps = {
  projectId: string;
  state: AgentState;
  onStateChange: (state: AgentState) => void;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

type SubmitAnswersResponse = {
  state: AgentState;
};

type ContinueDiscoveryResponse = {
  state: AgentState;
};

type SupplementalResearchResponse = {
  state: AgentState;
};

const userTypeLabels: Record<TargetUser["userType"], string> = {
  core_user: "核心用户",
  secondary_user: "次级用户",
  influencer: "影响者",
  decision_maker: "付费/决策者"
};

const confidenceLabels: Record<TargetUser["confidence"], string> = {
  high: "置信度高",
  medium: "置信度中",
  low: "置信度低"
};

const sourceLabels: Record<string, string> = {
  user_input: "来自用户输入",
  keyword: "来自原始想法关键词",
  scenario_inference: "来自场景推断",
  task_inference: "来自任务推断",
  business_inference: "来自商业关系推断",
  agent_inference: "来自 Agent 推断",
  user_confirmed: "来自用户确认"
};

const alternativeTypeLabels: Record<string, string> = {
  manual: "手动方法",
  template: "模板",
  general_ai: "通用 AI",
  platform_feature: "平台功能",
  consultant: "人工顾问",
  indirect_tool: "间接工具"
};

const painScoreLabels: Record<string, string> = {
  importance: "重要性",
  frequency: "频率",
  urgency: "紧急度",
  currentSolutionGap: "现有方案缺口",
  consequence: "后果影响",
  willingnessToUse: "使用意愿"
};

const categoryLabels: Record<string, string> = {
  target_user: "目标用户",
  scenario: "使用场景",
  real_problem: "真实问题",
  alternative: "替代方案",
  pain_strength: "痛点强度",
  input_interaction: "输入与交互",
  generation_requirement: "生成要求",
  privacy_security: "隐私安全",
  technical_integration: "技术集成",
  operation_commercialization: "运营商业化",
  compatibility_extension: "兼容扩展",
  risk_boundary: "风险边界",
  mvp_scope: "MVP 范围",
  evaluation_metric: "评估指标"
};

const depthLabels: Record<string, string> = {
  discovery_basic: "基础产品发现",
  requirement_deepening: "需求落地澄清",
  implementation_decision: "实现决策澄清"
};

const answerTypeLabels: Record<string, string> = {
  text: "文本回答",
  single_choice: "单选",
  multiple_choice: "多选"
};

const priorityLabels: Record<string, string> = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级"
};

const marketDemandTypeLabels: Record<string, string> = {
  core: "核心需求",
  secondary: "次级需求",
  latent: "潜在需求"
};

const marketDemandSourceLabels: Record<string, string> = {
  target_user: "目标用户",
  real_problem: "真实问题",
  alternative_solution: "替代方案",
  pain_strength: "痛点强度",
  user_answer: "用户回答",
  research_plan: "研究计划"
};

const opportunityLevelLabels: Record<string, string> = {
  high: "高机会",
  medium: "中机会",
  low: "低机会"
};

const competitorRelationLabels: Record<
  CompetitorIdentificationItem["relation"],
  string
> = {
  direct_competitor: "直接竞品",
  indirect_competitor: "间接竞品",
  substitute_solution: "替代方案"
};

const verificationStatusLabels: Record<
  CompetitorIdentificationItem["verificationStatus"],
  string
> = {
  verified: "已验证",
  inferred: "分析推断",
  needs_validation: "待验证"
};

const personalizationCapabilityLabels: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
  unknown: "待验证"
};

const mvpFeaturePriorityLabels: Record<string, string> = {
  must_have: "必须有",
  should_have: "应该有",
  could_have: "可选"
};

const stepLabels = [
  { id: "raw", title: "原始想法" },
  { id: "targetUser", title: "目标用户识别" },
  { id: "scenarioProblem", title: "场景与问题识别" },
  { id: "questions", title: "需求澄清问题" },
  { id: "answers", title: "用户回答收集" },
  { id: "revision", title: "产品发现结果修正" },
  { id: "researchPlan", title: "研究计划生成" },
  { id: "marketAnalysis", title: "行业与市场初步分析" },
  { id: "competitorIdentification", title: "竞品识别与分析" },
  { id: "competitorTable", title: "竞品分析表" },
  { id: "userPersonas", title: "用户画像生成" },
  { id: "mvpPrd", title: "MVP PRD 生成" },
  { id: "supplementalResearch", title: "多轮补充研究" }
] as const;

type StepId = (typeof stepLabels)[number]["id"];

function getStepStatus(profile: ProductDiscoveryProfile | null, stepId: StepId) {
  if (!profile) {
    return stepId === "raw" ? "已完成" : "未开始";
  }

  switch (stepId) {
    case "raw":
    case "targetUser":
      return "已完成";
    case "scenarioProblem":
      return profile.step3Analysis ? "已完成" : "未开始";
    case "questions":
      return profile.step4Clarification ? "已完成" : "未开始";
    case "answers":
      if (!profile.step4Clarification) {
        return "未开始";
      }

      return profile.userAnswers.length > 0 ? "已完成" : "需要输入";
    case "revision":
      return profile.revisionSummary.length > 0 ? "已完成" : "未开始";
    case "researchPlan":
      return profile.step7ResearchPlan || profile.researchPlan ? "已完成" : "未开始";
    case "marketAnalysis":
      return profile.step8MarketAnalysis ? "已完成" : "未开始";
    case "competitorIdentification":
      return profile.step9CompetitorIdentification ? "已完成" : "未开始";
    case "competitorTable":
      return profile.step10CompetitorAnalysisTable ? "已完成" : "未开始";
    case "userPersonas":
      return profile.step11UserPersonas ? "已完成" : "未开始";
    case "mvpPrd":
      return profile.step12MvpPrd ? "已完成" : "未开始";
    case "supplementalResearch":
      return profile.supplementalResearch?.rounds.length
        ? `${profile.supplementalResearch.rounds.length}/2 轮`
        : "可选";
    default:
      return "未开始";
  }
}

function getLatestStepId(profile: ProductDiscoveryProfile | null): StepId {
  if (!profile) {
    return "raw";
  }

  if (profile.step12MvpPrd) {
    return "mvpPrd";
  }

  if (profile.step11UserPersonas) {
    return "userPersonas";
  }

  if (profile.step10CompetitorAnalysisTable) {
    return "competitorTable";
  }

  if (profile.step9CompetitorIdentification) {
    return "competitorIdentification";
  }

  if (profile.step8MarketAnalysis) {
    return "marketAnalysis";
  }

  if (profile.step7ResearchPlan || profile.researchPlan) {
    return "researchPlan";
  }

  if (profile.revisionSummary.length > 0) {
    return "revision";
  }

  if (profile.clarificationQuestions.length > 0) {
    return "answers";
  }

  if (profile.step4Clarification) {
    return "questions";
  }

  if (profile.step3Analysis) {
    return "scenarioProblem";
  }

  return "targetUser";
}

function getNextActionLabel(profile: ProductDiscoveryProfile | null): string | null {
  if (!profile) {
    return null;
  }

  if (!profile.step3Analysis) {
    return "运行 Step3：场景与问题识别";
  }

  if (!profile.step4Clarification) {
    return "运行 Step4：需求澄清问题";
  }

  if (profile.clarificationQuestions.length > 0 && profile.userAnswers.length === 0) {
    return null;
  }

  if (!profile.step7ResearchPlan) {
    return "运行 Step7：研究计划生成";
  }

  if (!profile.step8MarketAnalysis) {
    return "运行 Step8：行业与市场初步分析";
  }

  if (!profile.step9CompetitorIdentification) {
    return "运行 Step9：竞品识别与分析";
  }

  if (!profile.step10CompetitorAnalysisTable) {
    return "运行 Step10：竞品分析表";
  }

  if (!profile.step11UserPersonas) {
    return "运行 Step11：用户画像生成";
  }

  if (!profile.step12MvpPrd) {
    return "运行 Step12：MVP PRD 生成";
  }

  return null;
}

function canRunSupplementalResearch(profile: ProductDiscoveryProfile | null): boolean {
  if (!profile?.step7ResearchPlan) {
    return false;
  }

  return (profile.supplementalResearch?.rounds.length ?? 0) < 2;
}

function SectionCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
      {text}
    </div>
  );
}

function TargetUserCard({ user }: { user: TargetUser }) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-neutral-950">{user.name}</h3>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
          {userTypeLabels[user.userType]}
        </span>
        <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
          {confidenceLabels[user.confidence]}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-neutral-700">{user.description}</p>
      <div className="mt-4">
        <p className="text-xs font-medium text-neutral-500">判断依据</p>
        <ul className="mt-2 grid gap-1 text-sm text-neutral-700">
          {user.evidence.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-neutral-500">
          依据来源：{sourceLabels[user.evidenceType]}
        </p>
      </div>
    </article>
  );
}

function CompetitorIdentificationCard({
  competitor
}: {
  competitor: CompetitorIdentificationItem;
}) {
  return (
    <article className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-neutral-950">{competitor.name}</h4>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
          {competitorRelationLabels[competitor.relation]}
        </span>
        <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
          {verificationStatusLabels[competitor.verificationStatus]}
        </span>
        <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
          {confidenceLabels[competitor.confidence]}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-neutral-700">
        {competitor.positioning}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-neutral-500">核心能力</p>
          <ul className="mt-1 grid gap-1 text-sm text-neutral-700">
            {competitor.coreCapabilities.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500">目标用户</p>
          <p className="mt-1 text-sm text-neutral-700">
            {competitor.targetUsers.join("、")}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500">优势</p>
          <ul className="mt-1 grid gap-1 text-sm text-neutral-700">
            {competitor.strengths.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500">劣势</p>
          <ul className="mt-1 grid gap-1 text-sm text-neutral-700">
            {competitor.weaknesses.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-3 rounded bg-white p-3 text-sm text-neutral-600">
        <p>
          <span className="font-medium text-neutral-900">分类依据：</span>
          {competitor.relationReason}
        </p>
        <p className="mt-2">
          <span className="font-medium text-neutral-900">与本产品差异：</span>
          {competitor.differenceFromProduct}
        </p>
      </div>
      <ul className="mt-3 grid gap-1 text-xs text-neutral-500">
        {competitor.evidence.map((item) => (
          <li key={item}>判断依据：{item}</li>
        ))}
      </ul>
      {competitor.sourceUrl ? (
        <a
          href={competitor.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-xs font-medium text-blue-700 hover:text-blue-900"
        >
          查看来源
        </a>
      ) : null}
    </article>
  );
}

function PersonaCard({ persona }: { persona: ProductPersonaItem }) {
  const renderList = (title: string, items: string[]) => (
    <div>
      <p className="text-xs font-medium text-neutral-500">{title}</p>
      <ul className="mt-2 grid gap-1 text-sm leading-6 text-neutral-700">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <article className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-blue-700">{persona.segment}</p>
          <h3 className="mt-1 text-base font-semibold text-neutral-950">
            {persona.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            {persona.role}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
          {confidenceLabels[persona.confidence]}
        </span>
      </div>
      <p className="mt-4 rounded-md bg-white p-3 text-sm leading-6 text-neutral-700">
        {persona.profile}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {renderList("使用场景", persona.scenarios)}
        {renderList("关键痛点", persona.painPoints)}
        {renderList("目标", persona.goals)}
        {renderList("使用动机", persona.motivations)}
        {renderList("典型行为", persona.behaviors)}
        {renderList("偏好渠道", persona.preferredChannels)}
        {renderList("决策因素", persona.decisionFactors)}
        {renderList("判断依据", persona.evidence)}
      </div>
      {persona.assumptions.length ? (
        <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-800">待验证假设</p>
          <ul className="mt-2 grid gap-1 text-sm leading-6 text-amber-900">
            {persona.assumptions.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function QuestionInput({
  question,
  value,
  onChange
}: {
  question: DiscoveryClarificationQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputType = question.answerType ?? question.inputType;

  if ((inputType === "single_choice" || inputType === "multiple_choice") && question.options?.length) {
    return (
      <fieldset className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-4">
        <legend className="text-sm font-medium text-neutral-950">
          {question.question}
        </legend>
        <p className="text-xs text-neutral-500">{question.reason}</p>
        <div className="mt-1 grid gap-2">
          {question.options.map((option) => {
            const values = value ? value.split("|||") : [];
            const checked = values.includes(option);

            return (
              <label
                key={option}
                className="flex items-center gap-2 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
              >
                <input
                  type={inputType === "single_choice" ? "radio" : "checkbox"}
                  name={question.id}
                  checked={checked}
                  onChange={(event) => {
                    if (inputType === "single_choice") {
                      onChange(option);
                      return;
                    }

                    const nextValues = event.target.checked
                      ? [...values, option]
                      : values.filter((item) => item !== option);

                    onChange(nextValues.join("|||"));
                  }}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <label className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-4">
      <span className="text-sm font-medium text-neutral-950">{question.question}</span>
      <span className="text-xs text-neutral-500">{question.reason}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-1 resize-none rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        placeholder="请输入你的补充信息"
      />
    </label>
  );
}

function useInitialStep(profile: ProductDiscoveryProfile | null): StepId {
  return useMemo(() => {
    return getLatestStepId(profile);
  }, [profile]);
}

export function ProductDiscoveryWorkflow({
  projectId,
  state,
  onStateChange
}: ProductDiscoveryWorkflowProps) {
  const profile = state.productDiscoveryProfile;
  const initialStep = useInitialStep(profile);
  const [activeStep, setActiveStep] = useState<StepId>(initialStep);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isContinuingDiscovery, setIsContinuingDiscovery] = useState(false);
  const [isRunningSupplementalResearch, setIsRunningSupplementalResearch] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueDiscovery = async () => {
    if (!profile) {
      setError("产品发现上下文缺失，请重新运行。");
      return;
    }

    setIsContinuingDiscovery(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/step", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId,
          state
        })
      });
      const payload = (await response.json()) as ApiResponse<ContinueDiscoveryResponse>;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "继续分析失败");
      }

      const nextProfile = payload.data.state.productDiscoveryProfile;

      onStateChange(payload.data.state);
      setActiveStep(getLatestStepId(nextProfile ?? null));
    } catch {
      setError("继续分析失败，请稍后重试。");
    } finally {
      setIsContinuingDiscovery(false);
    }
  };

  const submitAnswers = async () => {
    if (!profile) {
      setError("产品发现上下文缺失，请重新运行。");
      return;
    }

    const normalizedAnswers = profile.clarificationQuestions
      .map((question) => ({
        questionId: question.id,
        answer:
          (answers[question.id]?.includes("|||")
            ? answers[question.id].split("|||").filter(Boolean)
            : answers[question.id]?.trim()) ?? ""
      }))
      .filter((answer) =>
        Array.isArray(answer.answer)
          ? answer.answer.length > 0
          : answer.answer.length > 0
      );

    if (normalizedAnswers.length === 0) {
      setError("请至少回答一个澄清问题。");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/step", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId,
          state,
          answers: normalizedAnswers
        })
      });
      const payload = (await response.json()) as ApiResponse<SubmitAnswersResponse>;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "提交回答失败");
      }

      onStateChange(payload.data.state);
      setActiveStep(getLatestStepId(payload.data.state.productDiscoveryProfile));
    } catch {
      setError("提交回答失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const runSupplementalResearch = async () => {
    if (!profile) {
      setError("产品发现上下文缺失，请重新运行。");
      return;
    }

    setIsRunningSupplementalResearch(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/supplemental-research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId,
          state
        })
      });
      const payload = (await response.json()) as ApiResponse<SupplementalResearchResponse>;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "补充研究失败");
      }

      onStateChange(payload.data.state);
      setActiveStep("supplementalResearch");
    } catch {
      setError("补充研究失败，请稍后重试。");
    } finally {
      setIsRunningSupplementalResearch(false);
    }
  };

  const currentProfile = state.productDiscoveryProfile;
  const step3Analysis = currentProfile?.step3Analysis;
  const step7Plan = currentProfile?.step7ResearchPlan?.researchPlan;
  const step8Analysis = currentProfile?.step8MarketAnalysis?.marketAnalysis;
  const step9Identification =
    currentProfile?.step9CompetitorIdentification?.competitorIdentification;
  const step10Table =
    currentProfile?.step10CompetitorAnalysisTable?.competitorAnalysisTable;
  const step11Personas = currentProfile?.step11UserPersonas?.userPersonas;
  const step12Prd = currentProfile?.step12MvpPrd?.mvpPrd;
  const nextActionLabel = getNextActionLabel(currentProfile ?? null);
  const supplementalResearch = currentProfile?.supplementalResearch;
  const supplementalResearchAvailable = canRunSupplementalResearch(
    currentProfile ?? null
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[14rem_1fr]">
      <aside className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
          Discovery
        </p>
        <nav className="mt-4 grid gap-1">
          {stepLabels.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={
                activeStep === step.id
                  ? "rounded-md bg-neutral-950 px-3 py-2 text-left text-sm font-medium text-white"
                  : "rounded-md px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
              }
            >
              <span className="mr-2 text-xs opacity-70">
                {String(index + 1).padStart(2, "0")}
              </span>
              {step.title}
              <span className="mt-1 block text-xs opacity-70">
                {getStepStatus(currentProfile, step.id)}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="grid gap-5">
        {activeStep === "raw" ? (
          <SectionCard title="Step1：原始想法">
            <p className="rounded-lg bg-neutral-50 p-4 text-sm leading-6 text-neutral-800">
              {state.input.idea}
            </p>
          </SectionCard>
        ) : null}

        {activeStep === "targetUser" ? (
          <SectionCard title="Step2：目标用户识别">
            <p className="mb-4 text-sm text-neutral-500">
              AI 将根据你的产品想法，识别最可能使用该产品的人群，并说明判断依据。
            </p>
            {state.targetUserIdentification?.targetUsers.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {state.targetUserIdentification.targetUsers.map((user) => (
                  <TargetUserCard key={user.id} user={user} />
                ))}
              </div>
            ) : (
              <EmptyState text="当前想法中缺少明确的用户信息，请补充：这个产品主要给谁用？" />
            )}
            {!currentProfile?.step3Analysis ? (
              <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-blue-900">
                  目标用户识别已完成。下一步将分析使用场景、真实问题、替代方案和需要澄清的问题。
                </p>
                {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
                <button
                  type="button"
                  onClick={continueDiscovery}
                  disabled={isContinuingDiscovery}
                  className="mt-4 h-11 rounded-md bg-blue-700 px-5 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isContinuingDiscovery
                    ? "正在分析场景与问题..."
                    : "运行 Step3：场景与问题识别"}
                </button>
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {activeStep === "scenarioProblem" ? (
          <SectionCard title="Step3：场景与问题识别">
            {currentProfile?.step3Analysis ? (
              <div className="grid gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">使用场景</h3>
                  <div className="mt-2 grid gap-2">
                    {currentProfile.scenarios.value.map((scenario) => (
                      <div key={scenario.id} className="rounded-md bg-neutral-50 p-3">
                        <p className="text-sm font-medium text-neutral-900">
                          {scenario.name}
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                          {scenario.trigger} · {scenario.userTask}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {step3Analysis ? (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-950">
                        产品边界
                      </h3>
                      <div className="mt-2 rounded-md bg-neutral-50 p-4">
                        <p className="text-sm font-medium text-neutral-900">
                          {step3Analysis.productBoundary.coreTask}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {step3Analysis.productBoundary.boundaryReason}
                        </p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-medium text-neutral-500">
                              范围内
                            </p>
                            <ul className="mt-1 grid gap-1 text-sm text-neutral-700">
                              {step3Analysis.productBoundary.inScope.map((item) => (
                                <li key={item}>· {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-neutral-500">
                              已过滤
                            </p>
                            <ul className="mt-1 grid gap-1 text-sm text-neutral-700">
                              {step3Analysis.productBoundary.outOfScope.map((item) => (
                                <li key={item}>· {item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-neutral-950">
                        真实问题
                      </h3>
                      <div className="mt-2 grid gap-3">
                        {step3Analysis.realProblems.map((problem) => (
                          <article
                            key={problem.id}
                            className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-neutral-900">
                                {problem.title}
                              </p>
                              <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                                {confidenceLabels[problem.confidence]}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-neutral-700">
                              {problem.description}
                            </p>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <p className="text-sm text-neutral-600">
                                <span className="font-medium text-neutral-900">
                                  为什么真实：
                                </span>
                                {problem.whyReal}
                              </p>
                              <p className="text-sm text-neutral-600">
                                <span className="font-medium text-neutral-900">
                                  产品能力：
                                </span>
                                {problem.featureImplication}
                              </p>
                            </div>
                            <ul className="mt-3 grid gap-1 text-xs text-neutral-500">
                              {problem.evidence.map((item) => (
                                <li key={item}>判断依据：{item}</li>
                              ))}
                            </ul>
                          </article>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-neutral-950">
                        当前替代方案
                      </h3>
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        {step3Analysis.alternativeSolutions.map((alternative) => (
                          <article
                            key={alternative.id}
                            className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-neutral-900">
                                {alternative.name}
                              </p>
                              <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                                {alternativeTypeLabels[alternative.type]}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-neutral-600">
                              {alternative.description}
                            </p>
                            <p className="mt-2 text-sm text-neutral-600">
                              <span className="font-medium text-neutral-900">
                                当前如何解决：
                              </span>
                              {alternative.howItSolves}
                            </p>
                            <p className="mt-2 text-sm text-neutral-600">
                              <span className="font-medium text-neutral-900">
                                不足：
                              </span>
                              {alternative.weakness}
                            </p>
                            <p className="mt-2 text-sm text-neutral-600">
                              <span className="font-medium text-neutral-900">
                                机会点：
                              </span>
                              {alternative.opportunity}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-neutral-950">
                        痛点强度
                      </h3>
                      <div className="mt-2 rounded-md bg-neutral-50 p-4">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <p className="text-2xl font-semibold text-neutral-950">
                              {step3Analysis.painStrength.level}
                            </p>
                            <p className="mt-1 text-sm text-neutral-500">
                              {step3Analysis.painStrength.totalScore} /{" "}
                              {step3Analysis.painStrength.maxScore}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
                            {confidenceLabels[step3Analysis.painStrength.confidence]}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-2">
                          {Object.entries(step3Analysis.painStrength.score).map(
                            ([key, value]) => (
                              <div key={key} className="grid gap-1">
                                <div className="flex justify-between text-xs text-neutral-500">
                                  <span>{painScoreLabels[key]}</span>
                                  <span>{value}/5</span>
                                </div>
                                <div className="h-2 rounded-full bg-white">
                                  <div
                                    className="h-2 rounded-full bg-blue-600"
                                    style={{ width: `${(value / 5) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )
                          )}
                        </div>
                        <p className="mt-4 text-sm leading-6 text-neutral-700">
                          {step3Analysis.painStrength.reason}
                        </p>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-medium text-neutral-500">
                              关键驱动
                            </p>
                            <ul className="mt-1 grid gap-1 text-sm text-neutral-700">
                              {step3Analysis.painStrength.keyDrivers.map((item) => (
                                <li key={item}>· {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-neutral-500">
                              风险
                            </p>
                            <ul className="mt-1 grid gap-1 text-sm text-neutral-700">
                              {step3Analysis.painStrength.risks.map((item) => (
                                <li key={item}>· {item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState text="请重新运行产品发现流程以生成完整 Step3 分析。" />
                )}
              </div>
            ) : (
              <EmptyState text="场景与问题识别尚未开始。" />
            )}
          </SectionCard>
        ) : null}

        {activeStep === "questions" ? (
          <SectionCard title="Step4：需求澄清问题">
            <p className="mb-4 text-sm text-neutral-500">
              AI 将基于前 3 步结果，生成最关键的需求澄清问题。
            </p>
            {currentProfile?.step4Clarification ? (
              <div className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">
                      上下文完整性
                    </h3>
                    <div className="mt-3 grid gap-2 text-sm text-neutral-700">
                      <p>
                        目标用户：
                        {currentProfile.step4Clarification.completeness
                          .hasClearTargetUsers
                          ? "清楚"
                          : "待澄清"}
                      </p>
                      <p>
                        使用场景：
                        {currentProfile.step4Clarification.completeness
                          .hasClearScenarios
                          ? "清楚"
                          : "待澄清"}
                      </p>
                      <p>
                        真实问题：
                        {currentProfile.step4Clarification.completeness
                          .hasClearRealProblems
                          ? "清楚"
                          : "待澄清"}
                      </p>
                      <p>
                        替代方案：
                        {currentProfile.step4Clarification.completeness
                          .hasClearAlternatives
                          ? "清楚"
                          : "待澄清"}
                      </p>
                      <p>
                        痛点强度：
                        {currentProfile.step4Clarification.completeness
                          .hasClearPainStrength
                          ? "清楚"
                          : "待澄清"}
                      </p>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-neutral-500">
                      {currentProfile.step4Clarification.completeness.reason}
                    </p>
                  </div>
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">
                      澄清深度
                    </h3>
                    <p className="mt-3 text-2xl font-semibold text-neutral-950">
                      {depthLabels[currentProfile.step4Clarification.depth]}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-neutral-600">
                      {currentProfile.step4Clarification.questionPlan.reason}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {currentProfile.step4Clarification.questionPlan.categories.map(
                        (category) => (
                          <span
                            key={category}
                            className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600"
                          >
                            {categoryLabels[category]}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {currentProfile.step4Clarification.questions.map((question) => (
                    <article
                      key={question.id}
                      className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          {categoryLabels[question.category]}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                          {priorityLabels[question.priority]}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                          {answerTypeLabels[question.answerType]}
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-neutral-950">
                        {question.question}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {question.reason}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {question.affects.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600"
                          >
                            影响：{item}
                          </span>
                        ))}
                      </div>
                      {question.options?.length ? (
                        <ul className="mt-3 grid gap-1 text-xs text-neutral-500 md:grid-cols-2">
                          {question.options.map((option) => (
                            <li key={option}>· {option}</li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState text="当前没有需要补充的澄清问题。" />
            )}
          </SectionCard>
        ) : null}

        {activeStep === "answers" ? (
          <SectionCard title="Step5：用户回答收集">
            {currentProfile?.userAnswers.length ? (
              <div className="grid gap-2">
                {currentProfile.userAnswers.map((answer) => (
                  <div key={answer.questionId} className="rounded-md bg-neutral-50 p-3">
                    <p className="text-sm font-medium text-neutral-900">
                      {currentProfile.clarificationQuestions.find(
                        (question) => question.id === answer.questionId
                      )?.question ?? answer.questionId}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {Array.isArray(answer.answer)
                        ? answer.answer.join("；")
                        : answer.answer}
                    </p>
                  </div>
                ))}
              </div>
            ) : currentProfile?.clarificationQuestions.length ? (
              <div className="grid gap-4">
                {currentProfile.clarificationQuestions.map((question) => (
                  <QuestionInput
                    key={question.id}
                    question={question}
                    value={answers[question.id] ?? ""}
                    onChange={(value) =>
                      setAnswers((previous) => ({
                        ...previous,
                        [question.id]: value
                      }))
                    }
                  />
                ))}
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <button
                  type="button"
                  onClick={submitAnswers}
                  disabled={isSubmitting}
                  className="h-11 w-fit rounded-md bg-neutral-950 px-5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "正在提交回答..." : "提交回答并修正发现结果"}
                </button>
              </div>
            ) : (
              <EmptyState text="暂无需要回答的问题。" />
            )}
          </SectionCard>
        ) : null}

        {activeStep === "revision" ? (
          <SectionCard title="Step6：产品发现结果修正">
            {currentProfile?.revisionSummary.length ? (
              <ul className="grid gap-2 text-sm text-neutral-700">
                {currentProfile.revisionSummary.map((item) => (
                  <li key={item} className="rounded-md bg-neutral-50 p-3">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState text="等待用户回答后修正产品发现结果。" />
            )}
          </SectionCard>
        ) : null}

        {activeStep === "researchPlan" ? (
          <SectionCard title="Step7：研究计划生成">
            <p className="mb-4 text-sm text-neutral-500">
              基于已确认的产品发现结果，生成后续用户研究、竞品分析和 MVP 验证计划。
            </p>
            {step7Plan ? (
              <div className="grid gap-5">
                <div className="rounded-md bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-950">
                        {step7Plan.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {step7Plan.summary}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
                      {confidenceLabels[step7Plan.confidence]}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-neutral-500">
                        核心用户
                      </p>
                      <p className="mt-1 text-sm text-neutral-700">
                        {step7Plan.context.coreUsers.join("、")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-neutral-500">
                        核心场景
                      </p>
                      <p className="mt-1 text-sm text-neutral-700">
                        {step7Plan.context.coreScenario}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-neutral-500">
                        痛点强度
                      </p>
                      <p className="mt-1 text-sm text-neutral-700">
                        {step7Plan.context.painLevel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-neutral-500">
                        研究重点
                      </p>
                      <p className="mt-1 text-sm text-neutral-700">
                        {step7Plan.context.researchFocus.join("、")}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    研究目标
                  </h3>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {step7Plan.goals.map((goal) => (
                      <article
                        key={goal.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                            {priorityLabels[goal.priority]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-neutral-950">
                          {goal.goal}
                        </p>
                        <p className="mt-2 text-sm text-neutral-600">{goal.reason}</p>
                        <p className="mt-2 text-xs text-neutral-500">
                          决策：{goal.relatedDecision}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    核心研究问题
                  </h3>
                  <div className="mt-2 grid gap-3">
                    {step7Plan.keyQuestions.map((question) => (
                      <article
                        key={question.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                            {question.category}
                          </span>
                          <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                            {priorityLabels[question.priority]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-neutral-950">
                          {question.question}
                        </p>
                        <p className="mt-2 text-sm text-neutral-600">
                          {question.whyImportant}
                        </p>
                        <p className="mt-2 text-xs text-neutral-500">
                          预期洞察：{question.expectedInsight}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    研究方法
                  </h3>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {step7Plan.methods.map((method) => (
                      <article
                        key={method.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <p className="text-sm font-semibold text-neutral-950">
                          {method.method}
                        </p>
                        <p className="mt-2 text-sm text-neutral-600">
                          {method.purpose}
                        </p>
                        <p className="mt-2 text-xs text-neutral-500">
                          样本：{method.sampleSize ?? "待定"} · 参与者：
                          {method.targetParticipants ?? "待定"}
                        </p>
                        <ul className="mt-3 grid gap-1 text-sm text-neutral-700">
                          {method.executionSteps.map((step) => (
                            <li key={step}>· {step}</li>
                          ))}
                        </ul>
                        <p className="mt-3 text-xs text-neutral-500">
                          输出：{method.expectedOutput}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    时间计划与分工
                  </h3>
                  <div className="mt-2 overflow-hidden rounded-md border border-neutral-200">
                    <table className="w-full border-collapse bg-white text-sm">
                      <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
                        <tr>
                          <th className="px-3 py-2">阶段</th>
                          <th className="px-3 py-2">任务</th>
                          <th className="px-3 py-2">时长</th>
                          <th className="px-3 py-2">负责人</th>
                          <th className="px-3 py-2">输出</th>
                        </tr>
                      </thead>
                      <tbody>
                        {step7Plan.timeline.map((item) => (
                          <tr key={item.id} className="border-t border-neutral-100">
                            <td className="px-3 py-2 text-neutral-900">
                              {item.phase}
                            </td>
                            <td className="px-3 py-2 text-neutral-600">
                              {item.task}
                            </td>
                            <td className="px-3 py-2 text-neutral-600">
                              {item.duration}
                            </td>
                            <td className="px-3 py-2 text-neutral-600">
                              {item.owner}
                            </td>
                            <td className="px-3 py-2 text-neutral-600">
                              {item.output}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-950">
                      主要交付物
                    </h3>
                    <div className="mt-2 grid gap-2">
                      {step7Plan.deliverables.map((deliverable) => (
                        <div
                          key={deliverable.id}
                          className="rounded-md bg-neutral-50 p-3"
                        >
                          <p className="text-sm font-medium text-neutral-950">
                            {deliverable.deliverable}
                          </p>
                          <p className="mt-1 text-sm text-neutral-600">
                            {deliverable.description}
                          </p>
                          <p className="mt-2 text-xs text-neutral-500">
                            用于：{deliverable.usedFor.join("、")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-950">
                      风险与应对
                    </h3>
                    <div className="mt-2 grid gap-2">
                      {step7Plan.risks.map((risk) => (
                        <div key={risk.id} className="rounded-md bg-neutral-50 p-3">
                          <p className="text-sm font-medium text-neutral-950">
                            {risk.risk}
                          </p>
                          <p className="mt-1 text-sm text-neutral-600">
                            影响：{risk.impact}
                          </p>
                          <p className="mt-1 text-sm text-neutral-600">
                            应对：{risk.mitigation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    研究输出用途
                  </h3>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {step7Plan.usages.map((usage) => (
                      <div key={usage.id} className="rounded-md bg-neutral-50 p-3">
                        <p className="text-sm font-medium text-neutral-950">
                          {usage.usage}
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                          {usage.description}
                        </p>
                        <p className="mt-2 text-xs text-neutral-500">
                          后续产物：{usage.downstreamArtifact}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : currentProfile?.researchPlan ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(currentProfile.researchPlan).map(([key, values]) => (
                  <div key={key} className="rounded-md bg-neutral-50 p-3">
                    <h3 className="text-sm font-semibold text-neutral-950">{key}</h3>
                    <ul className="mt-2 grid gap-1 text-sm text-neutral-700">
                      {values.map((value) => (
                        <li key={value}>· {value}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="回答澄清问题后将生成研究计划。" />
            )}
          </SectionCard>
        ) : null}

        {activeStep === "marketAnalysis" ? (
          <SectionCard title="Step8：行业与市场初步分析">
            <p className="mb-4 text-sm text-neutral-500">
              基于产品发现结果和研究计划，初步判断行业背景、目标市场、核心趋势、用户需求和潜在机会。
            </p>
            {step8Analysis ? (
              <div className="grid gap-5">
                <div className="rounded-md bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-950">
                        初步市场判断
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {step8Analysis.summary}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
                      {confidenceLabels[step8Analysis.confidence]}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <article className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">行业背景</h3>
                    <p className="mt-2 text-sm font-medium text-neutral-900">
                      {step8Analysis.industryBackground.industry}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {step8Analysis.industryBackground.subMarket}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-neutral-600">
                      {step8Analysis.industryBackground.backgroundSummary}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <p className="text-xs font-medium text-neutral-500">关键变化</p>
                      <ul className="grid gap-1 text-sm text-neutral-700">
                        {step8Analysis.industryBackground.keyChanges.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="mt-3 text-xs text-neutral-500">
                      与产品相关性：{step8Analysis.industryBackground.relevanceToProduct}
                    </p>
                  </article>

                  <article className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">目标市场</h3>
                    <div className="mt-3 grid gap-3 text-sm">
                      <div>
                        <p className="text-xs font-medium text-neutral-500">主要用户</p>
                        <p className="mt-1 text-neutral-700">
                          {step8Analysis.targetMarket.primaryUsers.join("、")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-500">次级用户</p>
                        <p className="mt-1 text-neutral-700">
                          {step8Analysis.targetMarket.secondaryUsers.join("、")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-500">B 端客户</p>
                        <p className="mt-1 text-neutral-700">
                          {step8Analysis.targetMarket.bSideCustomers.length
                            ? step8Analysis.targetMarket.bSideCustomers.join("、")
                            : "暂不作为优先判断"}
                        </p>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <p className="rounded bg-white p-3 text-neutral-700">
                          初始市场：{step8Analysis.targetMarket.initialMarket}
                        </p>
                        <p className="rounded bg-white p-3 text-neutral-700">
                          扩展市场：{step8Analysis.targetMarket.expansionMarket.join("、")}
                        </p>
                      </div>
                    </div>
                  </article>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">核心趋势</h3>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {step8Analysis.trends.map((trend) => (
                      <article
                        key={trend.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-neutral-950">
                            {trend.trend}
                          </p>
                          <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                            {opportunityLevelLabels[trend.opportunityLevel]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {trend.description}
                        </p>
                        <p className="mt-3 text-xs text-neutral-500">
                          对产品的影响：{trend.impactOnProduct}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          置信度：{confidenceLabels[trend.confidence]}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">用户需求</h3>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {step8Analysis.userDemands.map((demand) => (
                      <article
                        key={demand.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                            {marketDemandTypeLabels[demand.type]}
                          </span>
                          <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                            {priorityLabels[demand.priority]}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-neutral-950">
                          {demand.demand}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {demand.description}
                        </p>
                        <p className="mt-3 text-xs text-neutral-500">
                          来源：{marketDemandSourceLabels[demand.source]}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          产品含义：{demand.productImplication}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">潜在机会</h3>
                  <div className="mt-2 grid gap-3">
                    {step8Analysis.opportunities.map((opportunity) => (
                      <article
                        key={opportunity.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-neutral-950">
                            {opportunity.opportunity}
                          </p>
                          <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                            {priorityLabels[opportunity.priority]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {opportunity.description}
                        </p>
                        <div className="mt-3 grid gap-2 text-sm text-neutral-600 md:grid-cols-2">
                          <p>为什么现在：{opportunity.whyNow}</p>
                          <p>目标人群：{opportunity.targetSegment}</p>
                          <p>产品方向：{opportunity.productDirection}</p>
                          <p>商业潜力：{opportunityLevelLabels[opportunity.businessPotential]}</p>
                        </div>
                        <p className="mt-3 text-xs text-neutral-500">
                          待验证：{opportunity.validationNeeded.join("、")}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    关键假设与待验证项
                  </h3>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {step8Analysis.assumptions.map((assumption) => (
                      <article
                        key={assumption.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                            {priorityLabels[assumption.priority]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-neutral-950">
                          {assumption.assumption}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {assumption.whyImportant}
                        </p>
                        <p className="mt-3 text-xs text-neutral-500">
                          验证方法：{assumption.validationMethod}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          若错误的风险：{assumption.riskIfWrong}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text="完成 Step7 后将生成行业与市场初步分析。" />
            )}
          </SectionCard>
        ) : null}

        {activeStep === "competitorIdentification" ? (
          <SectionCard title="Step9：竞品识别与分析">
            <p className="mb-4 text-sm text-neutral-500">
              根据产品方向识别直接竞品、间接竞品和替代方案，并提炼需要验证的差异化机会。
            </p>
            {step9Identification ? (
              <div className="grid gap-5">
                <div className="rounded-md bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-950">
                        竞品全景判断
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {step9Identification.summary}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
                      {confidenceLabels[step9Identification.confidence]}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">直接竞品</h3>
                  <div className="mt-2 grid gap-3">
                    {step9Identification.directCompetitors.length ? (
                      step9Identification.directCompetitors.map((competitor) => (
                        <CompetitorIdentificationCard
                          key={competitor.id}
                          competitor={competitor}
                        />
                      ))
                    ) : (
                      <EmptyState text="暂未识别到经过验证的直接竞品。" />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">间接竞品</h3>
                  <div className="mt-2 grid gap-3">
                    {step9Identification.indirectCompetitors.length ? (
                      step9Identification.indirectCompetitors.map((competitor) => (
                        <CompetitorIdentificationCard
                          key={competitor.id}
                          competitor={competitor}
                        />
                      ))
                    ) : (
                      <EmptyState text="暂未识别到间接竞品。" />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">替代方案</h3>
                  <div className="mt-2 grid gap-3">
                    {step9Identification.substituteSolutions.length ? (
                      step9Identification.substituteSolutions.map((competitor) => (
                        <CompetitorIdentificationCard
                          key={competitor.id}
                          competitor={competitor}
                        />
                      ))
                    ) : (
                      <EmptyState text="暂未识别到现实替代方案。" />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    差异化机会
                  </h3>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {step9Identification.differentiationOpportunities.map(
                      (opportunity) => (
                        <article
                          key={opportunity.id}
                          className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-neutral-950">
                              {opportunity.opportunity}
                            </p>
                            <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                              {priorityLabels[opportunity.priority]}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-neutral-600">
                            竞品缺口：{opportunity.competitorGap}
                          </p>
                          <p className="mt-2 text-sm text-neutral-600">
                            产品方向：{opportunity.productDirection}
                          </p>
                          <p className="mt-2 text-sm text-neutral-600">
                            用户价值：{opportunity.targetUserValue}
                          </p>
                          <p className="mt-3 text-xs text-neutral-500">
                            待验证：{opportunity.validationNeeded.join("、")}
                          </p>
                        </article>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    后续研究缺口
                  </h3>
                  <ul className="mt-2 grid gap-2 text-sm text-neutral-700">
                    {step9Identification.researchGaps.map((gap) => (
                      <li key={gap} className="rounded-md bg-neutral-50 p-3">
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <EmptyState text="完成 Step8 后将根据产品方向识别竞品与替代方案。" />
            )}
          </SectionCard>
        ) : null}

        {activeStep === "competitorTable" ? (
          <SectionCard title="Step10：竞品分析表">
            <p className="mb-4 text-sm text-neutral-500">
              将已识别竞品按定位、用户、功能、渠道、语言、个性化能力和差异化机会进行横向比较。
            </p>
            {step10Table ? (
              <div className="grid gap-5">
                <div className="rounded-md bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-4xl text-sm leading-6 text-neutral-600">
                      {step10Table.summary}
                    </p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
                      {confidenceLabels[step10Table.confidence]}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-md border border-neutral-200">
                  <table className="min-w-[1500px] border-collapse bg-white text-left text-xs">
                    <thead className="bg-neutral-50 text-neutral-500">
                      <tr>
                        <th className="sticky left-0 z-10 bg-neutral-50 px-3 py-3 font-medium">
                          产品 / 方案
                        </th>
                        <th className="px-3 py-3 font-medium">类型</th>
                        <th className="px-3 py-3 font-medium">产品定位</th>
                        <th className="px-3 py-3 font-medium">目标用户</th>
                        <th className="px-3 py-3 font-medium">核心功能</th>
                        <th className="px-3 py-3 font-medium">适用渠道</th>
                        <th className="px-3 py-3 font-medium">支持语言</th>
                        <th className="px-3 py-3 font-medium">个性化能力</th>
                        <th className="px-3 py-3 font-medium">优势</th>
                        <th className="px-3 py-3 font-medium">劣势</th>
                        <th className="px-3 py-3 font-medium">差异化机会</th>
                        <th className="px-3 py-3 font-medium">典型场景</th>
                        <th className="px-3 py-3 font-medium">验证状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {step10Table.rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-t border-neutral-100 align-top text-neutral-700"
                        >
                          <td className="sticky left-0 z-10 min-w-48 bg-white px-3 py-3">
                            <p className="font-semibold text-neutral-950">{row.name}</p>
                            {row.sourceUrl ? (
                              <a
                                href={row.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex text-blue-700 hover:text-blue-900"
                              >
                                来源
                              </a>
                            ) : null}
                          </td>
                          <td className="min-w-24 px-3 py-3">
                            {competitorRelationLabels[row.relation]}
                          </td>
                          <td className="min-w-64 px-3 py-3 leading-5">
                            {row.positioning}
                          </td>
                          <td className="min-w-48 px-3 py-3 leading-5">
                            {row.targetUsers.join("、") || "待验证"}
                          </td>
                          <td className="min-w-52 px-3 py-3 leading-5">
                            {row.coreFunctions.join("、") || "待验证"}
                          </td>
                          <td className="min-w-40 px-3 py-3 leading-5">
                            {row.channels.join("、") || "待验证"}
                          </td>
                          <td className="min-w-28 px-3 py-3 leading-5">
                            {row.languages.join("、") || "待验证"}
                          </td>
                          <td className="min-w-56 px-3 py-3 leading-5">
                            <span className="font-medium text-neutral-950">
                              {personalizationCapabilityLabels[
                                row.personalizationCapability
                              ]}
                            </span>
                            <p className="mt-1">{row.personalizationDescription}</p>
                          </td>
                          <td className="min-w-56 px-3 py-3 leading-5">
                            {row.strengths.join("；")}
                          </td>
                          <td className="min-w-56 px-3 py-3 leading-5">
                            {row.weaknesses.join("；")}
                          </td>
                          <td className="min-w-64 px-3 py-3 leading-5">
                            {row.differentiationOpportunity}
                          </td>
                          <td className="min-w-48 px-3 py-3 leading-5">
                            {row.typicalScenarios.join("、") || "待验证"}
                          </td>
                          <td className="min-w-28 px-3 py-3">
                            <p>{verificationStatusLabels[row.verificationStatus]}</p>
                            <p className="mt-1 text-neutral-500">
                              {confidenceLabels[row.confidence]}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">关键发现</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-neutral-700">
                      {step10Table.keyFindings.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">建议聚焦</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-neutral-700">
                      {step10Table.recommendedFocus.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">研究缺口</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-neutral-700">
                      {step10Table.researchGaps.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text="完成竞品识别后将生成可横向比较的竞品分析表。" />
            )}
          </SectionCard>
        ) : null}

        {activeStep === "userPersonas" ? (
          <SectionCard title="Step11：用户画像生成">
            <p className="mb-4 text-sm text-neutral-500">
              根据目标用户识别、场景与问题、澄清回答、研究计划和市场竞品上下文，生成可用于后续验证的目标用户画像。
            </p>
            {step11Personas ? (
              <div className="grid gap-5">
                <div className="rounded-md bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-4xl text-sm leading-6 text-neutral-600">
                      {step11Personas.summary}
                    </p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
                      {confidenceLabels[step11Personas.confidence]}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4">
                  {step11Personas.personas.map((persona) => (
                    <PersonaCard key={persona.id} persona={persona} />
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-4">
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">共性痛点</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-neutral-700">
                      {step11Personas.commonPainPoints.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">共性动机</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-neutral-700">
                      {step11Personas.commonMotivations.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">产品启示</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-neutral-700">
                      {step11Personas.productImplications.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">研究缺口</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-neutral-700">
                      {step11Personas.researchGaps.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text="完成竞品分析表后将结合前序发现生成目标用户画像。" />
            )}
          </SectionCard>
        ) : null}

        {activeStep === "mvpPrd" ? (
          <SectionCard title="Step12：MVP PRD 生成">
            <p className="mb-4 text-sm text-neutral-500">
              将前序产品发现结果转化为可开发、可验收的 MVP PRD，覆盖背景、目标、用户、场景、范围、用户故事、流程和验收标准。
            </p>
            {step12Prd ? (
              <div className="grid gap-5">
                <div className="rounded-md bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-950">
                        {step12Prd.productName}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-neutral-600">
                        {step12Prd.background}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
                      {confidenceLabels[step12Prd.confidence]}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">目标</h3>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-neutral-700">
                      {step12Prd.goals.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">用户</h3>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-neutral-700">
                      {step12Prd.targetUsers.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">场景</h3>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-neutral-700">
                      {step12Prd.scenarios.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">功能范围</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {step12Prd.featureScope.map((feature) => (
                      <article
                        key={feature.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-neutral-950">
                            {feature.name}
                          </p>
                          <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                            {mvpFeaturePriorityLabels[feature.priority]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {feature.description}
                        </p>
                        <p className="mt-3 text-xs text-neutral-500">
                          范围理由：{feature.rationale}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-md bg-neutral-50 p-4">
                  <h3 className="text-sm font-semibold text-neutral-950">不做范围</h3>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-neutral-700 md:grid-cols-2">
                    {step12Prd.outOfScope.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">用户故事</h3>
                  <div className="mt-3 grid gap-3">
                    {step12Prd.userStories.map((story) => (
                      <article
                        key={story.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-neutral-950">
                            {story.user}
                          </p>
                          <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                            {priorityLabels[story.priority]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-neutral-700">
                          {story.story}
                        </p>
                        <p className="mt-2 text-sm text-neutral-600">
                          价值：{story.value}
                        </p>
                        <ul className="mt-3 grid gap-1 text-xs leading-5 text-neutral-500">
                          {story.acceptanceCriteria.map((item) => (
                            <li key={item}>验收：{item}</li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">用户流程</h3>
                  <div className="mt-3 grid gap-3">
                    {step12Prd.userFlow.map((flow, index) => (
                      <article
                        key={flow.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="rounded bg-neutral-950 px-2 py-1 text-xs text-white">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <h4 className="text-sm font-semibold text-neutral-950">
                            {flow.stepName}
                          </h4>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm leading-6 text-neutral-600 md:grid-cols-3">
                          <p>用户动作：{flow.userAction}</p>
                          <p>系统响应：{flow.systemResponse}</p>
                          <p>输出：{flow.output}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">验收标准</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {step12Prd.acceptanceCriteria.map((criterion) => (
                      <article
                        key={criterion.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                            {priorityLabels[criterion.priority]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-neutral-700">
                          {criterion.criterion}
                        </p>
                        <p className="mt-3 text-xs text-neutral-500">
                          验证方式：{criterion.verificationMethod}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">成功指标</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-neutral-700">
                      {step12Prd.successMetrics.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">风险</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-neutral-700">
                      {step12Prd.risks.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">待验证假设</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-neutral-700">
                      {step12Prd.assumptions.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text="完成用户画像后将生成结构化 MVP PRD。" />
            )}
          </SectionCard>
        ) : null}

        {activeStep === "supplementalResearch" ? (
          <SectionCard title="多轮补充研究">
            <p className="mb-4 text-sm text-neutral-500">
              当研究缺口、低置信度或待验证假设影响判断时，Agent 会生成补充查询并执行最多 2 轮搜索。
            </p>
            {supplementalResearch?.rounds.length ? (
              <div className="grid gap-5">
                <div className="rounded-md bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-950">
                        已完成 {supplementalResearch.rounds.length} /{" "}
                        {supplementalResearch.maxRounds} 轮
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {supplementalResearch.recommendedAction}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
                      {supplementalResearch.latestStatus}
                    </span>
                  </div>
                </div>

                {supplementalResearch.rounds.map((round) => (
                  <article
                    key={round.id}
                    className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-950">
                          第 {round.round} 轮补充研究
                        </h3>
                        <p className="mt-1 text-sm text-neutral-600">
                          {round.reason}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-xs text-neutral-600">
                        {round.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-neutral-500">
                          搜索查询
                        </p>
                        <ul className="mt-2 grid gap-2 text-sm text-neutral-700">
                          {round.queries.map((query) => (
                            <li key={query.id} className="rounded bg-white p-3">
                              <p className="font-medium text-neutral-900">
                                {query.query}
                              </p>
                              <p className="mt-1 text-xs text-neutral-500">
                                {query.reason} · {query.source}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-500">
                          来源摘要
                        </p>
                        <ul className="mt-2 grid gap-2 text-sm text-neutral-700">
                          {round.sources.slice(0, 6).map((source) => (
                            <li key={source.id} className="rounded bg-white p-3">
                              <p className="font-medium text-neutral-900">
                                {source.title}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-neutral-500">
                                {source.summary}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded bg-white p-3">
                        <p className="text-xs font-medium text-neutral-500">
                          补充发现
                        </p>
                        <ul className="mt-2 grid gap-2 text-sm leading-6 text-neutral-700">
                          {round.findings.map((finding) => (
                            <li key={finding}>• {finding}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded bg-white p-3">
                        <p className="text-xs font-medium text-neutral-500">
                          仍待验证
                        </p>
                        <ul className="mt-2 grid gap-2 text-sm leading-6 text-neutral-700">
                          {round.unresolvedQuestions.map((question) => (
                            <li key={question}>• {question}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="完成研究计划后，可以在信息不足或结论不确定时运行补充研究。" />
            )}
          </SectionCard>
        ) : null}

        {nextActionLabel && activeStep !== "targetUser" ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-950">下一步</p>
                <p className="mt-1 text-sm text-blue-800">
                  当前步骤已完成，你可以手动触发下一个 Agent。
                </p>
              </div>
              <button
                type="button"
                onClick={continueDiscovery}
                disabled={isContinuingDiscovery}
                className="h-11 w-fit rounded-md bg-blue-700 px-5 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isContinuingDiscovery ? "正在运行..." : nextActionLabel}
              </button>
            </div>
            {supplementalResearchAvailable ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-blue-100 pt-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-950">
                    信息不足或结论不确定？
                  </p>
                  <p className="mt-1 text-sm text-blue-800">
                    可运行一轮补充研究，最多 2 轮，不会阻塞主流程。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={runSupplementalResearch}
                  disabled={isRunningSupplementalResearch}
                  className="h-11 w-fit rounded-md border border-blue-200 bg-white px-5 text-sm font-medium text-blue-800 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunningSupplementalResearch
                    ? "正在补充研究..."
                    : `运行补充研究 ${
                        (supplementalResearch?.rounds.length ?? 0) + 1
                      } / 2`}
                </button>
              </div>
            ) : null}
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
