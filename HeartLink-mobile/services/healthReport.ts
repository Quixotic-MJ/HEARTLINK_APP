import { ds } from "../constants/theme";

// HL-085: the doctor-ready report, shown as the Visit summary, as the server sends it (/api/reports/{userId}?days=7|30|90),
// and the PDF the patient shares. 7 days are free; 30 and 90 are Premium (2026-11-12). The report only summarises what was logged; it never diagnoses.

export type ReportDays = 7 | 30 | 90;

interface BpSummary {
  systolic: number;
  diastolic: number;
  readings: number;
}
interface BpReading {
  systolic: number;
  diastolic: number;
  date: string;
  // 2026-11-12: "HH:MM", local time (older servers leave it out)
  time?: string;
}

// 2026-11-12, for clinics: one check-in in the daily log
export interface DailyReading {
  time: string;
  systolic: number | null;
  diastolic: number | null;
  category: string | null;
  pulse: number | null;
  medication_taken: boolean | null;
  symptoms: string[];
}
// One day of the daily log: its check-ins, then that day's meals, sodium, exercise and sleep
export interface DailyRow {
  date: string;
  readings: DailyReading[];
  sodium_mg: number | null;
  meals: number;
  over_sodium_limit: boolean;
  exercise_minutes: number;
  sleep_hours: number | null;
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
        // 2026-11-12, for clinics (older servers leave them out): the ESH average without the first day, and how many
        // readings were at or above 130/80
        average_without_first_day?: BpSummary | null;
        at_or_above_target?: number;
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
  // 2026-11-12, for clinics (older servers leave them out): the doctor's header and the daily log, newest day first
  patient?: {
    age?: number | null;
    sex?: string | null;
    bp_medicine?: boolean | null;
    has_diabetes?: boolean | null;
    cholesterol_medicine?: boolean | null;
  };
  daily?: DailyRow[];
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

// ── The Visit summary PDF for clinics (2026-11-12) ──────────────────────────────────────────────────────────────────
// Page 1 is an overview a doctor can read in a minute; page 2 onwards is the day-by-day log. The log follows the
// AMA/AHA Target: BP 7-day home blood pressure log (each reading with its date and time, mornings and evenings, the
// average), plus the ESH 2021 average that leaves out the first day. HeartLink adds what a paper log can't: each
// reading's medicine and symptoms, and each day's sodium, exercise and sleep.

// High, very high or low readings are highlighted for the doctor (the same AHA chart the app uses everywhere)
const FLAG_CATEGORIES = ["crisis", "low", "stage_2"];
const CATEGORY_LABEL: Record<string, string> = {
  crisis: "Very high",
  low: "Low",
  stage_2: "Stage 2",
  stage_1: "Stage 1",
  elevated: "Elevated",
  normal: "Normal",
};

/** "07:05" -> "7:05 am" */
export function time12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** "2026-11-12" -> "Thu, Nov 12" */
export function dayLabel(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const yesNo = (v: boolean | null | undefined) => (v === true ? "Yes" : v === false ? "No" : "Not answered");
const medicineMark = (v: boolean | null) => (v === true ? "✓ Taken" : v === false ? "✗ Not taken" : "—");
const isFlagged = (x: DailyReading) => (x.category !== null && FLAG_CATEGORIES.includes(x.category)) || x.symptoms.length > 0;

export interface ReportFlag {
  date: string;
  time: string | null;
  text: string;
}

/** What a doctor should look at first, newest first: high, very high or low readings and symptoms (with "medicine not
 * taken" when that was the answer), then health alerts. */
export function reportFlags(r: HealthReport): ReportFlag[] {
  const flags: ReportFlag[] = [];
  for (const day of r.daily ?? []) {
    for (const x of day.readings) {
      if (!isFlagged(x)) continue;
      const parts: string[] = [];
      if (x.systolic && x.diastolic) {
        parts.push(`${x.systolic}/${x.diastolic}${x.category ? ` (${CATEGORY_LABEL[x.category] ?? x.category})` : ""}`);
      }
      if (x.symptoms.length) parts.push(x.symptoms.join(", "));
      if (x.medication_taken === false) parts.push("medicine not taken");
      flags.push({ date: day.date, time: x.time, text: parts.join(" · ") });
    }
  }
  for (const a of r.alerts) flags.push({ date: a.date.slice(0, 10), time: null, text: `Health alert: ${a.type}` });
  return flags.sort((a, b) => `${b.date} ${b.time ?? ""}`.localeCompare(`${a.date} ${a.time ?? ""}`));
}

/** A small line chart of every reading in the period (top and bottom numbers), with dashed lines at 130 and 80. */
export function readingsChart(r: HealthReport): string {
  const P = ds.light;
  const points = [...(r.daily ?? [])]
    .reverse()
    .flatMap((d) => d.readings.flatMap((x) => (x.systolic && x.diastolic ? [{ sys: x.systolic, dia: x.diastolic }] : [])));
  if (points.length < 2) return "";
  const W = 680, H = 150, left = 34, right = 10, top = 8, bottom = 20;
  const lo = Math.min(60, ...points.map((p) => p.dia)) - 5;
  const hi = Math.max(160, ...points.map((p) => p.sys)) + 5;
  const x = (i: number) => left + (i * (W - left - right)) / (points.length - 1);
  const y = (v: number) => top + ((hi - v) * (H - top - bottom)) / (hi - lo);
  const line = (key: "sys" | "dia") => points.map((p, i) => `${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const guide = (v: number) =>
    `<line x1="${left}" y1="${y(v).toFixed(1)}" x2="${W - right}" y2="${y(v).toFixed(1)}" stroke="${P.hairlineStrong}" stroke-dasharray="4 3"/>` +
    `<text x="${left - 5}" y="${(y(v) + 3).toFixed(1)}" font-size="9" text-anchor="end" fill="${P.steel}">${v}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">
      ${guide(130)}${guide(80)}
      <polyline points="${line("sys")}" fill="none" stroke="${P.primary}" stroke-width="2"/>
      <polyline points="${line("dia")}" fill="none" stroke="${P.line}" stroke-width="2" stroke-dasharray="6 3"/>
      <text x="${left}" y="${H - 5}" font-size="9" fill="${P.steel}">First reading</text>
      <text x="${W - right}" y="${H - 5}" font-size="9" text-anchor="end" fill="${P.steel}">Latest reading · solid line: top number · dashed line: bottom number</text>
    </svg>`;
}

/** The PDF (always light colours, every value escaped). */
export function reportHtml(r: HealthReport, patientName: string): string {
  const P = ds.light;
  const esc = escapeHtml;
  const row = (label: string, value: string) => `<tr><td class="k">${esc(label)}</td><td>${esc(value)}</td></tr>`;
  const p = r.patient ?? {};
  const who = [
    patientName,
    p.age != null ? `${p.age} years old` : null,
    p.sex ? `${p.sex.charAt(0).toUpperCase()}${p.sex.slice(1)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Page 1: blood pressure, as the AMA/AHA log totals it
  let bpRows = row("Readings", "No blood pressure logged in this period");
  if (hasReadings(r)) {
    const b = r.blood_pressure;
    const at = (v: BpReading) => `${bp(v)} on ${dayLabel(v.date)}${v.time ? `, ${time12(v.time)}` : ""}`;
    bpRows = [
      row("Average, all readings", `${bp(b.average)} mmHg (${b.readings} readings)`),
      row("Morning average (5–11 am)", b.morning ? `${bp(b.morning)} mmHg (${b.morning.readings} readings)` : "No morning readings"),
      row("Evening average (5–10 pm)", b.evening ? `${bp(b.evening)} mmHg (${b.evening.readings} readings)` : "No evening readings"),
      ...(b.average_without_first_day
        ? [row("Average without the first day (ESH)", `${bp(b.average_without_first_day)} mmHg (${b.average_without_first_day.readings} readings)`)]
        : []),
      ...(b.at_or_above_target !== undefined
        ? [row("At or above 130/80", `${b.at_or_above_target} of ${b.readings} readings (${Math.round((100 * b.at_or_above_target) / b.readings)}%)`)]
        : []),
      row("Highest", at(b.highest)),
      row("Lowest", at(b.lowest)),
      row("Pulse, average", r.pulse.average === null ? "Not logged" : `${r.pulse.average} bpm (${r.pulse.readings} readings)`),
    ].join("");
  }

  // Page 1: things to look at
  const flags = reportFlags(r);
  const shown = flags.slice(0, 10);
  const flagRows = shown.length
    ? shown.map((f) => `<tr class="flag"><td class="k">${esc(dayLabel(f.date))}${f.time ? `, ${esc(time12(f.time))}` : ""}</td><td>${esc(f.text)}</td></tr>`).join("") +
      (flags.length > shown.length ? `<tr><td colspan="2" class="muted">and ${flags.length - shown.length} more in the daily log</td></tr>` : "")
    : `<tr><td colspan="2" class="muted">Nothing flagged: no stage 2, very high or low readings, symptoms or health alerts in this period.</td></tr>`;

  // Page 1: medicine, habits and risk (the same wording as the screen)
  const sections = reportSections(r);
  const pick = (title: string) => sections.find((s) => s.title === title)?.rows ?? [];
  const habitRows = [
    ...pick("Heart risk"),
    { label: "Medicine taken", value: medicinesLine(r.medicines) },
    { label: "Symptoms reported", value: r.symptoms.length ? r.symptoms.map((s) => `${s.name} (${s.times})`).join(", ") : "None" },
    ...pick("Food"),
    ...pick("Exercise"),
    ...pick("Sleep"),
    ...pick("Heart health habits"),
    ...pick("Lab results"),
    { label: "Days with something logged", value: `${r.days_logged} of ${r.days}` },
  ]
    .map((x) => row(x.label, x.value))
    .join("");

  // Page 2 onwards: the daily log, newest day first
  const dayLine = (d: DailyRow) =>
    [
      d.meals === 0
        ? "No meals logged"
        : `${d.meals} meal${d.meals === 1 ? "" : "s"}, sodium ${d.sodium_mg === null ? "not known" : `${d.sodium_mg.toLocaleString()} mg${d.over_sodium_limit ? " ⚠ over the limit" : ""}`}`,
      d.exercise_minutes ? `exercise ${d.exercise_minutes} min` : "no exercise logged",
      d.sleep_hours === null ? "sleep not logged" : `sleep ${d.sleep_hours} h`,
    ].join(" · ");
  const readingRow = (x: DailyReading, dateCell: string) =>
    `<tr${isFlagged(x) ? ' class="flag"' : ""}>${dateCell}<td>${esc(time12(x.time))}</td>` +
    `<td class="num">${x.systolic && x.diastolic ? `${x.systolic}/${x.diastolic}` : "—"}</td>` +
    `<td>${esc(x.category ? CATEGORY_LABEL[x.category] ?? x.category : "")}</td>` +
    `<td class="num">${x.pulse ?? "—"}</td><td>${esc(medicineMark(x.medication_taken))}</td>` +
    `<td>${esc(x.symptoms.join(", ") || "—")}</td></tr>`;
  const daily = r.daily ?? [];
  const logRows = daily.length
    ? daily
        .map((d) => {
          if (!d.readings.length) {
            return `<tr class="day"><td class="date">${esc(dayLabel(d.date))}</td><td colspan="6">No readings · ${esc(dayLine(d))}</td></tr>`;
          }
          const dateCell = `<td class="date" rowspan="${d.readings.length + 1}">${esc(dayLabel(d.date))}</td>`;
          return d.readings.map((x, i) => readingRow(x, i === 0 ? dateCell : "")).join("") + `<tr class="day"><td colspan="6">${esc(dayLine(d))}</td></tr>`;
        })
        .join("")
    : `<tr><td colspan="7" class="muted">Nothing logged in this period.</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{margin:14mm 12mm}
    body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;color:${P.ink};font-size:11px;line-height:1.4;margin:0}
    h1{font-size:19px;margin:0}
    h2{font-size:13px;margin:16px 0 6px;padding-bottom:3px;border-bottom:1.5px solid ${P.ink}}
    .top{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
    .muted{color:${P.slate}}
    .who{font-size:13px;font-weight:600;margin-top:6px}
    table{width:100%;border-collapse:collapse}
    td,th{border:1px solid ${P.hairline};padding:4px 6px;text-align:left;vertical-align:top}
    th{background:${P.surface};font-weight:600}
    thead{display:table-header-group}
    tr{page-break-inside:avoid}
    td.k{width:40%;color:${P.charcoal}}
    td.num,td.date{white-space:nowrap;font-weight:600}
    tr.flag td{background:${P.rose}}
    tr.day td{background:${P.surface};color:${P.charcoal}}
    tr td.date{background:${P.canvas}}
    .chart{display:block;margin-top:8px}
    .note{margin-top:14px;padding:8px 10px;border-radius:6px;background:${P.surface};color:${P.charcoal}}
    .log{page-break-before:always}
  </style></head><body>
    <div class="top"><h1>HeartLink visit summary</h1><span class="muted">${esc(periodLabel(r))}</span></div>
    <div class="who">${esc(who)}</div>
    <div class="muted">Takes blood pressure medicine: ${yesNo(p.bp_medicine)} · Diabetes: ${yesNo(p.has_diabetes)} · Takes cholesterol medicine: ${yesNo(p.cholesterol_medicine)}</div>

    <h2>Blood pressure (home readings)</h2>
    <table>${bpRows}</table>
    ${readingsChart(r)}

    <h2>Things to look at</h2>
    <table>${flagRows}</table>

    <h2>Medicine, habits and risk</h2>
    <table>${habitRows}</table>

    <div class="note">${esc(r.disclaimer)} Home readings are entered by the patient. The daily log follows the AMA/AHA
    Target: BP home blood pressure log.</div>

    <div class="log">
      <div class="top"><h1>Daily log</h1><span class="muted">${esc(patientName)} · ${esc(periodLabel(r))}</span></div>
      <p class="muted">Every check-in as logged, newest day first. Highlighted rows: stage 2, very high or low readings, or
      symptoms. The grey line under each day shows that day's meals and sodium, exercise and sleep.</p>
      <table>
        <thead><tr><th>Date</th><th>Time</th><th>BP (mmHg)</th><th>Level</th><th>Pulse</th><th>Medicine</th><th>Symptoms</th></tr></thead>
        <tbody>${logRows}</tbody>
      </table>
    </div>
  </body></html>`;
}

// ── The Visit summary screen (2026-11-12) ────────────────────────────────────────────────────────────────────────────
// The screen doesn't repeat Trends. It helps the patient get ready for a checkup ("Is your summary ready?"), shows the
// few lines the doctor reads first, and the things to mention. The full tables and the daily log are in the PDF only.

export interface Readiness {
  /** Days in the last 7 with at least one blood pressure reading */
  days: number;
  mornings: number;
  evenings: number;
  level: "none" | "few" | "good" | "full";
  title: string;
  text: string;
}

const PREPARE =
  "For the most useful summary, check your blood pressure every morning and evening for a week before your visit. Each time, take 2 readings a minute apart.";

/** How ready the last 7 days are to show a doctor. ESH 2021 home BP guidance: at least 3 days, best 7; AMA/AHA
 * Target: BP: readings morning and evening. Morning and evening use the server's times (5–11 am, 5–10 pm).
 * Null with an older server that has no daily log. */
export function readiness(r: HealthReport): Readiness | null {
  if (!r.daily) return null;
  const end = new Date(`${r.period.end}T12:00:00Z`);
  const from = new Date(end.getTime() - 6 * 86_400_000).toISOString().slice(0, 10);
  let days = 0;
  let mornings = 0;
  let evenings = 0;
  for (const d of r.daily) {
    if (d.date < from) continue;
    const hours = d.readings.filter((x) => x.systolic && x.diastolic).map((x) => Number(x.time.slice(0, 2)));
    if (!hours.length) continue;
    days += 1;
    if (hours.some((h) => h >= 5 && h < 11)) mornings += 1;
    if (hours.some((h) => h >= 17 && h < 22)) evenings += 1;
  }
  if (days >= 7) {
    return { days, mornings, evenings, level: "full", title: "A full week of readings", text: "Ready to share. Your doctor gets 7 days of home readings." };
  }
  if (days >= 3) {
    return {
      days,
      mornings,
      evenings,
      level: "good",
      title: `Readings on ${days} of the last 7 days`,
      text: "Enough to share. A full week is best: check your blood pressure every morning and evening before your visit.",
    };
  }
  return {
    days,
    mornings,
    evenings,
    level: days === 0 ? "none" : "few",
    title: days === 0 ? "No readings in the last 7 days" : `Readings on ${days} of the last 7 days`,
    text: `Doctors look for at least 3 days of home readings. ${PREPARE}`,
  };
}

/** The few lines a doctor reads first, in plain words (the same numbers as the PDF's first page). */
export function doctorHighlights(r: HealthReport): ReportRow[] {
  const rows: ReportRow[] = [];
  if (hasReadings(r)) {
    const b = r.blood_pressure;
    rows.push({ label: "Blood pressure", value: `${bp(b.average)} average, ${b.readings} reading${b.readings === 1 ? "" : "s"}` });
    if (b.at_or_above_target !== undefined) {
      rows.push({ label: "At or above 130/80", value: `${b.at_or_above_target} of ${b.readings} readings` });
    }
    if (b.morning && b.evening) rows.push({ label: "Mornings vs evenings", value: `${bp(b.morning)} vs ${bp(b.evening)}` });
  } else {
    rows.push({ label: "Blood pressure", value: "No readings in this period" });
  }
  if (r.medicines.percent !== null) rows.push({ label: "Medicine taken", value: `${r.medicines.taken} of ${r.medicines.answered} check-ins` });
  if (r.heart_risk && r.heart_risk.end !== null) {
    rows.push({ label: "10-year heart risk", value: `${r.heart_risk.end}%${r.heart_risk.kind === "estimated" ? " (estimated)" : ""}` });
  }
  rows.push({ label: "Days with something logged", value: `${r.days_logged} of ${r.days}` });
  return rows;
}
