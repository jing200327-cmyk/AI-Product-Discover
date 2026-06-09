import type { ResearchPlan } from "@/packages/shared/types";

const List = ({ items }: { items: string[] | undefined }) => (
  <ul className="mt-2 grid gap-1 text-sm leading-6 text-neutral-700">
    {items && items.length > 0 ? (
      items.map((item) => <li key={item}>- {item}</li>)
    ) : (
      <li>暂无</li>
    )}
  </ul>
);

export function ResearchPlanView({ plan }: { plan: ResearchPlan | null }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-neutral-950">研究计划</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800">研究目标</h3>
          <List items={plan?.goals} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-800">关键词</h3>
          <List items={plan?.keywords} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-800">关键问题</h3>
          <List items={plan?.questions} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-800">竞品类别</h3>
          <List items={plan?.competitorCategories} />
        </div>
      </div>
    </section>
  );
}
