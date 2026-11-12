import {
  HealthReport,
  dayLabel,
  doctorHighlights,
  medicinesLine,
  periodLabel,
  readiness,
  reportFlags,
  reportHtml,
  reportSections,
  scoreLine,
  time12,
} from "../healthReport";

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

const CLINIC: HealthReport = {
  ...REPORT,
  patient: { age: 52, sex: "female", bp_medicine: true, has_diabetes: false, cholesterol_medicine: null },
  blood_pressure: {
    ...(REPORT.blood_pressure as Extract<HealthReport["blood_pressure"], { average: unknown }>),
    highest: { systolic: 150, diastolic: 95, date: "2026-10-17", time: "07:00" },
    average_without_first_day: { systolic: 125, diastolic: 80, readings: 2 },
    at_or_above_target: 1,
  },
  daily: [
    {
      date: "2026-10-18",
      readings: [{ time: "19:30", systolic: 118, diastolic: 76, category: "normal", pulse: 70, medication_taken: true, symptoms: [] }],
      sodium_mg: 1700,
      meals: 2,
      over_sodium_limit: true,
      exercise_minutes: 30,
      sleep_hours: 7,
    },
    {
      date: "2026-10-17",
      readings: [
        { time: "07:00", systolic: 150, diastolic: 95, category: "stage_2", pulse: 80, medication_taken: false, symptoms: ["Chest discomfort"] },
        { time: "12:15", systolic: null, diastolic: null, category: null, pulse: null, medication_taken: null, symptoms: [] },
      ],
      sodium_mg: null,
      meals: 0,
      over_sodium_limit: false,
      exercise_minutes: 0,
      sleep_hours: null,
    },
    { date: "2026-10-16", readings: [], sodium_mg: 600, meals: 1, over_sodium_limit: false, exercise_minutes: 0, sleep_hours: 6.5 },
  ],
};

