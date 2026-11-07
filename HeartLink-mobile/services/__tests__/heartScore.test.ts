import { AREA_ROWS, areaDetail, basedOnText, pressureText, ruleText } from "../heartScore";

describe("areaDetail", () => {
  it("says where each area's points come from", () => {
    expect(areaDetail("blood_pressure", { points: 50, systolic: 134, diastolic: 86, readings: 3, days: 7 })).toBe("134/86, average of 3 readings this week");
    expect(areaDetail("blood_pressure", { points: 50, systolic: 134, diastolic: 86, readings: 1, days: 7 })).toBe("134/86, average of 1 reading this week");
    expect(areaDetail("blood_pressure", { points: 25, systolic: 150, diastolic: 95, readings: 1, days: 30 })).toBe("150/95, your latest reading");
    expect(areaDetail("activity", { points: 90, minutes: 120, goal: 150, from: "logs" })).toBe("120 of 150 minutes this week");
    expect(areaDetail("activity", { points: 100, minutes: 0, goal: 150, from: "setup" })).toBe("From your setup answers for now");
    expect(areaDetail("sleep", { points: 70, hours: 6.5, nights: 2, from: "logs" })).toBe("6.5 hours on average, 2 nights logged");
    expect(areaDetail("sleep", { points: 100, hours: 7.5, nights: 0, from: "setup" })).toBe("7.5 hours, from your setup answers");
    expect(areaDetail("body_weight", { points: 75, bmi: 24 })).toBe("BMI 24");
    expect(areaDetail("diet", { points: 50, sodium_days_over: 2, sodium_from: "logs" })).toBe("Sodium over your limit on 2 of the last 7 days");
    expect(areaDetail("diet", { points: 50, sodium_from: "setup" })).toBe("From your setup answers for now");
  });

  it("describes nicotine, and asks for a quit date if there isn't one", () => {
    expect(areaDetail("nicotine", { points: 100, status: "never" })).toBe("Never smoked");
    expect(areaDetail("nicotine", { points: 0, status: "current" })).toBe("Smoking or vaping now");
    expect(areaDetail("nicotine", { points: 75, status: "quit", quit_when: "5_plus_years" })).toBe("Quit 5 or more years ago");
    expect(areaDetail("nicotine", { points: 25, status: "quit", quit_when: null })).toBe("Quit. Tell us when in Settings");
  });
});

describe("the score's summary", () => {
  it("says how many areas it used", () => {
    expect(basedOnText({ areas_used: 6, areas_total: 8 })).toBe("Based on 6 of 8 areas");
    expect(basedOnText({})).toBe("Starting estimate from your setup answers");
    expect(basedOnText(null)).toBeNull();
  });

  it("puts blood pressure first, even with no reading", () => {
    expect(AREA_ROWS[0].key).toBe("blood_pressure");
    expect(pressureText({ areas: { blood_pressure: { points: 50, systolic: 134, diastolic: 86, days: 7 } } })).toBe("Blood pressure 134/86, this week's average");
    expect(pressureText({ areas: { blood_pressure: { points: 25, systolic: 150, diastolic: 95, days: 30 } } })).toBe("Blood pressure 150/95, your latest reading");
    expect(pressureText({ areas: {} })).toBe("No recent blood pressure reading");
    expect(pressureText({})).toBeNull();
  });

  it("explains each rule that can change the score", () => {
    expect(ruleText("stage_2_limit")).toContain("can't go above 59");
    expect(ruleText("stage_1_limit")).toContain("can't go above 79");
    expect(ruleText("no_recent_reading")).toContain("can't go above 79");
    expect(ruleText("emergency_limit")).toContain("under 50");
    expect(ruleText("floor")).toContain("below 50");
    expect(ruleText(null)).toBeNull();
    expect(ruleText("unknown")).toBeNull();
  });
});
