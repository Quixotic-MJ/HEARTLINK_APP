// HL-155: the weekly meal plan and shopping list (Premium), as the server sends it (/api/meal-plan), and the wording
// the screens use. Recipes are Dietitian-approved and fit the patient's sodium limit and allergies; it's a plan to help,
// not a diet prescription.

export type MealName = "Breakfast" | "Lunch" | "Dinner";

export interface PlannedRecipe {
  id: string;
  name: string;
  image_url: string | null;
  sodium_mg: number;
  calories: number | null;
}

export interface PlannedMeal {
  meal: MealName;
  recipe: PlannedRecipe | null;
  /** For "Your choice": the sodium left for this meal that day */
  choice_limit_mg?: number;
}

export interface PlanDay {
  date: string;
  meals: PlannedMeal[];
  sodium_mg: number;
}

export interface ShoppingItem {
  name: string;
  unit: string;
  /** For one person (one serving per planned meal) */
  amount: number;
  recipes: string[];
}

export interface MealPlan {
  week_start: string;
  shuffle: number;
  sodium_limit_mg: number;
  meal_budget_mg: number;
  recipes_available: Record<MealName, number>;
  days: PlanDay[];
  shopping_list: ShoppingItem[];
  note: string;
}

export const MAX_PEOPLE = 6;

/** "Mon" for 2026-11-16 */
export function dayShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { weekday: "short" });
}

/** "Monday, Nov 16" */
export function dayLong(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function mg(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} mg`;
}

/** The day line: "About 1,050 mg sodium from these meals; your limit is 1,500 mg." */
export function daySodiumLine(day: PlanDay, limit: number): string {
  return `About ${mg(day.sodium_mg)} sodium from these meals; your daily limit is ${mg(limit)}.`;
}

/** An amount for the shopping list, for that many people: up to 2 decimals ("3", "1.5", "0.25"). */
export function amountText(amount: number, people = 1): string {
  return String(Math.round(amount * people * 100) / 100);
}

/** One line of the list: "Rolled oats: 3.5 cup" */
export function itemLine(item: ShoppingItem, people = 1): string {
  return item.amount > 0 ? `${item.name}: ${amountText(item.amount, people)}${item.unit ? ` ${item.unit}` : ""}` : item.name;
}

/** The list as plain text to share. */
export function shoppingText(plan: Pick<MealPlan, "week_start" | "shopping_list">, people = 1): string {
  const who = people === 1 ? "1 person" : `${people} people`;
  const lines = plan.shopping_list.map((item) => `• ${itemLine(item, people)}`);
  return [`HeartLink shopping list, week of ${dayLong(plan.week_start)} (${who})`, "", ...lines].join("\n");
}

/** The Monday of this week, as YYYY-MM-DD (the phone's own date). */
export function thisWeek(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
