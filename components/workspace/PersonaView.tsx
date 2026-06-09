import type { PersonaItem } from "@/packages/shared/types";

export function PersonaView({ personas }: { personas: PersonaItem[] }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-neutral-950">用户画像</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {personas.map((persona) => (
          <article
            key={persona.id}
            className="rounded-md border border-neutral-200 p-4"
          >
            <h3 className="font-semibold text-neutral-950">{persona.name}</h3>
            <p className="mt-1 text-sm text-neutral-500">{persona.segment}</p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-medium text-neutral-500">目标</dt>
                <dd className="mt-1 text-neutral-800">{persona.goals.join("、")}</dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-500">痛点</dt>
                <dd className="mt-1 text-neutral-800">{persona.pains.join("、")}</dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-500">JTBD</dt>
                <dd className="mt-1 leading-6 text-neutral-800">
                  {persona.jobsToBeDone.join("、")}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      {personas.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">暂无用户画像。</p>
      ) : null}
    </section>
  );
}
