import { prisma } from "../db";
import type { TraceEvent } from "../../packages/shared/types";

const stringify = (value: unknown): string => JSON.stringify(value ?? null);

export async function replaceTraceEvents(taskId: string, trace: TraceEvent[]) {
  await prisma.traceEvent.deleteMany({
    where: {
      taskId
    }
  });

  if (trace.length === 0) {
    return {
      count: 0
    };
  }

  return prisma.traceEvent.createMany({
    data: trace.map((event) => ({
      taskId,
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

export async function listTraceEvents(taskId: string) {
  return prisma.traceEvent.findMany({
    where: {
      taskId
    },
    orderBy: {
      startedAt: "asc"
    }
  });
}
