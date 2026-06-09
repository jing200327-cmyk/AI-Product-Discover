import { z } from "zod";
import { SourceItemSchema } from "../../shared/schemas";
import { createDefaultSearchProvider } from "./searchProvider";
import type { ToolDefinition } from "./types";

export const MockSearchInputSchema = z
  .object({
    searchQueries: z.array(z.string().trim().min(1)).min(1),
    limit: z.number().int().positive().max(10).default(3)
  })
  .strict();

export const MockSearchOutputSchema = z
  .object({
    sources: z.array(SourceItemSchema)
  })
  .strict();

export type MockSearchInput = z.infer<typeof MockSearchInputSchema>;
export type MockSearchOutput = z.infer<typeof MockSearchOutputSchema>;

export const mockSearchTool: ToolDefinition<MockSearchInput, MockSearchOutput> = {
  name: "mockSearch",
  description:
    "Runs the configured search provider. Defaults to deterministic mock search.",
  permissionLevel: "safe_read",
  timeoutMs: 20000,
  retry: 0,
  inputSchema: MockSearchInputSchema,
  outputSchema: MockSearchOutputSchema,
  async handler(input) {
    const searchProvider = createDefaultSearchProvider();
    const sources = await searchProvider.search({
      searchQueries: input.searchQueries,
      limit: input.limit
    });

    return { sources };
  },
  createDegradedOutput() {
    return { sources: [] };
  }
};
