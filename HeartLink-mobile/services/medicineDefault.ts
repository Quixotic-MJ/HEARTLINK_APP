/**
 * The daily check-in's "Medicines today" answer to start with (2026-11-19).
 *
 * Once a patient picks "I don't take any", this phone remembers it. Before they've picked anything, their setup answers
 * decide: no blood pressure medicine, no cholesterol medicine and no diabetes start the question on "I don't take any".
 * The question stays on screen, so someone who takes another medicine can still change it.
 */
export type MedicineAnswers = {
  bp_medicine?: boolean | null;
  cholesterol_medicine?: boolean | null;
  has_diabetes?: boolean | null;
};

/** `saved` is what this phone stored: "true" (no medicines), "false" (takes some) or null (never answered). */
export function startsWithNoMedicines(saved: string | null, answers?: MedicineAnswers | null): boolean {
  if (saved === "true") return true;
  if (saved === "false") return false;
  return answers?.bp_medicine === false && answers?.cholesterol_medicine === false && answers?.has_diabetes !== true;
}
