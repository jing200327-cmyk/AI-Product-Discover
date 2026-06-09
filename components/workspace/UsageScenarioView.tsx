import type { UsageScenarioAnalysis } from "@/packages/shared/types";

export function UsageScenarioView({
  usageScenario
}: {
  usageScenario: UsageScenarioAnalysis | null;
}) {
  if (!usageScenario) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">使用场景</h2>
        <p className="mt-3 text-sm text-neutral-500">暂无使用场景分析。</p>
      </section>
    );
  }

  const primary = usageScenario.recommendedPrimaryScenario;

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">使用场景</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {primary.scenarioDefinition}
            </p>
          </div>
          <span className="w-fit rounded-md bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
            {usageScenario.coreUserFromPreviousStep.confidence}
          </span>
        </div>

        <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="font-medium text-neutral-500">推荐主场景</dt>
            <dd className="mt-1 text-neutral-900">{primary.scenarioName}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">核心用户</dt>
            <dd className="mt-1 text-neutral-900">{primary.coreUser}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">触发时刻</dt>
            <dd className="mt-1 text-neutral-900">{primary.triggerMoment}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">关键任务</dt>
            <dd className="mt-1 text-neutral-900">{primary.mainTask}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">当前阻碍</dt>
            <dd className="mt-1 text-neutral-900">{primary.currentBlocker}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">成功标准</dt>
            <dd className="mt-1 text-neutral-900">{primary.successCriteria}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-950">场景候选</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 pr-4 font-medium">场景</th>
                <th className="py-2 pr-4 font-medium">触发事件</th>
                <th className="py-2 pr-4 font-medium">用户任务</th>
                <th className="py-2 pr-4 font-medium">替代方式</th>
                <th className="py-2 pr-4 font-medium">MVP 优先级</th>
              </tr>
            </thead>
            <tbody>
              {usageScenario.scenarioCandidates.map((scenario) => (
                <tr key={scenario.scenarioName} className="border-b border-neutral-100">
                  <td className="py-3 pr-4 font-medium text-neutral-900">
                    {scenario.scenarioName}
                  </td>
                  <td className="py-3 pr-4 text-neutral-700">{scenario.triggerEvent}</td>
                  <td className="py-3 pr-4 text-neutral-700">{scenario.userTask}</td>
                  <td className="py-3 pr-4 text-neutral-700">
                    {scenario.currentAlternative}
                  </td>
                  <td className="py-3 pr-4 text-neutral-700">{scenario.mvpPriority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-950">场景链路</h3>
          <div className="mt-4 grid gap-3">
            {usageScenario.scenarioWorkflow.map((step) => (
              <div key={step.workflowStep} className="border-l-2 border-teal-200 pl-3">
                <p className="text-sm font-medium text-neutral-900">
                  {step.workflowStep}
                </p>
                <p className="mt-1 text-sm text-neutral-600">{step.systemSupport}</p>
                <p className="mt-1 text-xs text-neutral-500">{step.outputArtifact}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-950">待澄清问题</h3>
          <ol className="mt-4 grid gap-3 text-sm text-neutral-700">
            {usageScenario.clarifyingQuestions.map((question, index) => (
              <li key={question} className="flex gap-3">
                <span className="text-neutral-400">{index + 1}.</span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
