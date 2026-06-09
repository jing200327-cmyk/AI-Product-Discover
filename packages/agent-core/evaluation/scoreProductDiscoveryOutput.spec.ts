import assert from "node:assert/strict";
import { createInitialAgentState } from "../state/createInitialState";
import { scoreProductDiscoveryOutput } from "./scoreProductDiscoveryOutput";

const state = createInitialAgentState({
  idea: "为独立开发者提供 AI 产品发现工作台"
});
const evaluation = scoreProductDiscoveryOutput(state);

assert.ok(evaluation.totalScore >= 0 && evaluation.totalScore <= 100);
assert.equal(evaluation.graderMode, "deterministic");
assert.equal(evaluation.dimensionDetails.completeness.weight, 25);
assert.equal(evaluation.dimensionDetails.credibility.weight, 25);
assert.equal(evaluation.dimensionDetails.differentiation.weight, 20);
assert.equal(evaluation.dimensionDetails.developability.weight, 20);
assert.equal(evaluation.dimensionDetails.clarity.weight, 10);
assert.equal(
  Object.values(evaluation.dimensionDetails).reduce(
    (sum, dimension) => sum + dimension.weight,
    0
  ),
  100
);
assert.ok(evaluation.deductionReasons.length > 0);

console.log("product discovery evaluation validation passed");
