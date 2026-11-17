import assert from "node:assert/strict";
import test from "node:test";
import { comparisonLabel } from "./analyticsDisplay.js";

test("analytics comparisons never invent missing percentages", () => {
  assert.equal(comparisonLabel(undefined, "from previous period"), "Comparison unavailable");
  assert.equal(comparisonLabel(null, "archiving rate"), "Comparison unavailable");
});
test("analytics comparisons preserve zero and returned percentage labels", () => {
  assert.equal(comparisonLabel(0, "from previous period"), "0% from previous period");
  assert.equal(comparisonLabel("0.0%", "archiving rate"), "0.0% archiving rate");
  assert.equal(comparisonLabel("-8%", "from previous period"), "-8% from previous period");
});
