import { ds } from "../constants/theme";

// HL-085: the doctor-ready health report (Premium), as the server sends it (/api/reports/{userId}?days=30|90), and
// the PDF the patient shares. The report only summarises what was logged; it never diagnoses.

export type ReportDays = 30 | 90;

interface BpSummary {
  systolic: number;
  diastolic: number;
  readings: number;
}
interface BpReading {
  systolic: number;
  diastolic: number;
  date: string;
}

export interface HealthReport {
  days: ReportDays;
  period: { start: string; end: string };
  generated_at: string;
  days_logged: number;
  blood_pressure:
    | { readings: 0 }
    | {
        readings: number;
        average: BpSummary;
        highest: BpReading;
        lowest: BpReading;
        morning: BpSummary | null;
        evening: BpSummary | null;
        categories: { key: string; label: string; readings: number }[];
      };
  pulse: { average: number | null; readings: number };
  score: { start: number | null; end: number | null; change: number | null };
  // HL-139: the Heart risk at the start and end of the period (older servers leave it out)
  heart_risk?: { start: number | null; end: number | null; band: string | null; kind: "calculated" | "estimated" | null };
  medicines: { answered: number; taken: number; percent: number | null };
  sodium: { days_with_meals: number; average_mg: number | null; limit_mg: number | null; days_over_limit: number };
  exercise: { sessions: number; minutes: number; minutes_per_week: number };
  sleep: { average_hours: number | null; nights: number };
  symptoms: { name: string; times: number }[];
  alerts: { date: string; type: string }[];
  // HL-138: lab results the patient added that still count (older servers leave it out)
  lab_results?: { cholesterol?: CholesterolLab; blood_sugar?: BloodSugarLab };
  disclaimer: string;
}

interface CholesterolLab {
  test_date: string;
  total_cholesterol: number;
  hdl: number;
  cholesterol_medicine?: boolean;
}
interface BloodSugarLab {
  test_date: string;
  fasting_glucose?: number;
  hba1c?: number;
  has_diabetes?: boolean;
}

export interface ReportRow {
  label: string;
  value: string;
}
export interface ReportSection {
  title: string;
  rows: ReportRow[];
}

export function hasReadings(r: HealthReport): r is HealthReport & { blood_pressure: Exclude<HealthReport["blood_pressure"], { readings: 0 }> } {
  return r.blood_pressure.readings > 0;
}

