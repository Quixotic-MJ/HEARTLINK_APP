/**
 * HL-086: long-term Trends (Premium), from /api/analytics/{user}/long-term. The server does the sums (weekly or
 * monthly averages, this month vs last, time of day, pattern notes); this file only shapes them for the screen.
 */
import type { Pressure, TrendDay } from "./trends";

export type LongTermDays = 90 | 365;

export type LongTermStretch = {
  start: string;
  end: string;
  score: number | null;
  systolic: number | null;
  diastolic: number | null;
  readings: number;
  pulse: number | null;
  sodium_mg: number | null;
  sodium_days: number;
  days_over_limit: number;
  exercise_minutes_per_week: number;
  sleep_hours: number | null;
  medicines_percent: number | null;
};

export type LongTermBucket = LongTermStretch & { label: string };

export type TimeOfDay = { key: string; label: string; hours: string; systolic: number | null; diastolic: number | null; readings: number };

export type PatternNote = {
  key: "sodium" | "exercise" | "medicines";
  text: string;
  with: { label: string; systolic: number; days: number };
  without: { label: string; systolic: number; days: number };
  difference: number;
};

export type LongTermTrends = {
  days: LongTermDays;
  bucket: "week" | "month";
  period: { start: string; end: string };
  sodium_limit_mg: number | null;
  buckets: LongTermBucket[];
  month_compare: { this: LongTermStretch; last: LongTermStretch };
  time_of_day: TimeOfDay[];
  patterns: PatternNote[];
  pattern_min_days: number;
  disclaimer: string;
};

export const isLongTerm = (days: number): days is LongTermDays => days === 90 || days === 365;

/** The period switch label: "7 days" … "1 year". */
export const periodName = (days: number) => (days === 365 ? "1 year" : `${days} days`);

/** For "the last …": "90 days" or "year". */
export const spanName = (days: number) => (days === 365 ? "year" : `${days} days`);

/** What a pattern note is based on, e.g. "Based on 6 days over your limit and 9 days under it." */
export function patternBasis(p: PatternNote): string {
  const d = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  if (p.key === "sodium") return `Based on ${d(p.with.days)} over your limit and ${d(p.without.days)} under it.`;
  if (p.key === "exercise") return `Based on ${p.with.days} exercise ${p.with.days === 1 ? "day" : "days"} and ${p.without.days} rest ${p.without.days === 1 ? "day" : "days"}.`;
  return `Based on ${d(p.with.days)} you took them and ${d(p.without.days)} you missed them.`;
}

/** "2026-10-21" as that calendar day on the phone (not midnight UTC, which can be the day before). */
function localDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** One chart point per week or month, keyed by its first day. */
export function bucketDays(buckets: LongTermBucket[]): TrendDay[] {
  return buckets.map((b) => ({ key: b.start, date: localDate(b.start) }));
}

export const bucketPressure = (buckets: LongTermBucket[]): (Pressure | null)[] =>
  buckets.map((b) => (b.systolic && b.diastolic ? { sys: b.systolic, dia: b.diastolic } : null));

/** "the week of Oct 21" or "October". */
export function bucketName(bucket: LongTermBucket, kind: "week" | "month"): string {
  const date = localDate(bucket.start);
  return kind === "week"
    ? `the week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : date.toLocaleDateString("en-US", { month: "long" });
}

export type CompareRow = { key: string; label: string; now: string; before: string; change: string };

/** "Up 4 mmHg", "Down 1.5 h", "Same"; or "" when one side has nothing logged. */
function change(now: number | null, before: number | null, unit: string): string {
  if (now === null || before === null) return "";
  const diff = Math.round((now - before) * 10) / 10;
  if (diff === 0) return "Same";
  return `${diff > 0 ? "Up" : "Down"} ${Math.abs(diff).toLocaleString()}${unit}`;
}

const show = (v: number | null, unit = "") => (v === null ? "--" : `${v.toLocaleString()}${unit}`);

/** The last 30 days against the 30 before, one row per measure. Blood pressure compares the top number. */
export function monthCompareRows(m: LongTermTrends["month_compare"]): CompareRow[] {
  const bp = (s: LongTermStretch) => (s.systolic && s.diastolic ? `${s.systolic}/${s.diastolic}` : "--");
  return [
    { key: "bp", label: "Blood pressure", now: bp(m.this), before: bp(m.last), change: change(m.this.systolic, m.last.systolic, " mmHg") },
    { key: "pulse", label: "Pulse", now: show(m.this.pulse), before: show(m.last.pulse), change: change(m.this.pulse, m.last.pulse, " bpm") },
    { key: "score", label: "Heart score", now: show(m.this.score), before: show(m.last.score), change: change(m.this.score, m.last.score, "") },
    {
      key: "sodium",
      label: "Sodium a day",
      now: show(m.this.sodium_mg, " mg"),
      before: show(m.last.sodium_mg, " mg"),
      change: change(m.this.sodium_mg, m.last.sodium_mg, " mg"),
    },
    {
      key: "exercise",
      label: "Exercise a week",
      now: `${m.this.exercise_minutes_per_week} min`,
      before: `${m.last.exercise_minutes_per_week} min`,
      change: change(m.this.exercise_minutes_per_week, m.last.exercise_minutes_per_week, " min"),
    },
    {
      key: "sleep",
      label: "Sleep a night",
      now: show(m.this.sleep_hours, " h"),
      before: show(m.last.sleep_hours, " h"),
      change: change(m.this.sleep_hours, m.last.sleep_hours, " h"),
    },
    {
      key: "medicines",
      label: "Medicines taken",
      now: show(m.this.medicines_percent, "%"),
      before: show(m.last.medicines_percent, "%"),
      change: change(m.this.medicines_percent, m.last.medicines_percent, " points"),
    },
  ];
}
