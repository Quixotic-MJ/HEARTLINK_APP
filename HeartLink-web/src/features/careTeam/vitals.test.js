import { test } from "node:test";
import assert from "node:assert/strict";
import { riskBand, riskMissingText, riskOfRecord, riskPercent } from "./vitals.js";

test("risk percent: one decimal, no trailing .0, and under 1%", () => {
  assert.equal(riskPercent(9.2), "9.2%");
  assert.equal(riskPercent(10), "10%");
  assert.equal(riskPercent(0.4), "Under 1%");
  assert.equal(riskPercent(null), null);
});

test("risk bands follow the 2026 ACC/AHA labels", () => {
  assert.equal(riskBand("low").label, "Low");
  assert.equal(riskBand("borderline").label, "Borderline");
  assert.equal(riskBand("intermediate").label, "Intermediate");
  assert.equal(riskBand("high").label, "High");
  assert.match(riskBand("high").dotClass, /error/);
  assert.equal(riskBand(undefined).label, "No band");
});

test("a history record's risk comes from contributing_factors, and older records have none", () => {
  const risk = { available: true, ascvd_10: 4.1, band: "borderline", kind: "estimated" };
  assert.deepEqual(riskOfRecord({ contributing_factors: { risk } }), risk);
  assert.equal(riskOfRecord({ contributing_factors: { method: "le8" } }), null);
  assert.equal(riskOfRecord(null), null);
});

test("missing risk reasons are short and plain", () => {
  assert.equal(riskMissingText({ available: false, reason: "age" }), "Ages 30 to 79 only");
  assert.equal(riskMissingText({ available: false, reason: "questions" }), "3 questions not answered");
  assert.equal(riskMissingText(null), "Not worked out");
});
