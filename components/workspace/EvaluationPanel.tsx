import type { EvaluationResult } from "@/packages/shared/types";

export function EvaluationPanel({
  evaluation
}: {
  evaluation: EvaluationResult | null;
}) {
  const score = evaluation?.totalScore ?? 0;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">评测结果</h2>
          <p className="mt-1 text-sm text-neutral-600">
            评分基于当前 Mock 研究证据，后续可接真实搜索校准。
          </p>
        </div>
        <div className="rounded-md bg-neutral-950 px-4 py-3 text-center text-white">
          <div className="text-3xl font-semibold">{score}</div>
          <div className="text-xs text-neutral-300">Total Score</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <Metric label="市场" value={evaluation?.marketScore ?? 0} />
        <Metric label="痛点" value={evaluation?.userPainScore ?? 0} />
        <Metric label="差异化" value={evaluation?.differentiationScore ?? 0} />
        <Metric label="可行性" value={evaluation?.feasibilityScore ?? 0} />
        <Metric label="证据" value={evaluation?.evidenceQualityScore ?? 0} />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800">扣分原因</h3>
          <ul className="mt-2 grid gap-1 text-sm leading-6 text-neutral-700">
            {(evaluation?.deductionReasons ?? ["暂无"]).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-800">优化建议</h3>
          <ul className="mt-2 grid gap-1 text-sm leading-6 text-neutral-700">
            {(evaluation?.recommendations ?? ["暂无"]).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[4rem_1fr_3rem] items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
      <div className="text-sm font-medium text-neutral-700">{label}</div>
      <div className="h-2 rounded-full bg-neutral-200">
        <div
          className="h-2 rounded-full bg-teal-600"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <div className="text-right text-sm font-semibold text-neutral-950">{value}</div>
    </div>
  );
}
