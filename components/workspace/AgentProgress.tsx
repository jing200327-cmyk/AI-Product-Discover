import type { AgentStage, TraceEvent } from "@/packages/shared/types";

const stageLabels: Record<AgentStage, string> = {
  idea_input: "输入",
  product_context: "目标用户识别",
  usage_scenario: "使用场景",
  real_problem: "真实问题",
  current_alternative: "替代方案",
  pain_intensity: "痛点强度",
  clarification: "澄清",
  research_plan: "研究计划",
  market_analysis: "市场分析",
  supplemental_research: "补充研究",
  search_query: "搜索查询",
  market_research: "市场研究",
  evidence_extraction: "证据抽取",
  competitor_analysis: "竞品分析",
  persona_generation: "用户画像",
  prd_generation: "MVP PRD",
  page_structure: "页面结构",
  evaluation: "评测",
  rewrite: "重写",
  export: "导出",
  completed: "完成"
};

export function AgentProgress({
  currentStage,
  trace
}: {
  currentStage: AgentStage;
  trace: TraceEvent[];
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">Agent 进度</h2>
          <p className="mt-1 text-sm text-neutral-600">
            当前阶段：{stageLabels[currentStage]}
          </p>
        </div>
        <span className="rounded-md bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
          {trace.length} events
        </span>
      </div>

      <div className="mt-5 grid gap-2">
        {trace.map((event) => (
          <div
            key={event.traceId}
            className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 border-t border-neutral-100 py-2 text-sm"
          >
            <span className="text-neutral-500">{stageLabels[event.stage]}</span>
            <span className="truncate font-medium text-neutral-800">
              {event.nodeName}
            </span>
            <span
              className={
                event.status === "success"
                  ? "text-teal-700"
                  : event.status === "degraded"
                    ? "text-amber-700"
                    : event.status === "error"
                      ? "text-red-700"
                      : "text-neutral-500"
              }
            >
              {event.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
