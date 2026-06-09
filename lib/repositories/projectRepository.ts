import { prisma } from "../db";

export const MOCK_USER_EMAIL = "mock-user@ai-product-discover.local";
export const MOCK_USER_NAME = "Mock User";

export async function getOrCreateMockUser() {
  return prisma.user.upsert({
    where: {
      email: MOCK_USER_EMAIL
    },
    update: {
      name: MOCK_USER_NAME
    },
    create: {
      email: MOCK_USER_EMAIL,
      name: MOCK_USER_NAME
    }
  });
}

export async function createProject(input: {
  name: string;
  description?: string;
  productIdea?: string;
  userId?: string;
}) {
  const user = input.userId
    ? await prisma.user.findUniqueOrThrow({
        where: {
          id: input.userId
        }
      })
    : await getOrCreateMockUser();

  return prisma.project.create({
    data: {
      name: input.name,
      description: input.description ?? input.productIdea,
      userId: user.id
    }
  });
}

export async function getProjectById(projectId: string) {
  return prisma.project.findUnique({
    where: {
      id: projectId
    },
    include: {
      tasks: {
        include: {
          stateSnapshots: {
            orderBy: {
              createdAt: "desc"
            },
            take: 1
          },
          evaluations: {
            orderBy: {
              createdAt: "desc"
            },
            take: 1
          },
          traceEvents: {
            orderBy: {
              startedAt: "asc"
            }
          },
          sources: true
        },
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
        },
        orderBy: {
          updatedAt: "desc"
        }
      }
    }
  });
}

export async function listProjects(userId?: string) {
  const user = userId
    ? await prisma.user.findUniqueOrThrow({
        where: {
          id: userId
        }
      })
    : await getOrCreateMockUser();

  return prisma.project.findMany({
    where: {
      userId: user.id
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}
