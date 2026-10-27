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
  medicines: { answered: number; taken: number; percent: number | null };
  sodium: { days_with_meals: number; average_mg: number | null; limit_mg: number | null; days_over_limit: number };
  exercise: { sessions: number; minutes: number; minutes_per_week: number };
  sleep: { average_hours: number | null; nights: number };
  symptoms: { name: string; times: number }[];
  alerts: { date: string; type: string }[];
  disclaimer: string;
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

/** The PDF page (always light colours, every value escaped). */
export function reportHtml(r: HealthReport, patientName: string): string {
  const P = ds.light;
  const row = (label: string, value: string) =>
    `<tr><td style="color:${P.slate};padding:6px 0;width:48%">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(value)}</td></tr>`;
  const section = (title: string, rows: string) =>
    `<h2>${escapeHtml(title)}</h2><table style="width:100%;border-collapse:collapse">${rows}</table>`;

  const bpRows = hasReadings(r)
    ? [
        row("Average", `${bp(r.blood_pressure.average)} mmHg (${r.blood_pressure.readings} readings)`),
        row("Highest", `${bp(r.blood_pressure.highest)} on ${dateLabel(r.blood_pressure.highest.date)}`),
        row("Lowest", `${bp(r.blood_pressure.lowest)} on ${dateLabel(r.blood_pressure.lowest.date)}`),
        row("Morning average (5–11 AM)", r.blood_pressure.morning ? `${bp(r.blood_pressure.morning)} mmHg` : "No morning readings"),
        row("Evening average (5–10 PM)", r.blood_pressure.evening ? `${bp(r.blood_pressure.evening)} mmHg` : "No evening readings"),
        ...r.blood_pressure.categories.filter((c) => c.readings > 0).map((c) => row(c.label, `${c.readings} readings`)),
      ].join("")
    : row("Readings", "No blood pressure logged in this period");

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;color:${P.ink};padding:28px;font-size:13px}
    h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 4px;padding-bottom:4px;border-bottom:1px solid ${P.hairline}}
    .muted{color:${P.slate}}.note{margin-top:28px;padding:12px;border-radius:8px;background:${P.surface};color:${P.charcoal}}
  </style></head><body>
    <h1>HeartLink health report</h1>
    <div class="muted">${escapeHtml(patientName)} · ${escapeHtml(periodLabel(r))} · logged on ${r.days_logged} of ${r.days} days</div>
    ${section("Blood pressure", bpRows)}
    ${section("Heart and score", row("Average pulse", r.pulse.average === null ? "Not logged" : `${r.pulse.average} bpm`) + row("HeartLink score", scoreLine(r.score)))}
    ${section("Medicines", row("Taken", medicinesLine(r.medicines)))}
    ${section("Food", row("Average sodium a day", r.sodium.average_mg === null ? "No meals logged" : `${r.sodium.average_mg.toLocaleString()} mg`) + (r.sodium.limit_mg ? row("Days over the limit", `${r.sodium.days_over_limit} of ${r.sodium.days_with_meals} days (limit ${r.sodium.limit_mg.toLocaleString()} mg)`) : ""))}
    ${section("Movement and sleep", row("Exercise", `${r.exercise.minutes_per_week} min a week (${r.exercise.sessions} sessions)`) + row("Average sleep", r.sleep.average_hours === null ? "Not logged" : `${r.sleep.average_hours} hours`))}
    ${section("Symptoms", r.symptoms.length ? r.symptoms.map((s) => row(s.name, `${s.times} times`)).join("") : row("Symptoms", "None reported"))}
    ${section("Health alerts", r.alerts.length ? r.alerts.map((a) => row(dateLabel(a.date), a.type)).join("") : row("Alerts", "None"))}
    <div class="note">${escapeHtml(r.disclaimer)}</div>
  </body></html>`;
}
