const processItems = ["用户识别", "场景分析", "痛点判断", "MVP 方案"] as const;

export function ProcessChips() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {processItems.map((item) => (
        <span
          key={item}
          className="rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-[13px] font-medium text-[#475569] shadow-sm"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
