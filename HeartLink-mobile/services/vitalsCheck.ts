/**
 * The check-in's safety checks, kept apart from the screen so they can be tested.
 *
 * Emergency thresholds (keep in step with services/companionService.ts):
 * - hypertensive crisis: systolic 180 or more, or diastolic 120 or more
 * - severe hypotension: systolic under 90, or diastolic under 60
 * - chest discomfort rated 7 or more, shortness of breath while resting, or fainting or nearly fainting
 * - HL-166: blood oxygen (SpO2) under 90%. 90 to 94% gets a "get checked" note, not the emergency guidance.
 *   PROPOSED values, pending the cardiologist's confirmation (also in backend review_rules.py and family.py).
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

// HL-166 (panel revision): an optional oxygen reading from a pulse oximeter. Never scored.
export const SPO2_RANGE = [50, 100] as const;
export const SPO2_EMERGENCY_BELOW = 90;
export const SPO2_NORMAL_FROM = 95;

/** A whole number from 50 to 100, else null (so typing "9" on the way to "97" is never judged). */
export function completeSpo2(text: string): number | null {
  const n = wholeNumber(text);
  if (n === null || n < SPO2_RANGE[0] || n > SPO2_RANGE[1]) return null;
  return n;
}

export function isLowOxygenEmergency(spo2: number | null): boolean {
  return spo2 !== null && spo2 < SPO2_EMERGENCY_BELOW;
}

/** 90 to 94%: lower than usual, worth a check if they feel unwell. */
export function isOxygenLow(spo2: number | null): boolean {
  return spo2 !== null && spo2 >= SPO2_EMERGENCY_BELOW && spo2 < SPO2_NORMAL_FROM;
}

export const CHEST = "Chest Discomfort / Tightness";
export const BREATH = "Shortness of Breath";
export const FAINTED = "Fainted or Nearly Fainted";

/** A symptom answer that needs the emergency guidance. The "when" must be chosen before breath counts. */
export function isSymptomEmergency(symptoms: string[], severities: Record<string, number>, context: string | null): boolean {
  const chest = symptoms.includes(CHEST) && (severities[CHEST] ?? 0) >= 7;
  const breathAtRest = symptoms.includes(BREATH) && context === "While resting";
  return chest || breathAtRest || symptoms.includes(FAINTED);
}
