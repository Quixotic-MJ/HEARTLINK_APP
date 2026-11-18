import { satFatLine } from "../dailyLimits";
import { recipeServingNutrients } from "../foodLogging";

describe("Food diary and meal logs: the nutrient fixes (2026-11-19)", () => {
  it("shows saturated fat against the patient's own limit, not a fixed 20 g", () => {
    expect(satFatLine(6.25, 8)).toBe("6.3 of 8 g");
    expect(satFatLine(12, 17.7)).toBe("12 of 18 g");
  });

  it("shows the total alone until the limit has loaded", () => {
    expect(satFatLine(4, null)).toBe("4 g");
    expect(satFatLine(4, 0)).toBe("4 g");
  });

  it("logs a recipe's own fibre for the servings eaten", () => {
    const tinola = { calories: 310, sodium: 420, satFat: 1.5, cholesterol: 85, fiber: 3.2 };
    expect(recipeServingNutrients(tinola, 2)).toEqual({
      calories: 620, sodium_mg: 840, saturated_fat_g: 3, cholesterol_mg: 170, fiber_g: 6.4,
    });
  });
});
