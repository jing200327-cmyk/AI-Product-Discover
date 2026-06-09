import assert from "node:assert/strict";
import { AgentStateSchema } from "../../shared/schemas";
import { createInitialAgentState } from "./createInitialState";

const state = createInitialAgentState({
  idea: "面向独立开发者的 AI 产品发现工作台",
  targetAudience: "AI 产品经理、创业者、独立开发者和咨询顾问",
  constraints: ["先使用 Mock LLM", "不依赖真实 API Key"]
});

assert.equal(state.currentStage, "idea_input");
assert.equal(state.input.idea, "面向独立开发者的 AI 产品发现工作台");
assert.equal(state.trace.length, 1);
assert.equal(state.trace[0]?.nodeName, "createInitialAgentState");
assert.doesNotThrow(() => AgentStateSchema.parse(state));

console.log("createInitialAgentState validation passed");
