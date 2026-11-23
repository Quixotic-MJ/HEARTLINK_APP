import { conditionsSentence, goalLabel, needsScreening } from "../setupScreening";

// HL-164: the health check before setup and the main goal.

describe("the health check before setup", () => {
  it("names what the person ticked in the advice", () => {
    expect(conditionsSentence(["kidney_disease"])).toBe("You told us you have kidney disease.");
    expect(conditionsSentence(["heart_disease", "kidney_disease"])).toBe("You told us you have heart disease and kidney disease.");
    expect(conditionsSentence(["stroke", "pregnancy"])).toBe(
      "You told us you have had a stroke or mini-stroke and are pregnant."
    );
  });

  it("sends a half-finished setup back to the start until the notice and health check are done", () => {
    expect(needsScreening({})).toBe(true);
    expect(needsScreening({ agreed_notice: true })).toBe(true);
    expect(needsScreening({ agreed_notice: true, health_check_done: true, health_conditions: [] })).toBe(false);
  });

  it("needs the doctor's OK when a condition was ticked", () => {
    const ticked = { agreed_notice: true, health_check_done: true, health_conditions: ["pregnancy"] };
    expect(needsScreening(ticked)).toBe(true);
    expect(needsScreening({ ...ticked, doctor_cleared: true })).toBe(false);
  });
});

describe("the main goal", () => {
  it("shows a saved goal in words, and nothing for an unknown or missing one", () => {
    expect(goalLabel("less_salt")).toBe("Eat less salt");
    expect(goalLabel("nope")).toBeNull();
    expect(goalLabel(null)).toBeNull();
  });
});
