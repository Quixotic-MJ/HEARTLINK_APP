import test from "node:test";
import assert from "node:assert/strict";
import { bloodPressureLine, healthCheckView, labLines, medicineLine, personLine, symptomsLine } from "./aboutPerson.js";

// HL-168: "About this person" as plain sentences.

const about = {
  bp_medicine: true,
  diabetes: false,
  cholesterol_medicine: null,
  smoking: "now",
  labs: [
    { kind: "cholesterol", test_date: "2026-10-02T00:00:00", total_cholesterol: 220, hdl: 45 },
    { kind: "kidney", test_date: "2026-10-02T00:00:00", egfr: 85 },
  ],
  blood_pressure: { readings: 12, average: "138/86", highest: "152/94" },
  symptoms: { Dizziness: 2, Headache: 1 },
  health_check: { asked: true, conditions: ["kidney_disease", "stroke"], doctor_cleared: true },
};

test("writes the person in plain sentences", () => {
  assert.equal(personLine({ age: 52, sex: "female", height_cm: 158, weight_kg: 70 }), "52-year-old woman, 158 cm, 70 kg.");
  assert.equal(personLine({ sex: "male" }), "A man (age not given).");
  assert.equal(
    medicineLine(about),
    "Takes blood pressure medicine. No diabetes. Cholesterol medicine: not answered. Smokes now."
  );
  assert.deepEqual(labLines(about), ["Cholesterol test (Oct 2): total 220, HDL 45 mg/dL.", "Kidney test (Oct 2): eGFR 85."]);
  assert.deepEqual(labLines({ labs: [] }), ["No lab results."]);
  assert.equal(bloodPressureLine(about), "Blood pressure, last 30 days: 12 readings, average 138/86, highest 152/94.");
  assert.equal(bloodPressureLine({}), "No blood pressure readings in the last 30 days.");
  assert.equal(symptomsLine(about), "Symptoms: dizziness twice, headache once.");
  assert.equal(symptomsLine({ symptoms: {} }), "No symptoms logged.");
});

test("explains the health check and flags a condition", () => {
  const ticked = healthCheckView(about);
  assert.equal(
    ticked.text,
    "Ticked kidney disease and a stroke or mini-stroke. Says their doctor said OK to use HeartLink (HeartLink can't check this)."
  );
  assert.equal(ticked.flag, true);
  assert.deepEqual(healthCheckView({ health_check: { asked: true, conditions: [] } }), {
    text: "None of the conditions HeartLink isn't made for.",
    flag: false,
  });
  assert.equal(healthCheckView({ health_check: { asked: false } }).flag, false);
  assert.match(healthCheckView(undefined).text, /^Not asked/);
});
