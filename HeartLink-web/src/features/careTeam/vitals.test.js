import { test } from "node:test";
import assert from "node:assert/strict";
import { answerText, exerciseCheckView, riskBand, riskMissingText, riskOfRecord, riskPercent } from "./vitals.js";

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

test("the heart answers read Yes, No or Not answered", () => {
  assert.equal(answerText(true), "Yes");
  assert.equal(answerText(false), "No");
  assert.equal(answerText(null), "Not answered");
  assert.equal(answerText(undefined), "Not answered");
});

test("the PAR-Q+ result says what the app allows", () => {
  assert.equal(exerciseCheckView({ state: "eligible" }).label, "Eligible");
  assert.equal(exerciseCheckView({ state: "caution", cleared: false }).label, "Eligible with caution");
  assert.equal(exerciseCheckView({ state: "caution", cleared: true }).label, "Cleared");
  assert.equal(exerciseCheckView({ state: "delayed" }).label, "Delayed");
  assert.match(exerciseCheckView({ state: "locked" }).detail, /until a professional clears them/);
  assert.match(exerciseCheckView({ state: "needed", reason: "expired" }).detail, /^Over 12 months old/);
  assert.equal(exerciseCheckView(null).label, "Needs answering");
});
