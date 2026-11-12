import { DISHES, EXTRAS, EstimateDish, EstimateExtra, Per100g } from "../constants/estimateFoods";

// HL-157: "Help me estimate": a dish and its portion, plus the hidden salt (sauces, salt, processed meats), added up
// from the cited values in constants/estimateFoods.ts. It's an estimate, not a measurement.

export interface EstimateSelection {
  /** null for "Something else": only the extras count */
  dishId: string | null;
  portionIndex: number;
  /** extra id -> how many units */
  extras: Record<string, number>;
}

export interface EstimateTotals {
  sodium: number; // mg
  calories: number; // kcal
  satFat: number; // g
  cholesterol: number; // mg
  fiber: number; // g
}

export const MAX_EXTRA = 10;

const ZERO: EstimateTotals = { sodium: 0, calories: 0, satFat: 0, cholesterol: 0, fiber: 0 };

/** The nutrients in `grams` of a food given per 100 g (a missing nutrient counts as 0). */
export function nutrientsFor(per100g: Per100g, grams: number): EstimateTotals {
  const f = grams / 100;
  return {
    sodium: per100g.sodium * f,
    calories: per100g.kcal * f,
    satFat: (per100g.satFat ?? 0) * f,
    cholesterol: (per100g.cholesterol ?? 0) * f,
    fiber: (per100g.fiber ?? 0) * f,
  };
}

function add(a: EstimateTotals, b: EstimateTotals): EstimateTotals {
  return {
    sodium: a.sodium + b.sodium,
    calories: a.calories + b.calories,
    satFat: a.satFat + b.satFat,
    cholesterol: a.cholesterol + b.cholesterol,
    fiber: a.fiber + b.fiber,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The whole meal: sodium, calories and cholesterol to whole numbers; saturated fat and fibre to 1 decimal. */
export function estimateTotals(
  sel: EstimateSelection,
  dishes: EstimateDish[] = DISHES,
  extras: EstimateExtra[] = EXTRAS,
): EstimateTotals {
  let total = ZERO;
  const dish = dishes.find((d) => d.id === sel.dishId);
  const portion = dish?.portions[sel.portionIndex];
  if (dish && portion) total = add(total, nutrientsFor(dish.per100g, portion.grams));
  for (const extra of extras) {
    const count = Math.max(0, Math.min(MAX_EXTRA, sel.extras[extra.id] ?? 0));
    if (count) total = add(total, nutrientsFor(extra.per100g, extra.unit.grams * count));
  }
  return {
    sodium: Math.round(total.sodium),
    calories: Math.round(total.calories),
    satFat: round1(total.satFat),
    cholesterol: Math.round(total.cholesterol),
    fiber: round1(total.fiber),
  };
}

/** The sodium one unit of an extra adds, for its label ("about 880 mg"). */
export function extraSodium(extra: EstimateExtra): number {
  return Math.round(nutrientsFor(extra.per100g, extra.unit.grams).sodium);
}

/** A meal name from the choices: "Fried rice (no meat), 1 cup + 1 tbsp soy sauce (toyo) + 2 × hotdog". */
export function describe(
  sel: EstimateSelection,
  dishes: EstimateDish[] = DISHES,
  extras: EstimateExtra[] = EXTRAS,
): string {
  const parts: string[] = [];
  const dish = dishes.find((d) => d.id === sel.dishId);
  const portion = dish?.portions[sel.portionIndex];
  if (dish && portion) parts.push(`${dish.name}, ${portion.label}`);
  for (const extra of extras) {
    const count = sel.extras[extra.id] ?? 0;
    if (!count) continue;
    const name = extra.name.charAt(0).toLowerCase() + extra.name.slice(1);
    parts.push(count === 1 ? `${extra.unit.label} ${name}` : `${count} × ${extra.unit.label} ${name}`);
  }
  return parts.join(" + ");
}

/** Every value needs a source; used by the tests and kept here so a new entry can't skip it. */
export function missingSources(dishes: EstimateDish[] = DISHES, extras: EstimateExtra[] = EXTRAS): string[] {
  return [...dishes, ...extras].filter((f) => !f.source?.ref || !f.source?.food).map((f) => f.id);
}
