import { dobProblem, isAnswered, latestBirthDate, questionById, toYMD } from "../setupQuestions";
import { LEGAL_STATUS, TERMS } from "../legal";
import type { BaselineData } from "../../contexts/BaselineContext";

// HeartLink is for adults aged 18 and over (Terms of Service, 2026-11-18): setup refuses a younger birth date.

const yearsAgo = (years: number, days = 0) => {
  const now = new Date();
  return toYMD(new Date(now.getFullYear() - years, now.getMonth(), now.getDate() + days));
};

describe("Date of birth: adults only", () => {
  it("refuses today, a child and someone a day short of 18", () => {
    expect(dobProblem(toYMD(new Date()))).toBe("under_age");
    expect(dobProblem(yearsAgo(10))).toBe("under_age");
    expect(dobProblem(yearsAgo(18, 1))).toBe("under_age");
  });

  it("accepts someone who turns 18 today, and adults", () => {
    expect(dobProblem(yearsAgo(18))).toBeNull();
    expect(dobProblem("1985-06-15")).toBeNull();
  });

  it("flags a missing or impossible date, and an age over 120", () => {
    expect(dobProblem("")).toBe("missing");
    expect(dobProblem("2001-02-30")).toBe("missing");
    expect(dobProblem(toYMD(new Date(Date.now() + 86400000)))).toBe("missing");
    expect(dobProblem("1890-01-01")).toBe("too_old");
  });

  it("stops the setup question for an under-18 birth date", () => {
    const q = questionById("dob")!;
    expect(isAnswered(q, { date_of_birth: yearsAgo(16) } as BaselineData)).toBe(false);
    expect(isAnswered(q, { date_of_birth: yearsAgo(30) } as BaselineData)).toBe(true);
  });

  it("lets the date picker go no later than 18 years ago", () => {
    expect(latestBirthDate(new Date(2026, 10, 18))).toEqual(new Date(2008, 10, 18));
  });

  it("says the same in the Terms", () => {
    expect(TERMS.sections.find((s) => s.heading === "Your account")?.bullets).toContain("You must be 18 or older.");
    expect(LEGAL_STATUS).toMatch(/Draft/);
  });
});
