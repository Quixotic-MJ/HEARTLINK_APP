/**
 * The Recipes tab's Breakfast / Lunch / Dinner chips (2026-11-18). The portal saves a recipe's meal as its category, so
 * that decides; a meal word in its tags still counts, for the few recipes tagged that way.
 */
export const MEAL_FILTERS = ["All", "Breakfast", "Lunch", "Dinner"] as const;
export type MealFilter = (typeof MEAL_FILTERS)[number];

export function matchesMeal(recipe: { category?: string; tags?: string[] }, filter: string): boolean {
  if (filter === "All") return true;
  const meal = filter.toLowerCase();
  return (recipe.category ?? "").trim().toLowerCase() === meal || (recipe.tags ?? []).some((t) => t.trim().toLowerCase() === meal);
}
