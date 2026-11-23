import test from "node:test";
import assert from "node:assert/strict";
import { datasetStatusView, verdictSummary } from "./caseDataset.js";

// HL-165: the "Use for the dataset" panel's wording.

test("sums up a food or exercise check", () => {
  const section = {
    item_verdicts: [{ verdict: "ok" }, { verdict: "no" }, { verdict: "ok" }, { verdict: "changes" }],
  };
  assert.equal(verdictSummary(section), "2 suitable, 1 suitable with changes, 1 not suitable");
  assert.equal(verdictSummary(null), null);
  assert.equal(verdictSummary({ item_verdicts: [] }), null);
});

test("says who approved or left out a case, and why", () => {
  const approved = datasetStatusView({ status: "approved", decided_by_name: "Dr Cruz", decided_at: "2026-11-23T08:00:00Z" });
  assert.equal(approved.label, "Approved for the dataset");
  assert.equal(approved.detail, "Approved by Dr Cruz on Nov 23.");
  const out = datasetStatusView({ status: "left_out", decided_by_name: "Dr Cruz", note: "Faulty cuff" });
  assert.equal(out.detail, "Left out by Dr Cruz: Faulty cuff.");
});

test("says what a case still waits for", () => {
  assert.equal(
    datasetStatusView({ status: "waiting", waiting_for: "the Dietitian" }).detail,
    "Waiting for the Dietitian before the Cardiologist can approve it."
  );
  assert.match(datasetStatusView({ status: "waiting", practice: true }).detail, /practice review/);
  assert.match(datasetStatusView({}).detail, /Every part is in/);
});
