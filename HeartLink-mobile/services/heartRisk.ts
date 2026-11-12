import type { DsColors } from "../constants/theme";

/**
 * HL-139: the Heart risk, the chance of a heart attack or stroke in the next 10 years, from the American Heart
 * Association's PREVENT equations. The server works it out (backend/app/services/heart_risk.py) and saves it with the
 * habits score, so it arrives inside `hss_factors.risk`. Lower is better. It's an estimate, not a diagnosis.
 */
export type RiskBand = "low" | "borderline" | "intermediate" | "high";

export type HeartRisk =
  | {
      available: true;
      kind: "calculated" | "estimated";
      ascvd_10: number;
      ascvd_30?: number | null;
      total_cvd_10?: number | null;
      band: RiskBand;
      note?: string | null;
      urgent?: boolean;
      age: number;
      sbp?: { value: number; from: "daytime_average" | "latest"; readings: number } | null;
      missing_labs: ("cholesterol" | "kidney")[];
      adjusted?: string[];
    }
  | { available: false; reason: "age" | "questions" | "profile" | "no_estimate"; age?: number; missing?: string[] };

export const PREVENT_PAPER_URL = "https://doi.org/10.1161/CIRCULATIONAHA.123.067626";
// HL-156: the Cardiologist asked for the evidence-based, accredited-organization wording
export const DISCLAIMER =
  "Based on the latest evidence-based guidelines from accredited health organizations (American Heart Association, Philippine Heart Association). An estimate to discuss with your doctor, not a diagnosis.";

const BAND_LABELS: Record<RiskBand, string> = { low: "Low", borderline: "Borderline", intermediate: "Intermediate", high: "High" };

/** The 2026 ACC/AHA cholesterol guideline's bands, as the server uses them. */
export const RISK_BANDS: { band: RiskBand; range: string }[] = [
  { band: "low", range: "Under 3%" },
  { band: "borderline", range: "3 to 4.9%" },
  { band: "intermediate", range: "5 to 9.9%" },
  { band: "high", range: "10% or more" },
];

export function riskOf(factors: { risk?: unknown } | null | undefined): HeartRisk | null {
  const risk = factors?.risk as HeartRisk | undefined;
  return risk && typeof risk === "object" && "available" in risk ? risk : null;
}

export function bandLabel(band: RiskBand): string {
  return BAND_LABELS[band] ?? band;
}

/** The band's tag colours: the same soft tints the habits levels use (green, yellow, peach, rose). */
export function bandColors(band: RiskBand, c: DsColors): { bg: string; fg: string } {
  switch (band) {
    case "low":
      return { bg: c.mint, fg: c.charcoal };
    case "borderline":
      return { bg: c.yellow, fg: c.warmText };
    case "intermediate":
      return { bg: c.peach, fg: c.warmText };
    default:
      return { bg: c.rose, fg: c.charcoal };
  }
}

/** "4.1%", or "Under 1%" for very small risks, which read better than "0.3%". */
export function percentText(value: number): string {
  if (value < 1) return "Under 1%";
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

/** Why there's no number yet, in plain words. */
export function unavailableText(risk: Extract<HeartRisk, { available: false }>): string {
  switch (risk.reason) {
    case "age":
      return (risk.age ?? 0) < 30
        ? "Heart risk estimates start at age 30. Keep building healthy habits: they're shown below."
        : "Heart risk estimates cover ages 30 to 79. Your habits are shown below.";
    case "questions":
      return "Answer 3 quick questions to see your heart risk.";
    case "profile":
      return "Add your date of birth and sex in your profile to see your heart risk.";
    default:
      return "Add cholesterol and kidney lab results to see your heart risk.";
  }
}

/** The line under the number: what it used. */
export function basisText(risk: Extract<HeartRisk, { available: true }>): string {
  if (risk.kind === "estimated") {
    return risk.missing_labs.length === 2
      ? "Estimated from your answers. Add cholesterol and kidney results for an exact number."
      : `Estimated. Add your ${risk.missing_labs[0]} result for an exact number.`;
  }
  return "From your lab results, answers and daytime blood pressure.";
}

/** The 2026 guideline suggests a 30-year view for ages 30 to 59 whose 10-year risk is low. */
export function thirtyYearText(risk: Extract<HeartRisk, { available: true }>): string | null {
  if (risk.band !== "low" || risk.ascvd_30 == null) return null;
  return `Over 30 years: ${percentText(risk.ascvd_30)}`;
}

/**
 * 2026-11-12: true when the risk used a typical blood pressure because there's no reading in the last 30 days. A
 * reading helps the estimate far more than another question would (HEART_RISK.md: High called High 59% → 78%).
 */
export function needsReading(risk: HeartRisk | null | undefined): boolean {
  return !!risk && risk.available && !risk.sbp;
}

export function pressureUsedText(risk: Extract<HeartRisk, { available: true }>): string | null {
  const sbp = risk.sbp;
  if (!sbp) return "No blood pressure in the last 30 days, so a typical value was used.";
  if (sbp.from === "daytime_average") {
    return `Top number ${sbp.value}: the average of ${sbp.readings} daytime ${sbp.readings === 1 ? "reading" : "readings"} this week.`;
  }
  return `Top number ${sbp.value}: your latest reading (no daytime readings this week).`;
}

export type RiskAnswers = { bp_medicine: boolean; has_diabetes: boolean; cholesterol_medicine: boolean };

export const RISK_QUESTIONS: { key: keyof RiskAnswers; text: string }[] = [
  { key: "bp_medicine", text: "Do you take medicine for blood pressure?" },
  { key: "has_diabetes", text: "Has a doctor told you that you have diabetes?" },
  { key: "cholesterol_medicine", text: "Do you take medicine for cholesterol?" },
];
