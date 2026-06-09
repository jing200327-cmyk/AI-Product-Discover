import type { EvidenceItem, SourceItem } from "@/packages/shared/types";

export function EvidenceView({
  evidence,
  sources
}: {
  evidence: EvidenceItem[];
  sources: SourceItem[];
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-neutral-950">证据摘要</h2>
        <span className="text-sm text-neutral-500">{sources.length} sources</span>
      </div>
      <div className="mt-4 grid gap-3">
        {evidence.map((item) => (
          <div key={item.id} className="border-t border-neutral-100 pt-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                {item.kind}
              </span>
              <span className="text-xs text-neutral-500">
                confidence {item.confidence.toFixed(2)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-neutral-800">{item.claim}</p>
            {item.note ? (
              <p className="mt-1 text-xs text-neutral-500">{item.note}</p>
            ) : null}
          </div>
        ))}
        {evidence.length === 0 ? (
          <p className="text-sm text-neutral-500">暂无证据。</p>
        ) : null}
      </div>
    </section>
  );
}
