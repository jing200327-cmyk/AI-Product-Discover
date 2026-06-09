import type { MvpPrd } from "@/packages/shared/types";

const List = ({ items }: { items: string[] | undefined }) => (
  <ul className="mt-2 grid gap-1 text-sm leading-6 text-neutral-700">
    {items && items.length > 0 ? (
      items.map((item) => <li key={item}>- {item}</li>)
    ) : (
      <li>暂无</li>
    )}
  </ul>
);

export function PrdViewer({ prd }: { prd: MvpPrd | null }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="border-b border-neutral-200 pb-4">
        <p className="text-sm font-medium text-neutral-500">Product Requirement Document</p>
        <h2 className="mt-1 text-2xl font-semibold text-neutral-950">
          {prd?.title ?? "MVP PRD"}
        </h2>
      </div>
      <div className="mt-5">
        <h3 className="text-lg font-semibold text-neutral-950">背景与问题</h3>
        <p className="mt-3 text-sm leading-7 text-neutral-800">
        {prd?.problemStatement ?? "暂无 PRD。"}
        </p>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-base font-semibold text-neutral-950">MVP 目标</h3>
          <List items={prd?.goals} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-neutral-950">非目标</h3>
          <List items={prd?.nonGoals} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-neutral-950">核心功能</h3>
          <List items={prd?.coreFeatures} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-neutral-950">成功指标</h3>
          <List items={prd?.successMetrics} />
        </div>
      </div>
    </section>
  );
}
