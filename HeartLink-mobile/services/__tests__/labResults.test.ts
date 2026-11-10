import { countsText, fromMgDl, toMgDl } from "../labResults";

// HL-138: Philippine lab results often come in mmol/L; the server keeps mg/dL
describe("lab result units", () => {
  it("converts mmol/L to mg/dL with the standard factors", () => {
    expect(toMgDl("5.2", "mmol", "cholesterol")).toBe(201); // 5.2 x 38.67
    expect(toMgDl("5,6", "mmol", "glucose")).toBe(101); // a comma works as a decimal point
    expect(toMgDl("190", "mgdl", "cholesterol")).toBe(190);
  });

  it("refuses empty or non-numbers", () => {
    expect(toMgDl("", "mgdl", "glucose")).toBeNull();
    expect(toMgDl("abc", "mmol", "glucose")).toBeNull();
    expect(toMgDl("0", "mgdl", "glucose")).toBeNull();
  });

  it("shows a saved mg/dL value in the chosen unit", () => {
    expect(fromMgDl(201, "mmol", "cholesterol")).toBe("5.2");
    expect(fromMgDl(99, "mgdl", "glucose")).toBe("99");
    expect(fromMgDl(undefined, "mmol", "glucose")).toBe("");
  });
});

describe("whether a result still counts", () => {
  const base = { kind: "cholesterol" as const, test_date: "2026-10-01", note: null };
  it("says until when, or that it's too old", () => {
    expect(countsText(null)).toBe("Not added");
    expect(countsText({ ...base, counts: true, counts_until: "2027-10-01" })).toMatch(/^Counts in your Heart score until/);
    expect(countsText({ ...base, counts: false, counts_until: "2026-10-01" })).toMatch(/no longer counts/);
  });
});
