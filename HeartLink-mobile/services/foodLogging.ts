import type { MealPayload } from "./MealLoggingService";

/**
 * HL-032 food logging flow: search → review → logged.
 * Pure rules and maths, kept out of the screens so they can be tested.
 */

/** Where a food in search came from. */
export type FoodSource = "recent" | "recipe" | "packaged";

export type MealTime = "Breakfast" | "Lunch" | "Dinner" | "Snack";

/** Nutrition for one base amount: per serving (recipes, recent meals) or per 100 g (packaged). */
export type Nutrition = {
  sodium_mg: number;
  calories: number;
  saturated_fat_g: number;
  fiber_g: number;
  /** HL-028: left out when the source doesn't say (the server then uses the recipe's, or 0). */
  cholesterol_mg?: number;
};

export type FoodItem = {
  id: string;
  source: FoodSource;
  name: string;
  image_url?: string | null;
  /** HeartLink recipe id, kept on the meal log. */
  recipe_id?: string;
  /** Recent meals: when it was last logged. */
  logged_at?: string;
  recommended?: boolean;
  base: Nutrition;
};

type SourceRule = {
  /** Shown above the group in search. */
  group: string;
  /** How the base values are measured. */
  per: string;
  /** Unit of the review screen's amount stepper. */
  unit: "serving" | "g";
  step: number;
  min: number;
  start: number;
  /** HeartLink recipes are set by the care team; patients change the amount instead. */
  locked: boolean;
  tag: string;
  hint: string;
};

export const SOURCE_RULES: Record<FoodSource, SourceRule> = {
  recent: {
    group: "Your recent meals",
    per: "per serving, as you logged it",
    unit: "serving",
    step: 0.5,
    min: 0.5,
    start: 1,
    locked: false,
    tag: "Logged before",
    hint: "You entered these before. Change them if this time was different.",
  },
  recipe: {
    group: "HeartLink recipes",
    per: "per serving",
    unit: "serving",
    step: 0.5,
    min: 0.5,
    start: 1,
    locked: true,
    tag: "Set by HeartLink",
    hint: "HeartLink sets these values. Change how much you ate instead.",
  },
  packaged: {
    group: "Packaged foods",
    per: "per 100 g",
    unit: "g",
    step: 25,
    min: 25,
    start: 100,
    locked: false,
    tag: "Open Food Facts: check the package",
    hint: "These come from a shared online list. Check them against the package label and fix any that differ.",
  },
};

export const SOURCE_ORDER: FoodSource[] = ["recent", "recipe", "packaged"];

/** How many base amounts the patient ate: servings, or grams / 100 for packaged food. */
export function amountFactor(source: FoodSource, amount: number): number {
  return source === "packaged" ? amount / 100 : amount;
}

export function amountLabel(source: FoodSource, amount: number): string {
  if (SOURCE_RULES[source].unit === "g") return `${amount} g`;
  return `${amount} ${amount === 1 ? "serving" : "servings"}`;
}

export function stepAmount(source: FoodSource, amount: number, direction: 1 | -1): number {
  const rule = SOURCE_RULES[source];
  return Math.max(rule.min, amount + direction * rule.step);
}

/** Nutrition for what was eaten, rounded the way the diary shows it. */
export function eaten(base: Nutrition, source: FoodSource, amount: number): Nutrition {
  const k = amountFactor(source, amount);
  return {
    sodium_mg: Math.round(base.sodium_mg * k),
    calories: Math.round(base.calories * k),
    saturated_fat_g: Math.round(base.saturated_fat_g * k * 10) / 10,
    fiber_g: Math.round(base.fiber_g * k * 10) / 10,
    ...(base.cholesterol_mg !== undefined ? { cholesterol_mg: Math.round(base.cholesterol_mg * k) } : {}),
  };
}

/**
 * The meal a log lands in. The backend doesn't store a chosen meal time yet, and the Food
 * Diary groups logs by clock time, so these windows match the diary's.
 */
export function mealTimeForHour(hour: number): MealTime {
  if (hour >= 4 && hour < 11) return "Breakfast";
  if (hour >= 11 && hour < 16) return "Lunch";
  if (hour >= 16 && hour < 22) return "Dinner";
  return "Snack";
}

/** The meal log the backend stores for one reviewed food. */
export function toMealPayload(item: FoodItem, base: Nutrition, amount: number, meal: MealTime): MealPayload {
  const total = eaten(base, item.source, amount);
  return {
    recipe_id: item.source === "recipe" ? item.recipe_id ?? item.id : undefined,
    meal_name: item.source === "packaged" ? `${item.name} (${amount} g)` : item.name,
    portion: amountFactor(item.source, amount),
    calories: total.calories,
    sodium_mg: total.sodium_mg,
    saturated_fat_g: total.saturated_fat_g,
    fiber_g: total.fiber_g,
    ...(total.cholesterol_mg !== undefined ? { cholesterol_mg: total.cholesterol_mg } : {}),
    image_url: item.image_url || null,
    source: item.source === "packaged" ? "openfoodfacts" : item.source === "recipe" ? "recipe" : "recent",
    time_of_meal: meal,
  };
}

// HL-017: AHA ideal limit, the same default the backend uses (backend/HEALTH_TARGETS.md). Only used until
// the dashboard data with the patient's own limit has loaded.
export const DEFAULT_SODIUM_LIMIT_MG = 1500;

export type SodiumSummary = {
  earlier: number;
  meal: number;
  after: number;
  limit: number;
  /** mg left after this meal; negative when over. */
  left: number;
  over: boolean;
  /** Bar widths as 0–1 shares of the limit. */
  earlierShare: number;
  mealShare: number;
};

export function sodiumSummary(earlierMg: number, mealMg: number, limitMg?: number | null): SodiumSummary {
  const limit = limitMg && limitMg > 0 ? limitMg : DEFAULT_SODIUM_LIMIT_MG;
  const earlier = Math.max(0, Math.round(earlierMg));
  const meal = Math.max(0, Math.round(mealMg));
  const after = earlier + meal;
  const earlierShare = Math.min(1, earlier / limit);
  return {
    earlier,
    meal,
    after,
    limit,
    left: limit - after,
    over: after > limit,
    earlierShare,
    mealShare: Math.max(0, Math.min(1 - earlierShare, meal / limit)),
  };
}

export function formatMg(mg: number): string {
  return Math.round(mg).toLocaleString("en-US");
}

/** One plain sentence for the review screen. */
export function reviewSodiumLine(s: SodiumSummary): string {
  return s.over
    ? `After this meal you'd be ${formatMg(-s.left)} mg over today's ${formatMg(s.limit)} mg sodium limit.`
    : `After this meal you'll have ${formatMg(s.left)} mg sodium left for today.`;
}

/** One plain sentence for the "logged" screen. */
export function loggedSodiumLine(s: SodiumSummary): string {
  return s.over
    ? `You're at ${formatMg(s.after)} mg sodium today, ${formatMg(-s.left)} mg over your ${formatMg(s.limit)} mg limit. Pick low-salt food for the rest of the day.`
    : `You're at ${formatMg(s.after)} mg sodium today, ${formatMg(s.left)} mg under your ${formatMg(s.limit)} mg limit.`;
}

/** Turns typed text into a number for an editable nutrition box ("" while typing counts as 0). */
export function parseAmount(text: string): number {
  const n = parseFloat(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
