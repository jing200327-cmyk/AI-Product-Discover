"use client";

import { useMemo, useState } from "react";
import type { AgentState } from "@/packages/shared/types";
import { CurrentAlternativeView } from "./CurrentAlternativeView";
import { PainIntensityView } from "./PainIntensityView";
import { ProductContextCard } from "./ProductContextCard";
import { RealProblemView } from "./RealProblemView";
import { UsageScenarioView } from "./UsageScenarioView";
import {
  implementedProductUnderstandingAgentIds,
  productUnderstandingSteps,
  type ProductUnderstandingStepConfig,
  type ProductUnderstandingStepId,
  type ProductUnderstandingStepStatus
} from "./productUnderstandingConfig";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

type RunAgentResponse = {
  state: AgentState;
};

type ProductUnderstandingWorkspaceProps = {
  projectId: string;
  state: AgentState;
  onStateChange: (state: AgentState) => void;
};

type StepRuntimeState = {
  runningStepId: ProductUnderstandingStepId | null;
  failedStepId: ProductUnderstandingStepId | null;
  error: string;
  notice: string;
};

const getStepConfig = (
  stepId: ProductUnderstandingStepId
): ProductUnderstandingStepConfig =>
  productUnderstandingSteps.find((step) => step.id === stepId) ??
  productUnderstandingSteps[0];

const isStepCompleted = (
  step: ProductUnderstandingStepConfig,
  state: AgentState,
  rawIdea: string
): boolean => {
  if (step.id === "raw_idea") {
    return rawIdea.trim().length > 0;
  }

  const result = step.getResult(state);

  if (
    step.id === "user_identification" &&
    typeof result === "object" &&
    result !== null &&
    "status" in result
  ) {
    return (result as { status?: string }).status === "completed";
  }

  return Boolean(result);
};

const buildStepStatuses = (
  state: AgentState,
  rawIdea: string,
  runtime: StepRuntimeState
): Record<ProductUnderstandingStepId, ProductUnderstandingStepStatus> => {
  const statuses = {} as Record<
    ProductUnderstandingStepId,
    ProductUnderstandingStepStatus
  >;

  for (const step of productUnderstandingSteps) {
    if (!step.implemented) {
      statuses[step.id] = "not_implemented";
      continue;
    }

    if (runtime.runningStepId === step.id) {
      statuses[step.id] = "running";
      continue;
    }

    if (runtime.failedStepId === step.id) {
      statuses[step.id] = "failed";
      continue;
    }

    if (isStepCompleted(step, state, rawIdea)) {
      statuses[step.id] = "completed";
      continue;
    }

    const stepResult = step.getResult(state);

    if (
      step.id === "user_identification" &&
      typeof stepResult === "object" &&
      stepResult !== null &&
      "status" in stepResult &&
      (stepResult as { status?: string }).status === "needs_more_info"
    ) {
      statuses[step.id] = "needs_more_info";
      continue;
    }

    const dependenciesCompleted = step.dependencies.every((dependencyId) => {
      const dependency = getStepConfig(dependencyId);
      return isStepCompleted(dependency, state, rawIdea);
    });

    statuses[step.id] = dependenciesCompleted ? "available" : "not_started";
  }

  return statuses;
};

const statusLabels: Record<ProductUnderstandingStepStatus, string> = {
  not_started: "未开始",
  available: "可运行",
  running: "运行中",
  completed: "已完成",
  failed: "失败",
  needs_more_info: "需要补充信息",
  not_implemented: "未实现"
};

const statusClassNames: Record<ProductUnderstandingStepStatus, string> = {
  not_started: "bg-neutral-100 text-neutral-500",
  available: "bg-teal-50 text-teal-800",
  running: "bg-amber-50 text-amber-800",
  completed: "bg-emerald-50 text-emerald-800",
  failed: "bg-red-50 text-red-700",
  needs_more_info: "bg-amber-50 text-amber-900",
  not_implemented: "bg-neutral-100 text-neutral-600"
};

