import { prisma } from "../db";

export async function createArtifactWithVersion(input: {
  projectId: string;
  taskId?: string;
  type: string;
  title: string;
  content: string;
  format: string;
  metadata?: string;
}) {
  return prisma.artifact.create({
    data: {
      projectId: input.projectId,
      taskId: input.taskId,
      type: input.type,
      title: input.title,
      content: input.content,
      format: input.format,
      versions: {
        create: {
          version: 1,
          content: input.content,
          metadata: input.metadata
        }
      }
    },
    include: {
      versions: true
    }
  });
}

export async function addArtifactVersion(input: {
  artifactId: string;
  content: string;
  metadata?: string;
}) {
  const latestVersion = await prisma.artifactVersion.findFirst({
    where: {
      artifactId: input.artifactId
    },
    orderBy: {
      version: "desc"
    }
  });
  const version = (latestVersion?.version ?? 0) + 1;

  return prisma.artifactVersion.create({
    data: {
      artifactId: input.artifactId,
      version,
      content: input.content,
      metadata: input.metadata
    }
  });
}

export async function listArtifactsByProject(projectId: string) {
  return prisma.artifact.findMany({
    where: {
      projectId
    },
    include: {
      versions: {
        orderBy: {
          version: "desc"
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}

export async function getLatestExportArtifact(input: {
  projectId: string;
  format: "markdown" | "json";
}) {
  return prisma.artifact.findFirst({
    where: {
      projectId: input.projectId,
      type: input.format === "markdown" ? "markdown_export" : "json_export",
      format: input.format
    },
    include: {
      versions: {
        orderBy: {
          version: "desc"
        },
        take: 1
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}
