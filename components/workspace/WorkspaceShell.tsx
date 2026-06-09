"use client";

import { useState } from "react";
import { ProductDiscoveryWorkflow } from "./ProductDiscoveryWorkflow";
import type { AgentState } from "@/packages/shared/types";

type WorkspaceShellProps = {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
  };
  state: AgentState;
};

const allowedTraceNodes = new Set([
  "rawIdeaNode",
  "targetUserAgent",
  "scenarioProblemAgent",
  "productBoundaryAgent",
  "realProblemAgent",
  "alternativeSolutionAgent",
  "painStrengthAgent",
  "confidenceGapAgent",
  "clarificationQuestionAgent",
  "contextCompletenessAgent",
  "clarificationDepthRouterAgent",
  "questionPlanningAgent",
  "questionGenerationAgent",
  "questionDeduplicationAgent",
  "answerIntegrationAgent",
  "researchPlanAgent",
  "researchContextAgent",
  "researchGoalAgent",
  "researchQuestionAgent",
  "researchMethodAgent",
  "researchTimelineAgent",
  "researchDeliverableAgent",
  "researchRiskAgent",
  "researchUsageAgent",
  "marketContextAgent",
  "targetMarketAgent",
  "trendAnalysisAgent",
  "userDemandAgent",
  "opportunityAgent",
  "marketAssumptionAgent",
  "competitorLandscapeAgent",
  "directCompetitorAgent",
  "indirectCompetitorAgent",
  "substituteSolutionAgent",
  "differentiationOpportunityAgent",
  "competitorTableDimensionAgent",
  "competitorComparisonTableAgent",
  "competitorTableInsightAgent",
  "personaSegmentationAgent",
  "personaScenarioAgent",
  "personaPainGoalAgent",
  "personaInsightAgent",
  "prdContextAgent",
  "prdScopeAgent",
  "prdUserStoryAgent",
  "prdAcceptanceAgent",
  "supplementalResearchPlannerAgent",
  "tool:mockSearch",
  "supplementalResearchSynthesisAgent"
]);

export function WorkspaceShell({ project, state }: WorkspaceShellProps) {
  const [workspaceState, setWorkspaceState] = useState<AgentState>(state);
  const visibleTrace = workspaceState.trace.filter((event) =>
    allowedTraceNodes.has(event.nodeName)
  );

  return (
    <main className="min-h-screen bg-[#f4f5f2] text-neutral-950">
      <div className="mx-auto grid w-full max-w-[96rem] grid-cols-1 gap-5 px-5 py-5 xl:grid-cols-[1fr_20rem]">
        <section className="grid gap-5">
          <header className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">
                  AI 产品发现工作台
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-neutral-950">
                  {project.name}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
                  {project.description ?? workspaceState.input.idea}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2">
                  <div className="text-xs text-neutral-500">当前阶段</div>
                  <div className="text-base font-semibold text-neutral-950">
                    {workspaceState.productDiscoveryProfile?.step12MvpPrd
                      ? "MVP PRD 已生成"
                      : workspaceState.productDiscoveryProfile?.step11UserPersonas
                      ? "用户画像已生成"
                      : workspaceState.productDiscoveryProfile
                          ?.step10CompetitorAnalysisTable
                      ? "竞品分析表已生成"
                      : workspaceState.productDiscoveryProfile
                          ?.step9CompetitorIdentification
                      ? "竞品识别已生成"
                      : workspaceState.productDiscoveryProfile?.step8MarketAnalysis
                      ? "市场分析已生成"
                      : workspaceState.productDiscoveryProfile?.step7ResearchPlan
                      ? "研究计划已生成"
                      : workspaceState.productDiscoveryProfile?.researchPlan
                      ? "研究计划已生成"
                      : workspaceState.productDiscoveryProfile?.targetUsers.value.length
                      ? "目标用户识别已生成"
                      : "等待补充信息"}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <ProductDiscoveryWorkflow
            projectId={project.id}
            state={workspaceState}
            onStateChange={setWorkspaceState}
          />
        </section>

        <aside className="xl:sticky xl:top-5 xl:h-[calc(100vh-2.5rem)]">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-950">Trace 摘要</h2>
              <span className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                {project.status}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {visibleTrace.length > 0 ? (
                visibleTrace.map((event) => (
                  <div key={event.traceId} className="border-t border-neutral-100 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {event.nodeName}
                      </p>
                      <span className="text-xs text-neutral-500">{event.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">{event.stage}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-500">
                  暂无 Trace。
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
