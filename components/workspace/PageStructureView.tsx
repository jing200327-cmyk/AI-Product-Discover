import type { PageSpec } from "@/packages/shared/types";

export function PageStructureView({ pages }: { pages: PageSpec[] }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-neutral-950">页面结构</h2>
      <div className="mt-4 grid gap-4">
        {pages.map((page) => (
          <article key={page.id} className="border-t border-neutral-100 pt-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-neutral-950">{page.name}</h3>
              <span className="text-sm text-neutral-500">{page.route}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-neutral-700">{page.purpose}</p>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <p>
                <span className="font-medium text-neutral-500">模块：</span>
                {page.modules.join("、")}
              </p>
              <p>
                <span className="font-medium text-neutral-500">字段：</span>
                {page.fields.join("、")}
              </p>
              <p>
                <span className="font-medium text-neutral-500">操作：</span>
                {page.operations.join("、")}
              </p>
              <p>
                <span className="font-medium text-neutral-500">状态：</span>
                {page.states.join("、")}
              </p>
              <p>
                <span className="font-medium text-neutral-500">异常：</span>
                {page.exceptions.join("、")}
              </p>
              <p>
                <span className="font-medium text-neutral-500">跳转：</span>
                {page.transitions.join("、")}
              </p>
            </div>
          </article>
        ))}
      </div>
      {pages.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">暂无页面结构。</p>
      ) : null}
    </section>
  );
}
