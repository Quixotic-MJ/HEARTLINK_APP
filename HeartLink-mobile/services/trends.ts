/**
 * Trends: turns /api/analytics/{user} into one value per day for the charts, plus the period summary.
 * Days with nothing logged stay null and show as a gap; nothing is filled in or made up.
 */

export type TrendDay = { key: string; date: Date };
export type Pressure = { sys: number; dia: number };

type Dated = { logged_at?: string | null; computed_at?: string | null };
export type ScoreRow = Dated & { score?: number | null; source?: string | null; contributing_factors?: Record<string, unknown> | null };
export type VitalsRow = Dated & { systolic_bp?: number | null; diastolic_bp?: number | null; heart_rate_bpm?: number | null };
export type MealRow = Dated & { sodium_mg?: number | null };
export type ExerciseRow = Dated & { duration_minutes?: number | null };
export type SleepRow = Dated & { duration_hours?: number | null };

const num = (v: unknown) => {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) ? x : 0;
};

/** The phone's own calendar day for a timestamp, as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function keyOf(row: Dated): string | null {
  const iso = row.logged_at || row.computed_at;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : dayKey(d);
}

/** The last `count` days, oldest first, ending today. */
export function periodDays(count: number, now = new Date()): TrendDay[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (count - 1 - i));
    return { key: dayKey(date), date };
  });
}

/** One value per day: the day's last row (rows come in any order). */
function lastPerDay<T extends Dated, V>(days: TrendDay[], rows: T[], pick: (r: T) => V | null): (V | null)[] {
  const latest: Record<string, { at: number; value: V }> = {};
  for (const r of rows) {
    const key = keyOf(r);
    const value = pick(r);
    if (!key || value === null) continue;
    const at = new Date(r.logged_at || r.computed_at || 0).getTime();
    if (!latest[key] || at >= latest[key].at) latest[key] = { at, value };
  }
  return days.map((d) => latest[d.key]?.value ?? null);
}

export function scoreByDay(days: TrendDay[], history: ScoreRow[]): (number | null)[] {
  return lastPerDay(days, history, (h) => (num(h.score) > 0 ? Math.round(num(h.score)) : null));
}

export function pressureByDay(days: TrendDay[], vitals: VitalsRow[]): (Pressure | null)[] {
  return lastPerDay(days, vitals, (v) =>
    num(v.systolic_bp) > 0 && num(v.diastolic_bp) > 0 ? { sys: num(v.systolic_bp), dia: num(v.diastolic_bp) } : null
  );
}

export function pulseByDay(days: TrendDay[], vitals: VitalsRow[]): (number | null)[] {
  return lastPerDay(days, vitals, (v) => (num(v.heart_rate_bpm) > 0 ? num(v.heart_rate_bpm) : null));
}

/** Total sodium per day; null on a day with no meals logged. */
export function sodiumByDay(days: TrendDay[], meals: MealRow[]): (number | null)[] {
  const sums: Record<string, number> = {};
  for (const m of meals) {
    const key = keyOf(m);
    if (key) sums[key] = (sums[key] ?? 0) + num(m.sodium_mg);
  }
  return days.map((d) => (d.key in sums ? Math.round(sums[d.key]) : null));
}

function sumByDay<T extends Dated>(days: TrendDay[], rows: T[], value: (r: T) => number): (number | null)[] {
  const sums: Record<string, number> = {};
  for (const r of rows) {
    const key = keyOf(r);
    if (key) sums[key] = (sums[key] ?? 0) + value(r);
  }
  return days.map((d) => (d.key in sums ? sums[d.key] : null));
}

const present = <T,>(xs: (T | null)[]) => xs.filter((x): x is T => x !== null);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export type TrendSummary = {
  sodium: { perDay: number; daysLogged: number; daysOver: number };
  movement: { perDay: number; daysAtGoal: number };
  sleep: { perNight: number; nightsLogged: number; nightsInRange: number };
  /** daysUnder: days whose last reading was under 130/80. */
  pressure: { average: Pressure | null; readings: number; daysLogged: number; daysUnder: number };
};

/**
 * The period in numbers. Sodium and sleep average over the days something was logged; movement over every
 * day of the period (a day with no exercise counts as 0 minutes).
 */
