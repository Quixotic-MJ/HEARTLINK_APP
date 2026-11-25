import test from "node:test";
import assert from "node:assert/strict";
import {
  cardioAnswered,
  cardioSummary,
  itemAnswered,
  itemCounter,
  itemQuestion,
  noteQuestion,
  resultSentence,
} from "./reviewQuestions.js";

// HL-168: the expert's questions, one at a time.

test("each question needs its answer before going on", () => {
  assert.equal(cardioAnswered("risk", { band: "" }), false);
  assert.equal(cardioAnswered("risk", { band: "high", percent: "" }), true);
  assert.equal(cardioAnswered("risk", { band: "high", percent: "120" }), false);
  assert.equal(cardioAnswered("risk", { band: "high", percent: "12.5" }), true);
  assert.equal(cardioAnswered("reasons", { reasons: [] }), false);
  assert.equal(cardioAnswered("reasons", { reasons: ["smoking"] }), true);
  assert.equal(cardioAnswered("sure", { confidence: "medium" }), true);
  assert.equal(cardioAnswered("checkup", {}), false);
});

test("check your answers, in plain words", () => {
  assert.deepEqual(
    cardioSummary({ band: "high", percent: "12", reasons: ["blood_pressure", "smoking"], confidence: "medium", checkup: "within_2_weeks", notes: " " }),
    [
      ["Heart risk", "High (your number: 12%)"],
      ["Why", "Blood pressure, Smoking"],
      ["How sure", "Fairly sure"],
      ["See a doctor in person", "Yes, within 2 weeks"],
    ]
  );
});

test("says what the app said after submitting", () => {
  assert.equal(
    resultSentence("high", { band: "intermediate", percent: 6.2 }),
    "The app said Intermediate (about 6 in 100). You said High. The app rated this person lower than you."
  );
  assert.equal(resultSentence("low", { band: "low", percent: 1.4 }), "The app said Low (about 1 in 100). You said Low. The app agreed with you.");
  assert.match(resultSentence("low", { band: "borderline", percent: 4 }), /rated this person higher than you\.$/);
  assert.match(resultSentence("low", null), /^You said Low\. The app had no heart risk/);
});

test("one recipe or exercise at a time", () => {
  assert.equal(itemQuestion("nutrition"), "Would you suggest this recipe to this person?");
  assert.equal(itemQuestion("exercise"), "Would you suggest this exercise to this person?");
  assert.equal(noteQuestion("changes"), "What should change?");
  assert.equal(noteQuestion("no"), "Why not?");
  assert.equal(itemAnswered({ verdict: "ok" }), true);
  assert.equal(itemAnswered({ verdict: "no", note: "" }), false);
  assert.equal(itemAnswered({ verdict: "changes", note: "Less salt" }), true);
  assert.equal(itemCounter("nutrition", 1, 6), "Recipe 2 of 6");
});