const step2StatusLabels: Record<ProductUnderstandingStepStatus, string> = {
  not_started: "未开始",
  available: "未开始",
  running: "分析中",
  completed: "已完成",
  failed: "需要补充信息",
  needs_more_info: "需要补充信息",
  not_implemented: "未开始"
};

const stringifyJson = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "暂无结构化输出";
  }

  return JSON.stringify(value, null, 2);
};

const buildBrief = (state: AgentState): string => {
  const usage = state.usageScenario;
  const problem = state.realProblem;
  const alternative = state.currentAlternative;
  const pain = state.painIntensity;

  return [
    "# Product Understanding Brief",
    "",
    "## 1. 原始想法",
    state.input.idea,
    "",
    "## 2. 目标用户",
    state.targetUserIdentification
      ? state.targetUserIdentification.targetUsers
          .map(
            (user) =>
              `- ${user.name}：${user.description}（${user.confidence}，${user.evidenceType}）`
          )
          .join("\n")
      : "暂无",
    "",
    "## 3. 使用场景",
    usage?.recommendedPrimaryScenario.scenarioDefinition ?? "暂无",
    "",
    "## 4. 真实问题",
    problem?.recommendedCoreProblem.problemDefinition ?? "暂无",
    "",
    "## 5. 当前替代方案",
    alternative
      ? alternative.alternativeSolutions
          .map((item) => `- ${item.alternativeName}：${item.limitations.join("、")}`)
          .join("\n")
      : "暂无",
    "",
    "## 6. 痛点强度",
    pain
      ? [
          `- 综合得分：${pain.overallPainAssessment.averageScore.toFixed(1)}`,
          `- 痛点等级：${pain.overallPainAssessment.painLevel}`,
          `- MVP 核心痛点：${
            pain.overallPainAssessment.suitableAsMvpCorePain ? "适合" : "不适合"
          }`,
          `- 推荐定义：${pain.mvpValueJudgment.recommendedMvpPainDefinition}`
        ].join("\n")
      : "暂无",
    "",
    "## 7. 目标结果",
    "Agent 尚未实现，等待 TARGET_OUTCOME_AGENT 接入。",
    "",
    "## 8. 产品机会",
    "Agent 尚未实现，等待 PRODUCT_OPPORTUNITY_AGENT 接入。",
    "",
    "## 9. 核心假设",
    "Agent 尚未实现，等待 CORE_HYPOTHESIS_AGENT 接入。",
    "",
    "## 10. 最小可验证方案",
    "Agent 尚未实现，等待 MVP_PLAN_AGENT 接入。"
  ].join("\n");
};

const renderStepResult = (
  stepId: ProductUnderstandingStepId,
  state: AgentState
) => {
  switch (stepId) {
    case "user_identification":
      return <ProductContextCard result={state.targetUserIdentification} />;
    case "usage_scenario":
      return <UsageScenarioView usageScenario={state.usageScenario} />;
    case "real_problem":
      return <RealProblemView realProblem={state.realProblem} />;
    case "current_alternative":
      return <CurrentAlternativeView currentAlternative={state.currentAlternative} />;
    case "pain_intensity":
      return <PainIntensityView painIntensity={state.painIntensity} />;
    default:
      return null;
  }
};

