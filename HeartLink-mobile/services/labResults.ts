import { apiFetch } from "../lib/api";

// HL-138: optional lab results for the Heart score. The server stores mg/dL; many Philippine labs print mmol/L.

export type LabUnit = "mgdl" | "mmol";
export type LabKind = "cholesterol" | "blood_sugar" | "kidney";

export type LabResult = {
  kind: LabKind;
  test_date: string;
  total_cholesterol?: number;
  hdl?: number;
  cholesterol_medicine?: boolean;
  fasting_glucose?: number;
  hba1c?: number;
  has_diabetes?: boolean;
  // HL-141: kidney, for the Heart risk
  creatinine?: number;
  egfr?: number;
  /** Whether it still counts in the score (12 months from the test date) */
  counts: boolean;
  counts_until: string | null;
  /** A gentle "share this with your doctor" note, never an alarm */
  note: string | null;
};

export type LabResults = { cholesterol: LabResult | null; blood_sugar: LabResult | null; kidney?: LabResult | null };

// Standard conversions: cholesterol 1 mmol/L = 38.67 mg/dL, glucose 1 mmol/L = 18 mg/dL. Creatinine is printed in
// umol/L where the others are in mmol/L: 1 mg/dL = 88.4 umol/L.
const FACTOR = { cholesterol: 38.67, glucose: 18, creatinine: 1 / 88.4 } as const;
export type Analyte = keyof typeof FACTOR;

/** A typed number in the chosen unit, as mg/dL (whole numbers). Null when it isn't a number. */
export function toMgDl(text: string, unit: LabUnit, analyte: Analyte): number | null {
  const value = Number(text.trim().replace(",", "."));
  if (!text.trim() || !Number.isFinite(value) || value <= 0) return null;
  const mg = unit === "mmol" ? value * FACTOR[analyte] : value;
  return analyte === "creatinine" ? Math.round(mg * 100) / 100 : Math.round(mg);
}

/** A stored mg/dL value, shown in the chosen unit. */
export function fromMgDl(value: number | undefined, unit: LabUnit, analyte: Analyte): string {
  if (value === undefined || value === null) return "";
  if (analyte === "creatinine") return unit === "mmol" ? String(Math.round(value / FACTOR.creatinine)) : String(value);
  return unit === "mmol" ? String(Math.round((value / FACTOR[analyte]) * 10) / 10) : String(Math.round(value));
}

export const unitLabel = (unit: LabUnit) => (unit === "mmol" ? "mmol/L" : "mg/dL");
export const creatinineUnitLabel = (unit: LabUnit) => (unit === "mmol" ? "µmol/L" : "mg/dL");

/** "Counts in your Heart score until 30 Oct 2027", or why it doesn't. */
export function countsText(r: LabResult | null): string {
  if (!r) return "Not added";
  if (!r.counts) return "Over 12 months old, so it no longer counts. Add a newer result.";
  const until = r.counts_until ? new Date(`${r.counts_until}T00:00:00`) : null;
  return until
    ? `Counts until ${until.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
    : "Counts in your heart risk and habits score";
}

export async function loadLabResults(userId: string): Promise<LabResults> {
  const res = await apiFetch(`/api/users/${userId}/lab-results`);
  if (!res.ok) throw new Error("Couldn't load your lab results");
  return res.json();
}

async function failure(res: Response): Promise<Error> {
  try {
    const body = await res.json();
    const detail = Array.isArray(body?.detail) ? body.detail[0]?.msg : body?.detail;
    return new Error(typeof detail === "string" ? detail.replace(/^Value error, /, "") : "Not saved");
  } catch {
    return new Error("Not saved");
  }
}

export async function saveCholesterol(
  userId: string,
  body: { test_date: string; total_cholesterol: number; hdl: number; cholesterol_medicine: boolean },
): Promise<void> {
  const res = await apiFetch(`/api/users/${userId}/lab-results/cholesterol`, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw await failure(res);
}

export async function saveBloodSugar(
  userId: string,
  body: { test_date: string; fasting_glucose: number | null; hba1c: number | null; has_diabetes: boolean },
): Promise<void> {
  const res = await apiFetch(`/api/users/${userId}/lab-results/blood_sugar`, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw await failure(res);
}

/** HL-141: creatinine in mg/dL, or the eGFR printed on the report. The server works out eGFR from creatinine. */
export async function saveKidney(userId: string, body: { test_date: string; creatinine: number | null; egfr: number | null }): Promise<void> {
  const res = await apiFetch(`/api/users/${userId}/lab-results/kidney`, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw await failure(res);
}

export async function removeLabResult(userId: string, kind: LabKind): Promise<void> {
  const res = await apiFetch(`/api/users/${userId}/lab-results/${kind}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Couldn't remove it");
}
