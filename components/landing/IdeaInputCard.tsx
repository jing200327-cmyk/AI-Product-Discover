type IdeaInputCardProps = {
  error: string;
  idea: string;
  isLoading?: boolean;
  onIdeaChange: (idea: string) => void;
  onStart: () => void;
};

export function IdeaInputCard({
  error,
  idea,
  isLoading = false,
  onIdeaChange,
  onStart
}: IdeaInputCardProps) {
  return (
    <section className="mx-auto w-full max-w-xl rounded-[32px] border border-[#E2E8F0]/90 bg-white/90 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
      <div className="rounded-[24px] bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-7">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#0F172A]">输入你的产品想法</h2>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            用一句话描述你想做的 AI 产品，系统将开始产品发现流程
          </p>
        </div>

        <div className="mt-6">
          <textarea
            value={idea}
            onChange={(event) => onIdeaChange(event.target.value)}
            placeholder="例如：我想做一个面向求职者的针对岗位JD和个人简历向HR个性化打招呼的AI助手"
            className={`h-[116px] w-full resize-none rounded-[18px] border bg-[#F8FAFC] px-4 py-4 text-base leading-7 text-[#334155] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 ${
              error ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-[#DDE3EE]"
            }`}
          />
          {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
        </div>

        <div className="mt-7 flex justify-center">
          <button
            type="button"
            onClick={onStart}
            disabled={isLoading}
            className="h-16 w-full max-w-64 rounded-[18px] bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-6 text-base font-semibold text-white shadow-[0_18px_36px_rgba(37,99,235,0.28)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "正在识别目标用户..." : "开始产品发现 →"}
          </button>
        </div>
      </div>
    </section>
  );
}
