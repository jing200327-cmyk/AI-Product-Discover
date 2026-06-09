import type { CurrentAlternativeAnalysis } from "@/packages/shared/types";

export function CurrentAlternativeView({
  currentAlternative
}: {
  currentAlternative: CurrentAlternativeAnalysis | null;
}) {
  if (!currentAlternative) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">替代方案</h2>
        <p className="mt-3 text-sm text-neutral-500">暂无替代方案分析。</p>
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">现有替代方案</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          分析用户不用 AI Product Discover 时，可能如何通过通用 LLM、模板、
          Vibe Coding 工具、Demo Builder、搜索工具或人工方式替代完成任务。
        </p>

        <div className="mt-5 grid gap-3">
          {currentAlternative.currentSolutionPaths.map((path) => (
            <div key={path.pathName} className="rounded-md bg-neutral-50 p-3">
              <p className="text-sm font-medium text-neutral-900">{path.pathName}</p>
              <p className="mt-1 text-sm text-neutral-600">
                {path.workflow.join(" → ")}
              </p>
              <p className="mt-1 text-xs text-neutral-500">{path.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-950">替代方案清单</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 pr-4 font-medium">方案</th>
                <th className="py-2 pr-4 font-medium">类别</th>
                <th className="py-2 pr-4 font-medium">覆盖任务</th>
                <th className="py-2 pr-4 font-medium">主要不足</th>
                <th className="py-2 pr-4 font-medium">威胁</th>
              </tr>
            </thead>
            <tbody>
              {currentAlternative.alternativeSolutions.map((alternative) => (
                <tr
                  key={alternative.alternativeName}
                  className="border-b border-neutral-100"
                >
                  <td className="py-3 pr-4 font-medium text-neutral-900">
                    {alternative.alternativeName}
                  </td>
                  <td className="py-3 pr-4 text-neutral-700">
                    {alternative.category}
                  </td>
                  <td className="py-3 pr-4 text-neutral-700">
                    {alternative.coveredTasks.join("、")}
                  </td>
                  <td className="py-3 pr-4 text-neutral-700">
                    {alternative.limitations.join("、")}
                  </td>
                  <td className="py-3 pr-4 text-neutral-700">
                    {alternative.threatToProduct}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-950">差异化能力</h3>
          <div className="mt-4 grid gap-3">
            {currentAlternative.productDifferentiation.map((item) => (
              <div key={item.direction} className="border-l-2 border-teal-200 pl-3">
                <p className="text-sm font-medium text-neutral-900">{item.direction}</p>
                <p className="mt-1 text-sm text-neutral-600">
                  {item.requiredProductCapability}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  对应弱点：{item.alternativeWeaknessAddressed}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-950">被替代风险</h3>
          <div className="mt-4 grid gap-3">
            {currentAlternative.replacementRisks.map((risk) => (
              <div key={risk.risk} className="rounded-md bg-neutral-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-neutral-900">{risk.risk}</p>
                  <span className="text-xs text-neutral-500">{risk.riskLevel}</span>
                </div>
                <p className="mt-1 text-sm text-neutral-600">
                  会被 {risk.replacedBy} 替代：{risk.reason}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  应对：{risk.mitigationStrategy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
