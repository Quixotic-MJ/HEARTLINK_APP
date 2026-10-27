import { LongTermBucket, LongTermStretch, bucketDays, bucketName, bucketPressure, isLongTerm, monthCompareRows, patternBasis, periodName, spanName } from "../longTermTrends";

// HL-086: shaping the long-term Trends from the server for the screen.

const stretch = (over: Partial<LongTermStretch> = {}): LongTermStretch => ({
  start: "2026-09-28",
  end: "2026-10-27",
  score: null,
  systolic: null,
  diastolic: null,
  readings: 0,
  pulse: null,
  sodium_mg: null,
  sodium_days: 0,
  days_over_limit: 0,
  exercise_minutes_per_week: 0,
  sleep_hours: null,
  medicines_percent: null,
  ...over,
});

const bucket = (start: string, label: string, over: Partial<LongTermStretch> = {}): LongTermBucket => ({ ...stretch({ start, ...over }), label });

describe("periods", () => {
  it("knows which periods are long-term and names them", () => {
    expect([7, 14, 30, 90, 365].filter(isLongTerm)).toEqual([90, 365]);
    expect([30, 90, 365].map(periodName)).toEqual(["30 days", "90 days", "1 year"]);
    expect([90, 365].map(spanName)).toEqual(["90 days", "year"]);
  });
});

describe("buckets", () => {
  const buckets = [bucket("2026-10-14", "Oct 14", { systolic: 135, diastolic: 87 }), bucket("2026-10-21", "Oct 21")];

  it("puts each week on the phone's own calendar day", () => {
    const days = bucketDays(buckets);
    expect(days.map((d) => d.key)).toEqual(["2026-10-14", "2026-10-21"]);
    expect([days[0].date.getFullYear(), days[0].date.getMonth(), days[0].date.getDate()]).toEqual([2026, 9, 14]);
  });

  it("leaves a week with no readings empty", () => {
    expect(bucketPressure(buckets)).toEqual([{ sys: 135, dia: 87 }, null]);
  });

  it("names a week or a month", () => {
    expect(bucketName(buckets[1], "week")).toBe("the week of Oct 21");
    expect(bucketName(bucket("2026-10-01", "Oct"), "month")).toBe("October");
  });
});

describe("this month vs last", () => {
  it("shows both sides and how it moved", () => {
    const rows = monthCompareRows({
      this: stretch({ systolic: 128, diastolic: 82, pulse: 72, sleep_hours: 6.5, exercise_minutes_per_week: 90, medicines_percent: 80 }),
      last: stretch({ systolic: 132, diastolic: 85, pulse: 72, sleep_hours: 7, exercise_minutes_per_week: 60 }),
    });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.bp).toMatchObject({ now: "128/82", before: "132/85", change: "Down 4 mmHg" });
    expect(byKey.pulse.change).toBe("Same");
    expect(byKey.sleep.change).toBe("Down 0.5 h");
    expect(byKey.exercise.change).toBe("Up 30 min");
    // nothing logged on one side: no change line, and "--" rather than a made-up number
    expect(byKey.medicines).toMatchObject({ now: "80%", before: "--", change: "" });
    expect(byKey.sodium).toMatchObject({ now: "--", before: "--", change: "" });
  });
});

describe("pattern notes", () => {
  it("say what they are based on", () => {
    const note = (key: "sodium" | "exercise" | "medicines", a: number, b: number) =>
      patternBasis({ key, text: "", difference: 0, with: { label: "", systolic: 0, days: a }, without: { label: "", systolic: 0, days: b } });
    expect(note("sodium", 6, 9)).toBe("Based on 6 days over your limit and 9 days under it.");
    expect(note("exercise", 5, 12)).toBe("Based on 5 exercise days and 12 rest days.");
    expect(note("medicines", 20, 5)).toBe("Based on 20 days you took them and 5 days you missed them.");
  });
});