export function ProductUnderstandingWorkspace({
  projectId,
  state,
  onStateChange
}: ProductUnderstandingWorkspaceProps) {
  const [activeStepId, setActiveStepId] =
    useState<ProductUnderstandingStepId>("raw_idea");
  const [rawIdea, setRawIdea] = useState(state.input.idea);
  const [extraContext, setExtraContext] = useState("");
  const [runtime, setRuntime] = useState<StepRuntimeState>({
    runningStepId: null,
    failedStepId: null,
    error: "",
    notice: ""
  });

  const statuses = useMemo(
    () => buildStepStatuses(state, rawIdea, runtime),
    [rawIdea, runtime, state]
  );
  const activeStep = getStepConfig(activeStepId);
  const activeStatus = statuses[activeStepId];
  const activeStatusLabel =
    activeStepId === "user_identification"
      ? step2StatusLabels[activeStatus]
      : statusLabels[activeStatus];
  const completedImplementedSteps = implementedProductUnderstandingAgentIds.filter(
    (stepId) => statuses[stepId] === "completed"
  ).length;
  const brief = useMemo(() => buildBrief(state), [state]);
  const activeResult = activeStep.getResult(state);
  const missingDependencies = activeStep.dependencies.filter(
    (dependencyId) => statuses[dependencyId] !== "completed"
  );
  const visibleSteps =
    activeStepId === "user_identification"
      ? productUnderstandingSteps.filter((step) => step.id === "user_identification")
      : productUnderstandingSteps;

  const saveIdeaLocally = () => {
    setRuntime((current) => ({
      ...current,
      notice: "原始想法已在当前工作台保存。Agent 运行时会使用最新输入。",
      error: "",
      failedStepId: null
    }));
  };

  const runStep = async (stepId: ProductUnderstandingStepId) => {
    const step = getStepConfig(stepId);
    const trimmedIdea = rawIdea.trim();

    if (!trimmedIdea) {
      setRuntime((current) => ({
        ...current,
        error: "请先输入原始产品想法。",
        failedStepId: stepId,
        notice: ""
      }));
      return;
    }

    if (!step.implemented || step.id === "raw_idea") {
      return;
    }

    const unresolvedDependencies = step.dependencies.filter(
      (dependencyId) => statuses[dependencyId] !== "completed"
    );

    if (unresolvedDependencies.length > 0) {
      setRuntime((current) => ({
        ...current,
        error: `请先完成前置步骤：${unresolvedDependencies
          .map((dependencyId) => getStepConfig(dependencyId).title)
          .join("、")}。`,
        failedStepId: stepId,
        notice: ""
      }));
      return;
    }

    if (statuses[stepId] === "completed") {
      const shouldContinue = window.confirm(
        "重新运行该步骤可能会影响后续步骤结果，是否继续？"
      );

      if (!shouldContinue) {
        return;
      }
    }

    setRuntime({
      runningStepId: stepId,
      failedStepId: null,
      error: "",
      notice:
        stepId === "user_identification"
          ? "正在分析目标用户。"
          : "正在调用当前项目已有 Agent Run。"
    });

    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId,
          productIdea: extraContext.trim()
            ? `${trimmedIdea}\n\n额外上下文：${extraContext.trim()}`
            : trimmedIdea,
          autoAnswerClarification: true
        })
      });
      const result = (await response.json()) as ApiResponse<RunAgentResponse>;

      if (!result.success || !result.data) {
        throw new Error(result.error?.message ?? "Agent 运行失败。");
      }

      onStateChange(result.data.state);
      setRuntime({
        runningStepId: null,
        failedStepId: null,
        error: "",
        notice:
          stepId === "user_identification"
            ? "已刷新目标用户识别结果。"
            : "已刷新结果。"
      });

      const nextStep = productUnderstandingSteps.find(
        (candidate) =>
          candidate.dependencies.includes(stepId) &&
          statuses[candidate.id] !== "completed"
      );

      if (nextStep) {
        setActiveStepId(nextStep.id);
      }
    } catch (error) {
      setRuntime({
        runningStepId: null,
        failedStepId: stepId,
        error: error instanceof Error ? error.message : "Agent 运行失败。",
        notice: ""
      });
    }
  };

  const copyBrief = async () => {
    await navigator.clipboard.writeText(brief);
    setRuntime((current) => ({
      ...current,
      notice: "Product Understanding Brief 已复制。",
      error: ""
    }));
  };

  return (
    <section className="grid gap-5">
      <header className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              {activeStepId === "user_identification"
                ? "Step2"
                : "Product Understanding"}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-neutral-950">
              {activeStepId === "user_identification"
                ? "目标用户识别"
                : "产品理解"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              {activeStepId === "user_identification"
                ? "AI 将根据你的产品想法，识别最可能使用该产品的人群，并说明判断依据。"
                : "从模糊 AI 产品想法开始，逐步明确用户、场景、问题、替代方案和痛点强度。后续未实现 Agent 会以占位方式保留接入点。"}
            </p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="text-xs text-neutral-500">已实现步骤进度</div>
            <div className="mt-1 text-2xl font-semibold text-neutral-950">
              {completedImplementedSteps}/{implementedProductUnderstandingAgentIds.length}
            </div>
          </div>
        </div>
      </header>

      {activeStepId !== "user_identification" ? (
        <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label className="block">
              <span className="text-sm font-medium text-neutral-800">原始想法</span>
              <textarea
                value={rawIdea}
                onChange={(event) => setRawIdea(event.target.value)}
                className="mt-2 min-h-28 w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-neutral-800">额外上下文</span>
              <textarea
                value={extraContext}
                onChange={(event) => setExtraContext(event.target.value)}
                placeholder="可选：补充目标用户、使用场景或项目背景"
                className="mt-2 min-h-28 w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              <button
                type="button"
                onClick={saveIdeaLocally}
                className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
              >
                保存想法
              </button>
              <button
                type="button"
                onClick={() => runStep("user_identification")}
                disabled={runtime.runningStepId !== null || !rawIdea.trim()}
                className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                开始目标用户识别
              </button>
            </div>
          </div>
          {runtime.notice ? (
            <p className="mt-4 rounded-md bg-teal-50 px-4 py-3 text-sm text-teal-800">
              {runtime.notice}
            </p>
          ) : null}
          {runtime.error ? (
            <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {runtime.error}
            </p>
          ) : null}
        </section>
      ) : runtime.notice || runtime.error ? (
        <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          {runtime.notice ? (
            <p className="rounded-md bg-teal-50 px-4 py-3 text-sm text-teal-800">
              {runtime.notice}
            </p>
          ) : null}
          {runtime.error ? (
            <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {runtime.error}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[18rem_1fr]">
        <nav className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
          <div className="grid gap-2">
            {visibleSteps.map((step) => {
              const status = statuses[step.id];
              const originalIndex = productUnderstandingSteps.findIndex(
                (candidate) => candidate.id === step.id
              );
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepId(step.id)}
                  className={
                    activeStepId === step.id
                      ? "rounded-md border border-neutral-950 bg-neutral-950 px-3 py-3 text-left text-white"
                      : "rounded-md border border-transparent px-3 py-3 text-left hover:border-neutral-200 hover:bg-neutral-50"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs opacity-70">Step {originalIndex + 1}</p>
                      <p className="mt-1 text-sm font-semibold">{step.title}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-2 py-1 text-[11px] ${
                        activeStepId === step.id
                          ? "bg-white/15 text-white"
                          : statusClassNames[status]
                      }`}
                    >
                      {step.id === "user_identification"
                        ? step2StatusLabels[status]
                        : statusLabels[status]}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 opacity-75">
                    {step.description}
                  </p>
                </button>
              );
            })}
          </div>
        </nav>

        <article className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                {activeStep.agentKey ?? "RAW_IDEA"}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-neutral-950">
                {activeStep.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {activeStep.description}
              </p>
            </div>
            <span
              className={`w-fit rounded-md px-3 py-1 text-sm font-medium ${statusClassNames[activeStatus]}`}
            >
              {activeStatusLabel}
            </span>
          </div>

          {activeStepId === "user_identification" ? (
            <div className="mt-5 rounded-md bg-neutral-50 p-4">
              <h4 className="text-sm font-semibold text-neutral-950">Agent 节点</h4>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  "目标用户识别 Agent",
                  "用户细分 Agent",
                  "用户依据解释 Agent"
                ].map((nodeName) => (
                  <div
                    key={nodeName}
                    className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-800"
                  >
                    {nodeName}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeStepId !== "user_identification" ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-md bg-neutral-50 p-4">
                <h4 className="text-sm font-semibold text-neutral-950">输入上下文</h4>
                <ul className="mt-3 grid gap-2 text-sm text-neutral-700">
                  {activeStep.dependencies.length === 0 ? (
                    <li>该步骤只依赖原始想法。</li>
                  ) : (
                    activeStep.dependencies.map((dependencyId) => (
                      <li key={dependencyId}>
                        - {getStepConfig(dependencyId).title}：
                        {statuses[dependencyId] === "completed" ? "已完成" : "未完成"}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="rounded-md bg-neutral-50 p-4">
                <h4 className="text-sm font-semibold text-neutral-950">预期输出</h4>
                <p className="mt-3 text-sm leading-6 text-neutral-700">
                  {activeStep.expectedOutput}
                </p>
              </div>
            </div>
          ) : null}

          {activeStatus === "not_started" ? (
            <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {activeStepId === "user_identification"
                ? "请先完成 Step1 输入。"
                : `需要先完成前置步骤：${missingDependencies
                    .map((dependencyId) => getStepConfig(dependencyId).title)
                    .join("、")}`}
            </div>
          ) : null}

          {activeStatus === "not_implemented" ? (
            <div className="mt-5 rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <h4 className="text-sm font-semibold text-neutral-950">
                该 Agent 尚未实现
              </h4>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                当前仅展示产品设计占位。未来接入 {activeStep.agentKey} 后，该步骤会读取上游上下文并写入结构化结果。
              </p>
            </div>
          ) : null}

          {activeStatus === "running" ? (
            <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Agent 正在运行，请稍候。
            </div>
          ) : null}

          {activeStatus === "failed" || activeStatus === "needs_more_info" ? (
            <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
              {activeStatus === "needs_more_info"
                ? "当前想法中缺少明确的用户信息，请补充：这个产品主要给谁用？"
                : runtime.error || "该步骤运行失败，可以重试。"}
            </div>
          ) : null}

          {activeStatus === "completed" && activeStepId !== "raw_idea" ? (
            <div className="mt-5 grid gap-5">
              {renderStepResult(activeStepId, state)}
              {activeStepId !== "user_identification" ? (
                <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <h4 className="text-sm font-semibold text-neutral-950">
                  结构化 JSON
                </h4>
                <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-neutral-950 p-4 text-xs leading-5 text-neutral-100">
                  {stringifyJson(activeResult)}
                </pre>
              </div>
              ) : null}
            </div>
          ) : null}

          {activeStepId === "raw_idea" ? (
            <div className="mt-5 rounded-lg border border-neutral-200 bg-white p-5">
              <h4 className="text-sm font-semibold text-neutral-950">当前原始输入</h4>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-700">
                {rawIdea || "暂无原始想法。"}
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            {activeStep.implemented && activeStep.id !== "raw_idea" ? (
              <button
                type="button"
                onClick={() => runStep(activeStep.id)}
                disabled={
                  runtime.runningStepId !== null ||
                  activeStatus === "not_started" ||
                  !rawIdea.trim()
                }
                className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {activeStatus === "completed" ? "重新运行分析" : "运行分析"}
              </button>
            ) : null}
            {!activeStep.implemented ? (
              <button
                type="button"
                disabled
                className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-md bg-neutral-200 px-4 text-sm font-medium text-neutral-500"
              >
                Agent 未实现
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const currentIndex = productUnderstandingSteps.findIndex(
                  (step) => step.id === activeStepId
                );
                const nextStep = productUnderstandingSteps[currentIndex + 1];
                if (nextStep) {
                  setActiveStepId(nextStep.id);
                }
              }}
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              下一步
            </button>
          </div>
        </article>
      </div>

      {activeStepId !== "user_identification" ? (
        <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-neutral-950">
                Product Understanding Brief
              </h3>
              <p className="mt-1 text-sm text-neutral-600">
                汇总已完成的产品理解结果；未实现步骤会保留未来接入点。
              </p>
            </div>
            <button
              type="button"
              onClick={copyBrief}
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              复制简报
            </button>
          </div>
          <pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-md bg-neutral-950 p-4 text-sm leading-6 text-neutral-100">
            {brief}
          </pre>
        </section>
      ) : null}
    </section>
  );
}
