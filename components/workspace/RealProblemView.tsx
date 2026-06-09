import type { RealProblemAnalysis } from "@/packages/shared/types";

export function RealProblemView({
  realProblem
}: {
  realProblem: RealProblemAnalysis | null;
}) {
  if (!realProblem) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">真实问题</h2>
        <p className="mt-3 text-sm text-neutral-500">暂无真实问题分析。</p>
      </section>
    );
  }

  const core = realProblem.recommendedCoreProblem;

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">真实问题</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          {core.problemDefinition}
        </p>

        <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="font-medium text-neutral-500">推荐核心问题</dt>
            <dd className="mt-1 text-neutral-900">{core.problemName}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">对应主场景</dt>
            <dd className="mt-1 text-neutral-900">{core.primaryScenario}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">为什么重要</dt>
            <dd className="mt-1 text-neutral-900">{core.whyItMatters}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">问题边界</dt>
            <dd className="mt-1 text-neutral-900">{core.problemBoundary}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">和 PRD 的关系</dt>
            <dd className="mt-1 text-neutral-900">{core.relationshipWithPrd}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">
              和 Vibe Coding / Codex 的关系
            </dt>
            <dd className="mt-1 text-neutral-900">
              {core.relationshipWithVibeCoding}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-950">表层需求</h3>
          <div className="mt-4 grid gap-3">
            {realProblem.surfaceNeeds.map((need) => (
              <div key={need.need} className="rounded-md bg-neutral-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-neutral-900">{need.need}</p>
                  <span className="text-xs text-neutral-500">{need.explicitness}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-neutral-600">
                  {need.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-950">根因树</h3>
          <div className="mt-4 grid gap-3">
            {realProblem.rootCauseTree.layers.map((layer) => (
              <div key={layer.layerName} className="border-l-2 border-teal-200 pl-3">
                <p className="text-sm font-medium text-neutral-900">
                  {layer.layerName}
                </p>
                <ul className="mt-2 grid gap-1 text-sm text-neutral-600">
                  {layer.causes.map((cause) => (
                    <li key={cause}>- {cause}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-950">真实问题候选</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 pr-4 font-medium">问题</th>
                <th className="py-2 pr-4 font-medium">根因</th>
                <th className="py-2 pr-4 font-medium">受影响任务</th>
                <th className="py-2 pr-4 font-medium">后果</th>
                <th className="py-2 pr-4 font-medium">优先级</th>
              </tr>
            </thead>
            <tbody>
              {realProblem.realProblemCandidates.map((problem) => (
                <tr key={problem.problemName} className="border-b border-neutral-100">
                  <td className="py-3 pr-4 font-medium text-neutral-900">
                    {problem.problemName}
                  </td>
                  <td className="py-3 pr-4 text-neutral-700">{problem.rootCause}</td>
                  <td className="py-3 pr-4 text-neutral-700">
                    {problem.affectedTask}
                  </td>
                  <td className="py-3 pr-4 text-neutral-700">
                    {problem.consequenceIfUnsolved}
                  </td>
                  <td className="py-3 pr-4 text-neutral-700">{problem.mvpPriority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
