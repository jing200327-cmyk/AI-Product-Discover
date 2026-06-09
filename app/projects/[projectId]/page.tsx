import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { getProjectById } from "@/lib/repositories/projectRepository";
import { AgentStateSchema } from "@/packages/shared/schemas";
import type { AgentState } from "@/packages/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

function parseStateSnapshot(snapshotJson: string | undefined): AgentState | null {
  if (!snapshotJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(snapshotJson) as Record<string, unknown>;

    return AgentStateSchema.parse({
      usageScenario: null,
      realProblem: null,
      currentAlternative: null,
      painIntensity: null,
      targetUserIdentification: null,
      productDiscoveryProfile: null,
      ...parsed
    });
  } catch {
    return null;
  }
}

export default async function ProjectWorkspacePage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  const latestTask = project.tasks[0];
  const state = parseStateSnapshot(latestTask?.stateSnapshots[0]?.stateJson);

  if (!state) {
    return (
      <main className="min-h-screen bg-[#f4f5f2] px-5 py-8 text-neutral-950">
        <section className="mx-auto max-w-3xl rounded-lg border border-neutral-200 bg-white p-8">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            暂无 Agent 运行结果。请从首页输入产品想法并运行 Agent。
          </p>
        </section>
      </main>
    );
  }

  return (
    <WorkspaceShell
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        status: latestTask?.status ?? "completed"
      }}
      state={state}
    />
  );
}
