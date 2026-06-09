import { prisma } from "../db";
import type { AgentState } from "../../packages/shared/types";
import { getOrCreateMockUser } from "./projectRepository";

type SaveAgentRunResultOptions = {
  projectId?: string;
  projectName?: string;
};

const stringify = (value: unknown): string => JSON.stringify(value ?? null);

const buildArtifactInputs = (state: AgentState) => {
  const artifacts = [
    state.exports?.markdown
      ? {
          type: "markdown_export",
          title: "Markdown Export",
          content: state.exports.markdown,
          format: "markdown"
        }
      : null,
    state.exports?.json
      ? {
          type: "json_export",
          title: "JSON Export",
          content: state.exports.json,
          format: "json"
        }
      : null,
    state.exports?.mermaid
      ? {
          type: "mermaid_page_flow",
          title: "Mermaid Page Flow",
          content: state.exports.mermaid,
          format: "mermaid"
        }
      : null,
    state.mvpPrd
      ? {
          type: "mvp_prd",
          title: state.mvpPrd.title,
          content: stringify(state.mvpPrd),
          format: "json"
        }
      : null,
    state.usageScenario
      ? {
          type: "usage_scenario_analysis",
          title: "Usage Scenario Analysis",
          content: stringify(state.usageScenario),
          format: "json"
        }
      : null,
    state.realProblem
      ? {
          type: "real_problem_analysis",
          title: "Real Problem Analysis",
          content: stringify(state.realProblem),
          format: "json"
        }
      : null,
    state.currentAlternative
      ? {
          type: "current_alternative_analysis",
          title: "Current Alternative Analysis",
          content: stringify(state.currentAlternative),
          format: "json"
        }
      : null,
    state.painIntensity
      ? {
          type: "pain_intensity_analysis",
          title: "Pain Intensity Analysis",
          content: stringify(state.painIntensity),
          format: "json"
        }
      : null,
    state.pages.length > 0
      ? {
          type: "page_structure",
          title: "Page Structure",
          content: stringify(state.pages),
          format: "json"
        }
      : null
  ];

  return artifacts.filter((artifact) => artifact !== null);
};

async function getOrCreateProject(input: {
  projectId?: string;
  projectName?: string;
  inputIdea: string;
}) {
  if (input.projectId) {
    return prisma.project.findUniqueOrThrow({
      where: {
        id: input.projectId
      }
    });
  }

  const user = await getOrCreateMockUser();

  return prisma.project.create({
    data: {
      userId: user.id,
      name: input.projectName ?? input.inputIdea.slice(0, 80),
      description: "Created from mock user agent run."
    }
  });
}

export async function saveAgentRunResult(
  state: AgentState,
  options: SaveAgentRunResultOptions = {}
) {
  const project = await getOrCreateProject({
    projectId: options.projectId,
    projectName: options.projectName,
    inputIdea: state.input.idea
  });

  return prisma.$transaction(async (tx) => {
    const task = await tx.agentTask.upsert({
      where: {
        runId: state.runId
      },
      update: {
        projectId: project.id,
        inputIdea: state.input.idea,
        status: state.stage === "completed" ? "completed" : "running",
        stage: state.stage,
        completedAt: state.stage === "completed" ? new Date(state.updatedAt) : null
      },
      create: {
        projectId: project.id,
        runId: state.runId,
        inputIdea: state.input.idea,
        status: state.stage === "completed" ? "completed" : "running",
        stage: state.stage,
        startedAt: new Date(state.createdAt),
        completedAt: state.stage === "completed" ? new Date(state.updatedAt) : null
      }
    });

    await tx.agentStateSnapshot.deleteMany({
      where: {
        taskId: task.id
      }
    });
    await tx.source.deleteMany({
      where: {
        taskId: task.id
      }
    });
    await tx.evaluation.deleteMany({
      where: {
        taskId: task.id
      }
    });
    await tx.traceEvent.deleteMany({
      where: {
        taskId: task.id
      }
    });
    await tx.artifact.deleteMany({
      where: {
        taskId: task.id
      }
    });

    await tx.agentStateSnapshot.create({
      data: {
        taskId: task.id,
        stage: state.stage,
        stateJson: stringify(state)
      }
    });

    if (state.sources.length > 0) {
      await tx.source.createMany({
        data: state.sources.map((source) => ({
          taskId: task.id,
          sourceKey: source.id,
          title: source.title,
          url: source.url ?? null,
          sourceType: source.sourceType,
          publisher: source.publisher ?? null,
          publishedAt: source.publishedAt ? new Date(source.publishedAt) : null,
          accessedAt: new Date(source.accessedAt),
          summary: source.summary,
          relevanceScore: source.relevanceScore,
          rawJson: stringify(source)
        }))
      });
    }

    if (state.evaluation) {
      await tx.evaluation.create({
        data: {
          taskId: task.id,
          totalScore: state.evaluation.totalScore,
          marketScore: state.evaluation.marketScore,
          userPainScore: state.evaluation.userPainScore,
          differentiationScore: state.evaluation.differentiationScore,
          feasibilityScore: state.evaluation.feasibilityScore,
          evidenceQualityScore: state.evaluation.evidenceQualityScore,
          deductionReasonsJson: stringify(state.evaluation.deductionReasons),
          recommendationsJson: stringify(state.evaluation.recommendations),
          resultJson: stringify(state.evaluation)
        }
      });
    }

    if (state.trace.length > 0) {
      await tx.traceEvent.createMany({
        data: state.trace.map((event) => ({
          taskId: task.id,
          traceId: event.traceId,
          runId: event.runId,
          stage: event.stage,
          nodeName: event.nodeName,
          status: event.status,
          inputJson: stringify(event.input),
          outputJson: stringify(event.output),
          startedAt: new Date(event.startedAt),
          endedAt: event.endedAt ? new Date(event.endedAt) : null,
          durationMs: event.durationMs ?? null,
          errorJson: event.error ? stringify(event.error) : null
        }))
      });
    }

    for (const artifact of buildArtifactInputs(state)) {
      await tx.artifact.create({
        data: {
          projectId: project.id,
          taskId: task.id,
          type: artifact.type,
          title: artifact.title,
          content: artifact.content,
          format: artifact.format,
          versions: {
            create: {
              version: 1,
              content: artifact.content,
              metadata: stringify({
                runId: state.runId,
                stage: state.stage
              })
            }
          }
        }
      });
    }

    return tx.agentTask.findUniqueOrThrow({
      where: {
        id: task.id
      },
      include: {
        project: true,
        stateSnapshots: true,
        artifacts: {
          include: {
            versions: true
          }
        },
        sources: true,
        evaluations: true,
        traceEvents: true
      }
    });
  });
}

export async function getTaskByRunId(runId: string) {
  return prisma.agentTask.findUnique({
    where: {
      runId
    },
    include: {
      project: true,
      stateSnapshots: true,
      artifacts: true,
      sources: true,
      evaluations: true,
      traceEvents: true
    }
  });
}

export async function getTaskById(taskId: string) {
  return prisma.agentTask.findUnique({
    where: {
      id: taskId
    },
    include: {
      project: true,
      stateSnapshots: {
        orderBy: {
          createdAt: "desc"
        }
      },
      artifacts: {
        include: {
          versions: {
            orderBy: {
              version: "desc"
            }
          }
        }
      },
      sources: true,
      evaluations: true,
      traceEvents: {
        orderBy: {
          startedAt: "asc"
        }
      }
    }
  });
}

export async function listTasksByProject(projectId: string) {
  return prisma.agentTask.findMany({
    where: {
      projectId
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}
