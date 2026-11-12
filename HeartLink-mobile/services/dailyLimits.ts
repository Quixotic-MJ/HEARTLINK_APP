// HL-016 / HL-017 / HL-156: the daily limits, as the server works them out (backend/app/services/nutrition_targets.py).
// The Cardiologist asked for strict daily sodium and cholesterol limits: they come from the guidelines, a patient can't
// raise them, and only the care team can set a stricter one.

export type DailyTarget = { value: number; source: string; why: string };

export type DailyTargets = {
  bmi: number | null;
  bmi_category: string | null;
  calories: DailyTarget;
  sat_fat_g: DailyTarget;
  cholesterol_mg: DailyTarget;
  sodium_mg: DailyTarget;
};

/** The guideline values everyone starts with (the end of setup shows them). */
export const SODIUM_LIMIT_MG = 1500;
export const CHOLESTEROL_LIMIT_MG = 200;

export const LIMITS_NOTE =
  "These follow the latest evidence-based guidelines from accredited health organizations (American Heart Association, Philippine Heart Association). Your care team can set a stricter limit for you.";

export const MOVEMENT_GOAL = { min: 10, max: 120, step: 5, fallback: 30 };

export function limitRows(t: DailyTargets): { label: string; value: string; target: DailyTarget }[] {
  const n = (v: number) => Math.round(v).toLocaleString("en-US");
  return [
    { label: "Sodium", value: `${n(t.sodium_mg.value)} mg`, target: t.sodium_mg },
    { label: "Cholesterol", value: `${n(t.cholesterol_mg.value)} mg`, target: t.cholesterol_mg },
    { label: "Saturated fat", value: `${n(t.sat_fat_g.value)} g`, target: t.sat_fat_g },
    { label: "Calories", value: `${n(t.calories.value)} kcal`, target: t.calories },
  ];
}

/** Keeps a movement goal in range, on a 5-minute step. */
export function clampGoal(minutes: number): number {
  const { min, max, step } = MOVEMENT_GOAL;
  return Math.min(max, Math.max(min, Math.round(minutes / step) * step));
}
