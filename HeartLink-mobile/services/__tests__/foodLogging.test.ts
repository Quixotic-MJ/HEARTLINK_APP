import {
  FoodItem,
  SOURCE_RULES,
  amountLabel,
  eaten,
  loggedSodiumLine,
  mealTimeForHour,
  parseAmount,
  reviewSodiumLine,
  sodiumSummary,
  stepAmount,
  toMealPayload,
} from "../foodLogging";

const nuggets: FoodItem = {
  id: "off-1",
  source: "packaged",
  name: "Chicken nuggets",
  base: { sodium_mg: 520, calories: 270, saturated_fat_g: 3.1, fiber_g: 1.2 },
};
const tinola: FoodItem = {
  id: "r1",
  source: "recipe",
  name: "Chicken tinola",
  recipe_id: "r1",
  base: { sodium_mg: 420, calories: 280, saturated_fat_g: 2, fiber_g: 3 },
};

describe("food logging rules (HL-032)", () => {
  it("locks only HeartLink recipes", () => {
    expect(SOURCE_RULES.recipe.locked).toBe(true);
    expect(SOURCE_RULES.packaged.locked).toBe(false);
    expect(SOURCE_RULES.recent.locked).toBe(false);
  });

  it("treats packaged food as per 100 g and recipes as per serving", () => {
    expect(eaten(nuggets.base, "packaged", 150).sodium_mg).toBe(780);
    expect(eaten(tinola.base, "recipe", 1.5).sodium_mg).toBe(630);
    expect(amountLabel("packaged", 150)).toBe("150 g");
    expect(amountLabel("recipe", 1)).toBe("1 serving");
    expect(amountLabel("recipe", 2.5)).toBe("2.5 servings");
  });

  it("never steps an amount below its minimum", () => {
    expect(stepAmount("packaged", 25, -1)).toBe(25);
    expect(stepAmount("packaged", 100, 1)).toBe(125);
    expect(stepAmount("recipe", 0.5, -1)).toBe(0.5);
  });

  it("builds the meal log the backend expects", () => {
    const payload = toMealPayload(nuggets, nuggets.base, 150, "Lunch");
    expect(payload).toMatchObject({
      meal_name: "Chicken nuggets (150 g)",
      portion: 1.5,
      sodium_mg: 780,
      calories: 405,
      saturated_fat_g: 4.7,
      fiber_g: 1.8,
      source: "openfoodfacts",
    });
    expect(payload.recipe_id).toBeUndefined();
    expect(toMealPayload(tinola, tinola.base, 1, "Lunch").recipe_id).toBe("r1");
  });

  it("uses the same meal windows as the Food Diary", () => {
    expect(mealTimeForHour(7)).toBe("Breakfast");
    expect(mealTimeForHour(12)).toBe("Lunch");
    expect(mealTimeForHour(21)).toBe("Dinner");
    expect(mealTimeForHour(23)).toBe("Snack");
    expect(mealTimeForHour(2)).toBe("Snack");
  });

  it("reads typed numbers safely", () => {
    expect(parseAmount("380")).toBe(380);
    expect(parseAmount("1.5g")).toBe(1.5);
    expect(parseAmount("")).toBe(0);
  });
});

describe("sodium summary", () => {
  it("uses the patient's own limit, or 2,000 mg when none is set", () => {
    expect(sodiumSummary(460, 940, 1500).limit).toBe(1500);
    expect(sodiumSummary(460, 940, null).limit).toBe(2000);
    expect(sodiumSummary(460, 940, 0).limit).toBe(2000);
  });

  it("says how much is left when under the limit", () => {
    const s = sodiumSummary(460, 940, 2000);
    expect(s).toMatchObject({ after: 1400, left: 600, over: false });
    expect(reviewSodiumLine(s)).toBe("After this meal you'll have 600 mg sodium left for today.");
    expect(loggedSodiumLine(s)).toBe("You're at 1,400 mg sodium today, 600 mg under your 2,000 mg limit.");
  });

  it("says how far over when the meal goes past the limit", () => {
    const s = sodiumSummary(1200, 900, 1500);
    expect(s.over).toBe(true);
    expect(reviewSodiumLine(s)).toBe("After this meal you'd be 600 mg over today's 1,500 mg sodium limit.");
  });

  it("keeps both bar parts inside the track", () => {
    const s = sodiumSummary(1800, 900, 2000);
    expect(s.earlierShare + s.mealShare).toBeCloseTo(1);
    expect(sodiumSummary(2500, 300, 2000).mealShare).toBe(0);
  });
});