export function dateLabel(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function periodLabel(r: Pick<HealthReport, "period">): string {
  return `${dateLabel(r.period.start)} – ${dateLabel(r.period.end)}`;
}

export function bp(v: { systolic: number; diastolic: number } | null | undefined): string {
  return v ? `${v.systolic}/${v.diastolic}` : "–";
}

export function scoreLine(s: HealthReport["score"]): string {
  if (s.start === null || s.end === null) return "No score yet";
  if (s.change === null || s.change === 0) return `${s.end} (no change)`;
  return `${s.start} → ${s.end} (${s.change > 0 ? "+" : ""}${s.change})`;
}

export function medicinesLine(m: HealthReport["medicines"]): string {
  return m.percent === null ? "Not answered" : `${m.percent}% of check-ins (${m.taken} of ${m.answered})`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * HL-096: the report's sections, in the same order the portal groups a patient's records: blood pressure, heart rate,
 * medicine, sleep, symptoms, food, exercise, then the habits score, lab results and alerts, after the Heart risk (HL-145).
 * The screen and the PDF both use it.
 */
export function reportSections(r: HealthReport): ReportSection[] {
  const row = (label: string, value: string): ReportRow => ({ label, value });
  const labs = r.lab_results ?? {};
  const labRows: ReportRow[] = [];
  if (labs.cholesterol) {
    const ch = labs.cholesterol;
    const nonHdl = Math.round(ch.total_cholesterol - ch.hdl);
    labRows.push(row("Cholesterol", `Non-HDL ${nonHdl} mg/dL (total ${ch.total_cholesterol}, HDL ${ch.hdl})${ch.cholesterol_medicine ? ", on medicine" : ""}, ${dateLabel(ch.test_date)}`));
  }
  if (labs.blood_sugar) {
    const bs = labs.blood_sugar;
    const parts = [bs.fasting_glucose != null ? `fasting ${bs.fasting_glucose} mg/dL` : null, bs.hba1c != null ? `HbA1c ${bs.hba1c}%` : null].filter(Boolean);
    const text = parts.join(", ");
    labRows.push(row("Blood sugar", `${text.charAt(0).toUpperCase()}${text.slice(1)}${bs.has_diabetes ? ", has diabetes" : ""}, ${dateLabel(bs.test_date)}`));
  }

  const risk = r.heart_risk;
  const riskRows: ReportRow[] =
    risk && risk.end !== null
      ? [
          row("10-year heart risk", `${risk.end}%${risk.band ? `, ${risk.band.charAt(0).toUpperCase()}${risk.band.slice(1)}` : ""}${risk.kind === "estimated" ? " (estimated)" : ""}`),
          ...(risk.start !== null && risk.start !== risk.end ? [row("At the start of the period", `${risk.start}%`)] : []),
        ]
      : [row("10-year heart risk", "Not worked out yet")];

  return [
    // HL-145: the Heart risk first: the chance of a heart attack or stroke in 10 years (AHA PREVENT)
    { title: "Heart risk", rows: riskRows },
    {
      title: "Blood pressure",
      rows: hasReadings(r)
        ? [
            row("Average", `${bp(r.blood_pressure.average)} mmHg (${r.blood_pressure.readings} readings)`),
            row("Highest", `${bp(r.blood_pressure.highest)} on ${dateLabel(r.blood_pressure.highest.date)}`),
            row("Lowest", `${bp(r.blood_pressure.lowest)} on ${dateLabel(r.blood_pressure.lowest.date)}`),
            row("Morning average (5–11 AM)", r.blood_pressure.morning ? `${bp(r.blood_pressure.morning)} mmHg` : "No morning readings"),
            row("Evening average (5–10 PM)", r.blood_pressure.evening ? `${bp(r.blood_pressure.evening)} mmHg` : "No evening readings"),
            ...r.blood_pressure.categories.filter((c) => c.readings > 0).map((c) => row(c.label, `${c.readings} readings`)),
          ]
        : [row("Readings", "No blood pressure logged in this period")],
    },
    { title: "Heart rate", rows: [row("Average pulse", r.pulse.average === null ? "Not logged" : `${r.pulse.average} bpm (${r.pulse.readings} readings)`)] },
    { title: "Medicine", rows: [row("Taken", medicinesLine(r.medicines))] },
    { title: "Sleep", rows: [row("Average sleep", r.sleep.average_hours === null ? "Not logged" : `${r.sleep.average_hours} hours (${r.sleep.nights} nights)`)] },
    {
      title: "Symptoms",
      rows: r.symptoms.length ? r.symptoms.map((s) => row(s.name, `${s.times} times`)) : [row("Symptoms", "None reported")],
    },
    {
      title: "Food",
      rows: [
        row("Average sodium a day", r.sodium.average_mg === null ? "No meals logged" : `${r.sodium.average_mg.toLocaleString()} mg`),
        ...(r.sodium.limit_mg
          ? [row("Days over the limit", `${r.sodium.days_over_limit} of ${r.sodium.days_with_meals} days (limit ${r.sodium.limit_mg.toLocaleString()} mg)`)]
          : []),
      ],
    },
    { title: "Exercise", rows: [row("Exercise", `${r.exercise.minutes_per_week} min a week (${r.exercise.sessions} sessions)`)] },
    { title: "Heart health habits", rows: [row("Habits score", scoreLine(r.score))] },
    { title: "Lab results", rows: labRows.length ? labRows : [row("Lab results", "None added")] },
    {
      title: "Health alerts",
      rows: r.alerts.length ? r.alerts.map((a) => row(dateLabel(a.date), a.type)) : [row("Alerts", "None")],
    },
  ];
}

/** The PDF page (always light colours, every value escaped). */
export function reportHtml(r: HealthReport, patientName: string): string {
  const P = ds.light;
  const row = ({ label, value }: ReportRow) =>
    `<tr><td style="color:${P.slate};padding:6px 0;width:48%">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(value)}</td></tr>`;
  const sections = reportSections(r)
    .map((s) => `<h2>${escapeHtml(s.title)}</h2><table style="width:100%;border-collapse:collapse">${s.rows.map(row).join("")}</table>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;color:${P.ink};padding:28px;font-size:13px}
    h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 4px;padding-bottom:4px;border-bottom:1px solid ${P.hairline}}
    .muted{color:${P.slate}}.note{margin-top:28px;padding:12px;border-radius:8px;background:${P.surface};color:${P.charcoal}}
  </style></head><body>
    <h1>HeartLink health report</h1>
    <div class="muted">${escapeHtml(patientName)} · ${escapeHtml(periodLabel(r))} · logged on ${r.days_logged} of ${r.days} days</div>
    ${sections}
    <div class="note">${escapeHtml(r.disclaimer)}</div>
  </body></html>`;
}
