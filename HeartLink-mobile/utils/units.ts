// HL-031: the portal saves count units in singular form ("clove"), so show the plural
// when the amount is more than one ("2 cloves"). Measurement units (g, ml, tbsp, pc) never change.
const PLURAL_UNITS: Record<string, string> = {
  cup: "cups",
  slice: "slices",
  clove: "cloves",
  stalk: "stalks",
  can: "cans",
  pack: "packs",
  serving: "servings",
  pinch: "pinches",
};

export function unitForAmount(unit: string | null | undefined, amount: number | string | null | undefined): string {
  const trimmed = (unit ?? "").trim();
  const value = typeof amount === "number" ? amount : parseFloat(String(amount ?? ""));
  if (!trimmed || !(value > 1)) return trimmed;
  return PLURAL_UNITS[trimmed] ?? trimmed;
}
