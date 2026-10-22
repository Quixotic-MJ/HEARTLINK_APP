/**
 * The check-in's safety checks, kept apart from the screen so they can be tested.
 *
 * Emergency thresholds (keep in step with services/companionService.ts):
 * - hypertensive crisis: systolic 180 or more, or diastolic 120 or more
 * - severe hypotension: systolic under 90, or diastolic under 60
 * - chest discomfort rated 7 or more, or shortness of breath while resting
 *
 * A blood pressure is only judged once it is a complete reading (both numbers, each in the range the
 * backend accepts), so typing "1" on the way to "128" never sets off the emergency guidance.
 */

export type Reading = { sys: number; dia: number };

export const SYSTOLIC_RANGE = [50, 300] as const;
export const DIASTOLIC_RANGE = [30, 200] as const;

function wholeNumber(text: string): number | null {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return null;
  return parseInt(t, 10);
}

/** Both numbers entered and plausible, else null. */
export function completeReading(sysText: string, diaText: string): Reading | null {
  const sys = wholeNumber(sysText);
  const dia = wholeNumber(diaText);
  if (sys === null || dia === null) return null;
  if (sys < SYSTOLIC_RANGE[0] || sys > SYSTOLIC_RANGE[1]) return null;
  if (dia < DIASTOLIC_RANGE[0] || dia > DIASTOLIC_RANGE[1]) return null;
  return { sys, dia };
}

export function isHypertensiveCrisis(r: Reading | null): boolean {
  return !!r && (r.sys >= 180 || r.dia >= 120);
}

export function isSevereHypotension(r: Reading | null): boolean {
  return !!r && (r.sys < 90 || r.dia < 60);
}

export const CHEST = "Chest Discomfort / Tightness";
export const BREATH = "Shortness of Breath";

/** A symptom answer that needs the emergency guidance. The "when" must be chosen before breath counts. */
export function isSymptomEmergency(symptoms: string[], severities: Record<string, number>, context: string | null): boolean {
  const chest = symptoms.includes(CHEST) && (severities[CHEST] ?? 0) >= 7;
  const breathAtRest = symptoms.includes(BREATH) && context === "While resting";
  return chest || breathAtRest;
}