describe("reportHtml", () => {
  it("has the blood pressure overview, the habits and the disclaimer", () => {
    const html = reportHtml(REPORT, "Ana Cruz");
    expect(html).toContain("133/85 mmHg (3 readings)");
    expect(html).toContain("No evening readings");
    expect(html).toContain("1 of 2 days (limit 1,500 mg)");
    expect(html).toContain("67% of check-ins (2 of 3)");
    expect(html).toContain("not a diagnosis");
  });

  it("escapes anything typed by a person", () => {
    const html = reportHtml(
      { ...CLINIC, symptoms: [{ name: "<img src=x onerror=alert(1)>", times: 1 }], daily: [{ ...CLINIC.daily![1], readings: [{ ...CLINIC.daily![1].readings[0], symptoms: ["<script>x</script>"] }] }] },
      '<b>"Ana"</b>',
    );
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("works with nothing logged", () => {
    const html = reportHtml({ ...REPORT, blood_pressure: { readings: 0 }, symptoms: [], alerts: [], daily: [] }, "Ana");
    expect(html).toContain("No blood pressure logged in this period");
    expect(html).toContain("Nothing flagged");
    expect(html).toContain("Nothing logged in this period");
    expect(html).not.toContain("<svg");
  });

  it("works with an older server that has no daily log", () => {
    const html = reportHtml(REPORT, "Ana");
    expect(html).toContain("Daily log");
    expect(html).toContain("Not answered");
  });
});

describe("the Visit summary for clinics (AMA/AHA Target: BP log)", () => {
  const html = reportHtml(CLINIC, "Ana Cruz");

  it("starts with who the patient is and their health answers", () => {
    expect(html).toContain("Ana Cruz · 52 years old · Female");
    expect(html).toContain("Takes blood pressure medicine: Yes");
    expect(html).toContain("Diabetes: No");
    expect(html).toContain("Takes cholesterol medicine: Not answered");
  });

  it("adds the doctor's blood pressure numbers and a chart", () => {
    expect(html).toContain("125/80 mmHg (2 readings)");
    expect(html).toContain("1 of 3 readings (33%)");
    expect(html).toContain("150/95 on Sat, Oct 17, 7:00 am");
    expect(html).toContain("<svg");
  });

  it("lists every check-in with its time, medicine and symptoms, then the day's habits", () => {
    expect(html).toContain("7:30 pm");
    expect(html).toContain("12:15 pm");
    expect(html).toContain("✗ Not taken");
    expect(html).toContain("✓ Taken");
    expect(html).toContain("2 meals, sodium 1,700 mg ⚠ over the limit · exercise 30 min · sleep 7 h");
    expect(html).toContain("No readings · 1 meal, sodium 600 mg · no exercise logged · sleep 6.5 h");
    expect(html).toContain('rowspan="3"');
    // Newest day first
    expect(html.indexOf("Sun, Oct 18")).toBeLessThan(html.indexOf("Fri, Oct 16"));
  });

  it("puts high readings, symptoms and alerts under Things to look at, newest first", () => {
    const flags = reportFlags(CLINIC);
    expect(flags).toEqual([
      { date: "2026-10-26", time: null, text: "Health alert: Hypertensive Crisis" },
      { date: "2026-10-17", time: "07:00", text: "150/95 (Stage 2) · Chest discomfort · medicine not taken" },
    ]);
    expect(html).toContain("Sat, Oct 17, 7:00 am");
  });
});

describe("PDF helpers", () => {
  it("writes times and days plainly", () => {
    expect(time12("00:05")).toBe("12:05 am");
    expect(time12("12:00")).toBe("12:00 pm");
    expect(time12("19:30")).toBe("7:30 pm");
    expect(dayLabel("2026-11-12")).toBe("Thu, Nov 12");
  });
});

describe("reportSections (HL-096)", () => {
  it("uses the same order as the portal: BP, heart rate, medicine, sleep, symptoms, food, exercise", () => {
    expect(reportSections(REPORT).map((s) => s.title)).toEqual([
      "Heart risk",
      "Blood pressure",
      "Heart rate",
      "Medicine",
      "Sleep",
      "Symptoms",
      "Food",
      "Exercise",
      "Heart health habits",
      "Lab results",
      "Health alerts",
    ]);
  });

  it("lists lab results that still count, and says so when there are none (HL-138)", () => {
    const labs = (r: HealthReport) => reportSections(r).find((s) => s.title === "Lab results")!.rows;
    expect(labs(REPORT)).toEqual([{ label: "Lab results", value: "None added" }]);
    const withLabs = labs({
      ...REPORT,
      lab_results: {
        cholesterol: { test_date: "2026-09-01", total_cholesterol: 200, hdl: 50, cholesterol_medicine: true },
        blood_sugar: { test_date: "2026-09-02", hba1c: 5.4 },
      },
    });
    expect(withLabs[0].value).toBe("Non-HDL 150 mg/dL (total 200, HDL 50), on medicine, Sep 1, 2026");
    expect(withLabs[1].value).toBe("HbA1c 5.4%, Sep 2, 2026");
    expect(reportHtml({ ...REPORT, lab_results: { blood_sugar: { test_date: "2026-09-02", fasting_glucose: 92 } } }, "Ana")).toContain(
      "Fasting 92 mg/dL, Sep 2, 2026",
    );
  });
});


describe("Heart risk in the report (HL-145)", () => {
  it("shows the latest risk, its band and whether it's estimated", () => {
    const rows = (r: HealthReport) => reportSections(r)[0].rows;
    expect(rows(REPORT)).toEqual([{ label: "10-year heart risk", value: "Not worked out yet" }]);
    expect(rows({ ...REPORT, heart_risk: { start: 6.1, end: 4.2, band: "borderline", kind: "estimated" } })).toEqual([
      { label: "10-year heart risk", value: "4.2%, Borderline (estimated)" },
      { label: "At the start of the period", value: "6.1%" },
    ]);
  });
});

describe("the Visit summary screen (2026-11-12)", () => {
  const day = (date: string, times: string[]) => ({
    date,
    readings: times.map((time) => ({ time, systolic: 128, diastolic: 82, category: "stage_1", pulse: 70, medication_taken: true, symptoms: [] })),
    sodium_mg: null,
    meals: 0,
    over_sodium_limit: false,
    exercise_minutes: 0,
    sleep_hours: null,
  });
  const week = (n: number) =>
    Array.from({ length: n }, (_, i) => day(`2026-10-${String(27 - i).padStart(2, "0")}`, ["07:00", "19:30"]));

  it("says how ready the last 7 days are: none, few, enough or a full week", () => {
    expect(readiness(REPORT)).toBeNull(); // an older server without the daily log
    expect(readiness({ ...REPORT, daily: [] })).toMatchObject({ level: "none", title: "No readings in the last 7 days" });
    expect(readiness({ ...REPORT, daily: week(2) })).toMatchObject({ level: "few", days: 2, title: "Readings on 2 of the last 7 days" });
    expect(readiness({ ...REPORT, daily: week(4) })).toMatchObject({ level: "good", days: 4, mornings: 4, evenings: 4 });
    expect(readiness({ ...REPORT, daily: week(7) })).toMatchObject({ level: "full", title: "A full week of readings" });
  });

  it("only counts the last 7 days, days with a blood pressure, and morning and evening by the clock", () => {
    const daily = [
      day("2026-10-27", ["12:30"]), // midday: neither morning nor evening
      day("2026-10-20", ["07:00"]), // 8 days before the end: too old
      { ...day("2026-10-25", ["07:00"]), readings: [{ ...day("x", ["07:00"]).readings[0], systolic: null, diastolic: null }] },
    ];
    expect(readiness({ ...REPORT, daily })).toMatchObject({ days: 1, mornings: 0, evenings: 0 });
  });

  it("shows the doctor's first lines in plain words", () => {
    expect(doctorHighlights(CLINIC)).toEqual([
      { label: "Blood pressure", value: "133/85 average, 3 readings" },
      { label: "At or above 130/80", value: "1 of 3 readings" },
      { label: "Medicine taken", value: "2 of 3 check-ins" },
      { label: "Days with something logged", value: "21 of 30" },
    ]);
    expect(doctorHighlights({ ...REPORT, blood_pressure: { readings: 0 }, medicines: { answered: 0, taken: 0, percent: null } })[0]).toEqual({
      label: "Blood pressure",
      value: "No readings in this period",
    });
  });
});
