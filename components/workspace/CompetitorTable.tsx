import type { CompetitorItem } from "@/packages/shared/types";

export function CompetitorTable({
  competitors
}: {
  competitors: CompetitorItem[];
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-neutral-950">竞品分析表</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500">
              <th className="py-3 pr-4 font-medium">名称</th>
              <th className="py-3 pr-4 font-medium">类别</th>
              <th className="py-3 pr-4 font-medium">核心功能</th>
              <th className="py-3 pr-4 font-medium">优势</th>
              <th className="py-3 pr-4 font-medium">劣势</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((competitor) => (
              <tr key={competitor.id} className="border-b border-neutral-100">
                <td className="py-3 pr-4 font-medium text-neutral-900">
                  {competitor.name}
                </td>
                <td className="py-3 pr-4 text-neutral-700">{competitor.category}</td>
                <td className="py-3 pr-4 text-neutral-700">
                  {competitor.coreFeatures.join("、")}
                </td>
                <td className="py-3 pr-4 text-neutral-700">
                  {competitor.strengths.join("、")}
                </td>
                <td className="py-3 pr-4 text-neutral-700">
                  {competitor.weaknesses.join("、")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {competitors.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">暂无竞品分析。</p>
        ) : null}
      </div>
    </section>
  );
}
