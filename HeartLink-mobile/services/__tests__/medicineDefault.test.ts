import { startsWithNoMedicines } from "../medicineDefault";

describe("Medicines today: the answer the check-in starts with (2026-11-19)", () => {
  const none = { bp_medicine: false, cholesterol_medicine: false, has_diabetes: false };

  it("starts on \"I don't take any\" when setup said no BP or cholesterol medicine and no diabetes", () => {
    expect(startsWithNoMedicines(null, none)).toBe(true);
  });

  it("asks when setup said they take BP or cholesterol medicine, or have diabetes", () => {
    expect(startsWithNoMedicines(null, { ...none, bp_medicine: true })).toBe(false);
    expect(startsWithNoMedicines(null, { ...none, cholesterol_medicine: true })).toBe(false);
    expect(startsWithNoMedicines(null, { ...none, has_diabetes: true })).toBe(false);
  });

  it("asks when setup's answers are missing", () => {
    expect(startsWithNoMedicines(null, null)).toBe(false);
    expect(startsWithNoMedicines(null, { bp_medicine: null, cholesterol_medicine: false })).toBe(false);
  });

  it("the patient's own answer on this phone wins over setup", () => {
    expect(startsWithNoMedicines("true", { ...none, bp_medicine: true })).toBe(true);
    expect(startsWithNoMedicines("false", none)).toBe(false);
  });
});
