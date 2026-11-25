import { DOCTOR, docAsText, legalDoc } from "../legal";
import { CHOLESTEROL_LIMIT_MG, SODIUM_LIMIT_MG } from "../../services/dailyLimits";
import { SPO2_EMERGENCY_MAX } from "../../services/vitalsCheck";

// 2026-11-24 (panel revision): "For your doctor", a page the user can show or send their doctor. It must say what the
// app really does, so it is checked against the app's own limits.

describe("For your doctor page", () => {
  it("opens from ?doc=doctor", () => {
    expect(legalDoc("doctor")).toBe(DOCTOR);
    expect(legalDoc("terms").title).toBe("Terms of Service");
  });

  it("matches the app's limits and emergencies", () => {
    const text = docAsText(DOCTOR);
    expect(text).toContain(`sodium ${SODIUM_LIMIT_MG.toLocaleString("en-US")} mg`);
    expect(text).toContain(`cholesterol ${CHOLESTEROL_LIMIT_MG} mg`);
    expect(text).toContain(`Blood oxygen of ${SPO2_EMERGENCY_MAX}% or lower`);
    expect(text).toContain("180 systolic or more, or 120 diastolic or more");
    expect(text).toContain("under 90 systolic or under 60 diastolic");
  });

  it("is honest that nobody monitors and nobody checks the doctor's answer", () => {
    const text = docAsText(DOCTOR);
    expect(text).toContain("Nobody monitors the readings.");
    expect(text).toContain("HeartLink can't check whether you said yes.");
    expect(text).toMatch(/^For your doctor\n\n/);
    expect(text).toContain("- Is it safe for this patient to use HeartLink?");
  });
});
