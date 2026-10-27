import { HealthReport, medicinesLine, periodLabel, reportHtml, scoreLine } from "../healthReport";

// HL-085: the health report's wording and its PDF.

const REPORT: HealthReport = {
  days: 30,
  period: { start: "2026-09-27", end: "2026-10-27" },
  generated_at: "2026-10-27T08:00:00+00:00",
  days_logged: 21,
  blood_pressure: {
    readings: 3,
    average: { systolic: 133, diastolic: 85, readings: 3 },
    highest: { systolic: 150, diastolic: 95, date: "2026-10-17" },
    lowest: { systolic: 118, diastolic: 76, date: "2026-10-18" },
    morning: { systolic: 141, diastolic: 90, readings: 2 },
    evening: null,
    categories: [
      { key: "crisis", label: "Very high (180/120 or more)", readings: 0 },
      { key: "stage_2", label: "High, stage 2 (140/90 or more)", readings: 1 },
      { key: "normal", label: "Normal (under 120/80)", readings: 2 },
    ],
  },
  pulse: { average: 75, readings: 2 },
  score: { start: 64, end: 71, change: 7 },
  medicines: { answered: 3, taken: 2, percent: 67 },
  sodium: { days_with_meals: 2, average_mg: 1150, limit_mg: 1500, days_over_limit: 1 },
  exercise: { sessions: 2, minutes: 75, minutes_per_week: 18 },
  sleep: { average_hours: 6.5, nights: 2 },
  symptoms: [{ name: "Chest discomfort", times: 2 }],
  alerts: [{ date: "2026-10-26", type: "Hypertensive Crisis" }],
  disclaimer: "For discussion with your doctor. HeartLink is a wellness tool, not a diagnosis.",
};

describe("health report wording", () => {
  it("describes the period, score and medicines plainly", () => {
    expect(periodLabel(REPORT)).toBe("Sep 27, 2026 – Oct 27, 2026");
    expect(scoreLine(REPORT.score)).toBe("64 → 71 (+7)");
    expect(scoreLine({ start: 70, end: 70, change: 0 })).toBe("70 (no change)");
    expect(scoreLine({ start: null, end: null, change: null })).toBe("No score yet");
    expect(medicinesLine(REPORT.medicines)).toBe("67% of check-ins (2 of 3)");
    expect(medicinesLine({ answered: 0, taken: 0, percent: null })).toBe("Not answered");
  });
});

describe("reportHtml", () => {
  it("has the summary, only the categories that happened, and the disclaimer", () => {
    const html = reportHtml(REPORT, "Ana Cruz");
    expect(html).toContain("133/85 mmHg (3 readings)");
    expect(html).toContain("High, stage 2 (140/90 or more)");
    expect(html).not.toContain("Very high (180/120 or more)");
    expect(html).toContain("No evening readings");
    expect(html).toContain("1 of 2 days (limit 1,500 mg)");
    expect(html).toContain("not a diagnosis");
  });

  it("escapes anything typed by a person", () => {
    const html = reportHtml({ ...REPORT, symptoms: [{ name: "<img src=x onerror=alert(1)>", times: 1 }] }, '<b>"Ana"</b>');
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("works with nothing logged", () => {
    const html = reportHtml({ ...REPORT, blood_pressure: { readings: 0 }, symptoms: [], alerts: [] }, "Ana");
    expect(html).toContain("No blood pressure logged in this period");
    expect(html).toContain("None reported");
  });
});
