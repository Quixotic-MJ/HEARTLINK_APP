import {
  BREATH,
  CHEST,
  FAINTED,
  completeReading,
  completeSpo2,
  isHypertensiveCrisis,
  isLowOxygenEmergency,
  isOxygenLow,
  isSevereHypotension,
  isSymptomEmergency,
} from "../vitalsCheck";

describe("completeReading", () => {
  it("waits for both numbers before judging a reading", () => {
    expect(completeReading("1", "")).toBeNull();
    expect(completeReading("12", "8")).toBeNull();
    expect(completeReading("128", "")).toBeNull();
    expect(completeReading("128", "82")).toEqual({ sys: 128, dia: 82 });
  });

  it("ignores numbers outside what a cuff can read", () => {
    expect(completeReading("12", "80")).toBeNull();
    expect(completeReading("128", "8.5")).toBeNull();
  });
});

describe("emergency thresholds (unchanged)", () => {
  it("flags a hypertensive crisis at 180 systolic or 120 diastolic", () => {
    expect(isHypertensiveCrisis(completeReading("180", "100"))).toBe(true);
    expect(isHypertensiveCrisis(completeReading("150", "120"))).toBe(true);
    expect(isHypertensiveCrisis(completeReading("179", "119"))).toBe(false);
  });

  it("flags severe low blood pressure under 90 systolic or 60 diastolic", () => {
    expect(isSevereHypotension(completeReading("89", "70"))).toBe(true);
    expect(isSevereHypotension(completeReading("110", "59"))).toBe(true);
    expect(isSevereHypotension(completeReading("90", "60"))).toBe(false);
  });

  it("never fires while a number is half typed", () => {
    expect(isSevereHypotension(completeReading("1", ""))).toBe(false);
    expect(isSevereHypotension(completeReading("12", ""))).toBe(false);
  });

  it("flags chest discomfort of 7 or more, and shortness of breath only once 'while resting' is chosen", () => {
    expect(isSymptomEmergency([CHEST], { [CHEST]: 7 }, null)).toBe(true);
    expect(isSymptomEmergency([CHEST], { [CHEST]: 6 }, "While resting")).toBe(false);
    expect(isSymptomEmergency([BREATH], {}, null)).toBe(false);
    expect(isSymptomEmergency([BREATH], {}, "While resting")).toBe(true);
    expect(isSymptomEmergency([BREATH], {}, "During physical activity")).toBe(false);
  });

  it("flags fainting or nearly fainting on its own, with no strength or 'when' needed", () => {
    expect(isSymptomEmergency([FAINTED], {}, null)).toBe(true);
    expect(isSymptomEmergency(["Dizziness / Lightheadedness"], { "Dizziness / Lightheadedness": 10 }, null)).toBe(false);
  });
});

// HL-166 (panel revision): the optional oxygen reading. Proposed thresholds, pending the cardiologist.
describe("oxygen (SpO2)", () => {
  it("waits for a whole number from 50 to 100", () => {
    expect(completeSpo2("9")).toBeNull();
    expect(completeSpo2("97")).toBe(97);
    expect(completeSpo2("101")).toBeNull();
    expect(completeSpo2("")).toBeNull();
  });

  // 2026-11-25: matches MedlinePlus (NIH) and Cleveland Clinic: 88% or lower = immediate care, 92% or lower = doctor
  it("is an emergency at 88% or lower, a 'contact your doctor' note from 89 to 92%, and no note from 93%", () => {
    expect(isLowOxygenEmergency(88)).toBe(true);
    expect(isLowOxygenEmergency(89)).toBe(false);
    expect(isOxygenLow(89)).toBe(true);
    expect(isOxygenLow(92)).toBe(true);
    expect(isOxygenLow(88)).toBe(false);
    expect(isOxygenLow(93)).toBe(false);
    expect(isLowOxygenEmergency(null) || isOxygenLow(null)).toBe(false);
  });
});
