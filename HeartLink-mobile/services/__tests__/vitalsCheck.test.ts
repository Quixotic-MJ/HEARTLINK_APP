import { BREATH, CHEST, completeReading, isHypertensiveCrisis, isSevereHypotension, isSymptomEmergency } from "../vitalsCheck";

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
});
