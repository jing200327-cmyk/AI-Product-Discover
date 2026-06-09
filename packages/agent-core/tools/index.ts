import type { ToolDefinition } from "./types";
import { jsonExportTool } from "./jsonExportTool";
import { markdownExportTool } from "./markdownExportTool";
import { mermaidTool } from "./mermaidTool";
import { mockSearchTool } from "./mockSearchTool";
import { ToolRegistry } from "./toolRegistry";

export { jsonExportTool } from "./jsonExportTool";
export { markdownExportTool } from "./markdownExportTool";
export { mermaidTool } from "./mermaidTool";
export { mockSearchTool } from "./mockSearchTool";
export {
  GenericSearchProvider,
  MockSearchProvider,
  createDefaultSearchProvider
} from "./searchProvider";
export type { SearchProvider, SearchProviderInput } from "./searchProvider";
export { ToolRegistry } from "./toolRegistry";
export type {
  PermissionLevel,
  ToolCallOptions,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolExecutionStatus,
  ToolRegistryExecutor,
  ToolTraceLogger
} from "./types";

export const defaultTools = [
  mockSearchTool,
  markdownExportTool,
  jsonExportTool,
  mermaidTool
] as unknown as ToolDefinition<unknown, unknown>[];

export function createDefaultToolRegistry(): ToolRegistry {
  return new ToolRegistry(defaultTools);
}
