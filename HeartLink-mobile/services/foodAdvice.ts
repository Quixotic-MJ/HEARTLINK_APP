/**
 * HL-097: what a food's numbers mean for the patient. It explains the amount and the serving and looks at the whole
 * day; no food is called forbidden. Allergy and diet warnings are separate and stay strong (foodSearch, FoodBits).
 * The rules and their sources are in backend/FOOD_RULES.md, pending the dietitian's review (HL-066).
 */
export const HIGH_SODIUM_MG = 800;
export const MODERATE_SODIUM_MG = 400;
export const HIGH_SAT_FAT_G = 6;
export const MODERATE_SAT_FAT_G = 3;

export type FoodImpact = { tone: "high" | "medium" | "low"; title: string; desc: string };

const mg = (n: number) => `${Math.round(n).toLocaleString("en-US")} mg of sodium`;
const g = (n: number) => `${Math.round(n * 10) / 10} g of saturated fat`;

export function foodImpact(sodium: number, satFat: number): FoodImpact {
  const highSodium = sodium > HIGH_SODIUM_MG;
  const highFat = satFat > HIGH_SAT_FAT_G;
  if (highSodium || highFat) {
    const amounts = highSodium && highFat ? `${mg(sodium)} and ${g(satFat)}` : highSodium ? mg(sodium) : g(satFat);
    const share = highSodium ? ", more than half of a 1,500 mg daily sodium limit" : "";
    return {
      tone: "high",
      title: highSodium && highFat ? "High in sodium and saturated fat" : highSodium ? "High in sodium" : "High in saturated fat",
      desc: `This amount has about ${amounts}${share}. A smaller serving or lighter meals later can balance your day.`,
    };
  }
  const someSodium = sodium > MODERATE_SODIUM_MG;
  const someFat = satFat > MODERATE_SAT_FAT_G;
  if (someSodium || someFat) {
    const amounts = someSodium && someFat ? `${mg(sodium)} and ${g(satFat)}` : someSodium ? mg(sodium) : g(satFat);
    return {
      tone: "medium",
      title: "Moderate",
      desc: `This amount has about ${amounts}. It can fit your day if your other meals are lighter.`,
    };
  }
  return {
    tone: "low",
    title: "Lower in sodium and saturated fat",
    desc: `This amount has about ${mg(sodium)} and ${g(satFat)}.`,
  };
}
