import type { PainIntensityAnalysis } from "@/packages/shared/types";

export function PainIntensityView({
  painIntensity
}: {
  painIntensity: PainIntensityAnalysis | null;
}) {
  if (!painIntensity) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">痛点强度</h2>
        <p className="mt-3 text-sm text-neutral-500">暂无痛点强度分析。</p>
      </section>
    );
  }

  const assessment = painIntensity.overallPainAssessment;

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">痛点强度</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {painIntensity.painPointDefinition.deepPain}
            </p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="text-xs text-neutral-500">综合得分</div>
            <div className="mt-1 text-2xl font-semibold text-neutral-950">
              {assessment.averageScore.toFixed(1)}
            </div>
            <div className="mt-1 text-xs text-teal-700">{assessment.painLevel}</div>
          </div>
        </div>

        <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="font-medium text-neutral-500">表层痛点</dt>
            <dd className="mt-1 text-neutral-900">
              {painIntensity.painPointDefinition.surfacePain}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">影响目标</dt>
            <dd className="mt-1 text-neutral-900">
              {painIntensity.painPointDefinition.affectedGoal}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">MVP 核心痛点</dt>
            <dd className="mt-1 text-neutral-900">
              {assessment.suitableAsMvpCorePain ? "适合" : "不适合"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">判断理由</dt>
            <dd className="mt-1 text-neutral-900">{assessment.reason}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-950">评分维度</h3>
        <div className="mt-4 grid gap-3">
          {painIntensity.painIntensityScores.map((score) => (
            <div key={score.dimension}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-neutral-900">{score.dimension}</span>
                <span className="text-neutral-500">{score.score}/5</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-neutral-100">
                <div
                  className="h-2 rounded-full bg-teal-600"
                  style={{ width: `${score.score * 20}%` }}
                />
              </div>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                {score.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-950">强痛点证据</h3>
          <div className="mt-4 grid gap-3">
            {painIntensity.strongPainEvidence.map((item) => (
              <div key={item.evidence} className="rounded-md bg-neutral-50 p-3">
                <p className="text-sm font-medium text-neutral-900">{item.evidence}</p>
                <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
                <p className="mt-1 text-xs text-neutral-500">{item.source}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-950">风险证据</h3>
          <div className="mt-4 grid gap-3">
            {painIntensity.weakPainOrRiskEvidence.map((item) => (
              <div key={item.evidence} className="rounded-md bg-neutral-50 p-3">
                <p className="text-sm font-medium text-neutral-900">{item.evidence}</p>
                <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  影响：{item.potentialImpact}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-950">MVP 价值判断</h3>
        <p className="mt-3 text-sm leading-6 text-neutral-700">
          {painIntensity.mvpValueJudgment.recommendedMvpPainDefinition}
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-neutral-700">
          {painIntensity.mvpValueJudgment.reasons.map((reason) => (
            <li key={reason}>- {reason}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
