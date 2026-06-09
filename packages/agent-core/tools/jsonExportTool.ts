import { z } from "zod";
import { AgentStateSchema } from "../../shared/schemas";
import type { ToolDefinition } from "./types";

export const JsonExportInputSchema = AgentStateSchema;

export const JsonExportOutputSchema = z
  .object({
    json: z.string().min(1)
  })
  .strict();

export type JsonExportInput = z.infer<typeof JsonExportInputSchema>;
export type JsonExportOutput = z.infer<typeof JsonExportOutputSchema>;

export const jsonExportTool: ToolDefinition<JsonExportInput, JsonExportOutput> = {
  name: "jsonExport",
  description: "Exports the current AgentState as structured JSON.",
  permissionLevel: "safe_read",
  timeoutMs: 2000,
  retry: 0,
  inputSchema: JsonExportInputSchema,
  outputSchema: JsonExportOutputSchema,
  handler(input) {
    return {
      json: JSON.stringify(
        {
          runId: input.runId,
          stage: input.stage,
          input: input.input,
          context: input.context,
          targetUserIdentification: input.targetUserIdentification,
          usageScenario: input.usageScenario,
          realProblem: input.realProblem,
          currentAlternative: input.currentAlternative,
          painIntensity: input.painIntensity,
          clarificationQuestions: input.clarificationQuestions,
          clarificationAnswers: input.clarificationAnswers,
          researchPlan: input.researchPlan,
          sources: input.sources,
          evidence: input.evidence,
          competitors: input.competitors,
          personas: input.personas,
          mvpPrd: input.mvpPrd,
          pages: input.pages,
          evaluation: input.evaluation,
          rewriteRequired: input.rewriteRequired,
          rewrittenOutput: input.rewrittenOutput,
          trace: input.trace,
          errors: input.errors
        },
        null,
        2
      )
    };
  },
  createDegradedOutput(_input, error) {
    return {
      json: JSON.stringify({
        status: "degraded",
        error: error.message
      })
    };
  }
};