export function summarize(
  days: TrendDay[],
  data: { meals: MealRow[]; exercises: ExerciseRow[]; sleep: SleepRow[]; vitals: VitalsRow[] },
  limits: { sodiumMg: number; movementMin: number }
): TrendSummary {
  const inPeriod = <T extends Dated>(rows: T[]) => {
    const keys = new Set(days.map((d) => d.key));
    return rows.filter((r) => {
      const k = keyOf(r);
      return k !== null && keys.has(k);
    });
  };
  const sodium = present(sodiumByDay(days, data.meals));
  const minutes = sumByDay(days, data.exercises, (e) => num(e.duration_minutes)).map((m) => m ?? 0);
  const sleep = present(sumByDay(days, data.sleep, (s) => num(s.duration_hours)));
  const readings = inPeriod(data.vitals).filter((v) => num(v.systolic_bp) > 0 && num(v.diastolic_bp) > 0);
  const dailyPressure = present(pressureByDay(days, data.vitals));

  return {
    sodium: {
      perDay: Math.round(mean(sodium)),
      daysLogged: sodium.length,
      daysOver: sodium.filter((s) => s > limits.sodiumMg).length,
    },
    movement: {
      perDay: Math.round(mean(minutes)),
      daysAtGoal: limits.movementMin > 0 ? minutes.filter((m) => m >= limits.movementMin).length : 0,
    },
    sleep: { perNight: Math.round(mean(sleep) * 10) / 10, nightsLogged: sleep.length, nightsInRange: sleep.filter((h) => h >= 7 && h <= 9).length },
    pressure: {
      average: readings.length
        ? { sys: Math.round(mean(readings.map((r) => num(r.systolic_bp)))), dia: Math.round(mean(readings.map((r) => num(r.diastolic_bp)))) }
        : null,
      readings: readings.length,
      daysLogged: dailyPressure.length,
      daysUnder: dailyPressure.filter((p) => p.sys < 130 && p.dia < 80).length,
    },
  };
}

/** Each day's lowest and highest score (a day can have several: setup, readings, meals, exercise). */
export function scoreRangeByDay(days: TrendDay[], history: ScoreRow[]): ({ low: number; high: number } | null)[] {
  const ranges: Record<string, { low: number; high: number }> = {};
  for (const h of history) {
    const key = keyOf(h);
    const score = num(h.score);
    if (!key || score <= 0) continue;
    const r = ranges[key];
    ranges[key] = r ? { low: Math.min(r.low, score), high: Math.max(r.high, score) } : { low: score, high: score };
  }
  return days.map((d) => (ranges[d.key] ? { low: Math.round(ranges[d.key].low), high: Math.round(ranges[d.key].high) } : null));
}

export type DayScore = { at: Date; score: number; why: string; after: string | null };

/**
 * One day's scores in order, each with what set it: "Reading 185/95, emergency level", "Meal logged". `after` is
 * the same cause as a phrase for "Down from 95 after your 185/95 reading".
 */
export function scoresOfDay(history: ScoreRow[], day: TrendDay): DayScore[] {
  return history
    .filter((h) => keyOf(h) === day.key && num(h.score) > 0)
    .map((h) => {
      const f = h.contributing_factors ?? {};
      const trigger = String(f.trigger ?? "");
      const sys = num(f.systolic);
      const dia = num(f.diastolic);
      let why = "Score updated";
      let after: string | null = null;
      if (h.source === "baseline") {
        why = "Starting score from setup";
      } else if (f.source === "lifestyle_composite") {
        const what = trigger === "meal_log" ? "meal" : trigger === "exercise_log" ? "exercise" : trigger === "sleep_log" ? "sleep" : null;
        why = what ? `${what.charAt(0).toUpperCase()}${what.slice(1)} logged` : "Habits updated";
        after = what === "exercise" ? "exercise" : what ? `logging ${what === "meal" ? "a meal" : "sleep"}` : null;
      } else if (sys > 0 && dia > 0) {
        const emergency = sys >= 180 || dia >= 120 || sys < 90 || dia < 60;
        why = `Reading ${sys}/${dia}${emergency ? ", emergency level" : ""}`;
        after = `your ${sys}/${dia} reading`;
      }
      return { at: new Date(h.computed_at || h.logged_at || 0), score: Math.round(num(h.score)), why, after };
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** The most days in a row that have a value. */
export function longestStreak(values: (unknown | null)[]): number {
  let best = 0;
  let run = 0;
  for (const v of values) {
    run = v === null ? 0 : run + 1;
    best = Math.max(best, run);
  }
  return best;
}

/** Highlights (best day, saltiest day, streak) need this many days with a score to mean anything. */
export const HIGHLIGHT_DAYS = 7;

/** The highest value and its day, or null when there is none. */
export function peak(days: TrendDay[], values: (number | null)[]): { value: number; day: TrendDay } | null {
  let best: { value: number; day: TrendDay } | null = null;
  values.forEach((v, i) => {
    if (v !== null && (!best || v > best.value)) best = { value: v, day: days[i] };
  });
  return best;
}

/** "Monday" within the last week, else "Oct 9". */
export function dayName(day: TrendDay, now = new Date()): string {
  const ago = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - day.date.getTime()) / 86400000);
  if (ago === 0) return "today";
  if (ago < 7) return day.date.toLocaleDateString("en-US", { weekday: "long" });
  return day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** How the score moved from the first to the last day with one, e.g. "Up 6 points since Monday". */
export function scoreChange(days: TrendDay[], scores: (number | null)[], now = new Date()): string | null {
  const firstIdx = scores.findIndex((s) => s !== null);
  let lastIdx = -1;
  scores.forEach((s, i) => {
    if (s !== null) lastIdx = i;
  });
  if (firstIdx === -1 || lastIdx === firstIdx) return null;
  const diff = (scores[lastIdx] as number) - (scores[firstIdx] as number);
  const since = dayName(days[firstIdx], now);
  if (diff === 0) return `No change since ${since}`;
  return `${diff > 0 ? "Up" : "Down"} ${Math.abs(diff)} point${Math.abs(diff) === 1 ? "" : "s"} since ${since}`;
}
