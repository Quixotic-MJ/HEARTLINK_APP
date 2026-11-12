import { DISHES, EXTRAS } from "../../constants/estimateFoods";
import { describe as describeMeal, estimateTotals, extraSodium, missingSources, nutrientsFor } from "../mealEstimate";

// HL-157: the estimate helper's sums, from the cited USDA values.

const sel = (dishId: string | null, portionIndex = 0, extras: Record<string, number> = {}) => ({ dishId, portionIndex, extras });

describe("estimate helper values", () => {
  it("every value has a source (USDA FDC ID or FNRI code) and is pending review", () => {
    expect(missingSources()).toEqual([]);
    expect([...DISHES, ...EXTRAS].every((f) => f.reviewed === false)).toBe(true);
    expect(new Set([...DISHES, ...EXTRAS].map((f) => f.id)).size).toBe(DISHES.length + EXTRAS.length);
  });

  it("matches USDA's own numbers, e.g. a tablespoon of soy sauce", () => {
    // USDA SR Legacy 174277: 5,493 mg sodium per 100 g; 1 tbsp = 16 g
    expect(extraSodium(EXTRAS.find((e) => e.id === "soy_sauce")!)).toBe(879);
    // USDA 174531: patis, 7,851 mg per 100 g; 1 tbsp = 18 g
    expect(extraSodium(EXTRAS.find((e) => e.id === "fish_sauce")!)).toBe(1413);
  });
});

describe("estimateTotals", () => {
  it("scales the dish to the portion", () => {
    // 1 cup of fried rice = 137 g at 387 mg / 174 kcal per 100 g
    expect(estimateTotals(sel("fried_rice", 1))).toEqual({ sodium: 530, calories: 238, satFat: 0.7, cholesterol: 25, fiber: 1.5 });
    expect(estimateTotals(sel("fried_rice", 2)).sodium).toBe(1060);
  });

  it("adds the hidden salt on top", () => {
    const t = estimateTotals(sel("rice", 1, { soy_sauce: 1, hotdog: 2 }));
    // rice 1.58 + soy sauce 878.88 + 2 hotdogs 914 = 1,794.46, rounded once at the end
    expect(t.sodium).toBe(1794);
  });

  it("works with extras only (Something else)", () => {
    expect(estimateTotals(sel(null, 0, { salt: 1 })).sodium).toBe(581); // ¼ tsp = 1.5 g of salt
    expect(estimateTotals(sel(null))).toEqual({ sodium: 0, calories: 0, satFat: 0, cholesterol: 0, fiber: 0 });
  });

  it("caps each extra at 10 and counts a missing nutrient as 0", () => {
    expect(estimateTotals(sel(null, 0, { ketchup: 50 })).sodium).toBe(estimateTotals(sel(null, 0, { ketchup: 10 })).sodium);
    expect(nutrientsFor({ sodium: 100, kcal: 100 }, 50)).toEqual({ sodium: 50, calories: 50, satFat: 0, cholesterol: 0, fiber: 0 });
  });
});

describe("describe", () => {
  it("names the meal from the choices", () => {
    expect(describeMeal(sel("fried_rice", 1, { soy_sauce: 1, hotdog: 2 }))).toBe(
      "Fried rice (no meat), 1 cup + 1 tbsp soy sauce (toyo) + 2 × 1 piece hotdog",
    );
    expect(describeMeal(sel(null))).toBe("");
  });
});
