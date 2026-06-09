const steps = [
  {
    index: "01",
    title: "识别目标用户"
  },
  {
    index: "02",
    title: "拆解使用场景"
  },
  {
    index: "03",
    title: "判断痛点强度"
  },
  {
    index: "04",
    title: "生成 MVP 验证方案"
  }
] as const;

type DiscoveryStartedPanelProps = {
  onBack: () => void;
};

export function DiscoveryStartedPanel({ onBack }: DiscoveryStartedPanelProps) {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-[32px] border border-[#E2E8F0]/90 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur sm:p-8">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-semibold text-[#2563EB] transition hover:text-[#4F46E5]"
      >
        ← 返回输入页
      </button>

      <div className="mt-10 text-center">
        <h1 className="text-4xl font-bold tracking-normal text-[#0F172A] sm:text-5xl">
          产品发现已开始
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#64748B] sm:text-lg">
          下一步将围绕目标用户、使用场景、真实问题、替代方案和最小可验证方案展开分析。
        </p>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {steps.map((step) => (
          <article
            key={step.index}
            className="rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-5"
          >
            <p className="text-sm font-bold text-[#2563EB]">{step.index}</p>
            <h2 className="mt-3 text-lg font-semibold text-[#0F172A]">
              {step.title}
            </h2>
          </article>
        ))}
      </div>
    </section>
  );
}
