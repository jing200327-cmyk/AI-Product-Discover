import { z } from "zod";
import { PageSpecSchema } from "../../shared/schemas";
import type { ToolDefinition } from "./types";

export const MermaidInputSchema = z
  .object({
    pageStructure: z.array(PageSpecSchema)
  })
  .strict();

export const MermaidOutputSchema = z
  .object({
    mermaid: z.string().min(1)
  })
  .strict();

export type MermaidInput = z.infer<typeof MermaidInputSchema>;
export type MermaidOutput = z.infer<typeof MermaidOutputSchema>;

const sanitizeNodeId = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]/g, "_").replace(/^(\d)/, "_$1");

export const mermaidTool: ToolDefinition<MermaidInput, MermaidOutput> = {
  name: "mermaid",
  description: "Generates a simple Mermaid page flow diagram from page structure.",
  permissionLevel: "safe_read",
  timeoutMs: 2000,
  retry: 0,
  inputSchema: MermaidInputSchema,
  outputSchema: MermaidOutputSchema,
  handler(input) {
    const pages = input.pageStructure;
    const nodes = pages.map((page) => {
      const nodeId = sanitizeNodeId(page.id);
      return `  ${nodeId}["${page.name}"]`;
    });
    const edges = pages.flatMap((page, index) => {
      const from = sanitizeNodeId(page.id);
      const nextPage = pages[index + 1];
      const sequentialEdge = nextPage
        ? [`  ${from} --> ${sanitizeNodeId(nextPage.id)}`]
        : [];
      const transitionEdges = page.transitions.map(
        (transition, transitionIndex) =>
          `  ${from} -. "${transition}" .-> ${from}_${transitionIndex}["${transition}"]`
      );

      return [...sequentialEdge, ...transitionEdges];
    });

    return {
      mermaid: ["flowchart TD", ...nodes, ...edges].join("\n")
    };
  },
  createDegradedOutput(_input, error) {
    return {
      mermaid: `flowchart TD\n  degraded["Mermaid 生成降级：${error.message}"]`
    };
  }
};
