import type { EvaluationResult } from "@/packages/shared/types";

const metrics: Array<{
  key:
    | "completenessScore"
    | "credibilityScore"
    | "differentiationScore"
    | "developabilityScore"
    | "clarityScore";
  label: string;
}> = [
  { key: "completenessScore", label: "完整性" },
  { key: "credibilityScore", label: "可信度" },
  { key: "differentiationScore", label: "差异化" },
  { key: "developabilityScore", label: "可开发性" },
  { key: "clarityScore", label: "表达清晰度" }
];

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
            基于确定性规则与可选 LLM Judge，对当前产品发现结果进行审核。
          </p>
          {evaluation ? (
            <p className="mt-2 text-xs text-neutral-500">
              评分模式：{evaluation.graderMode === "hybrid" ? "混合评分" : "规则评分"}
            </p>
          ) : null}
        </div>
        <div className="rounded-md bg-neutral-950 px-4 py-3 text-center text-white">
          <div className="text-3xl font-semibold">{score}</div>
          <div className="text-xs text-neutral-300">总分 / 100</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {metrics.map((metric) => (
          <Metric
            key={metric.key}
            label={metric.label}
            value={evaluation?.[metric.key] ?? 0}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <EvaluationList
          title="扣分原因"
          items={evaluation?.deductionReasons ?? []}
        />
        <EvaluationList
          title="优化建议"
          items={evaluation?.recommendations ?? []}
        />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[5rem_1fr_3rem] items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
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

function EvaluationList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
      <ul className="mt-2 grid gap-1 text-sm leading-6 text-neutral-700">
        {(items.length > 0 ? items : ["暂无"]).map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}
