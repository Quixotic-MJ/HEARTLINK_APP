import test from "node:test";
import assert from "node:assert/strict";
import { exerciseRows, formatLength, itemFacts, mealOf, mealsByDay, sodiumOverDays, statusLabel } from "./caseReviewLogs.js";

const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const meal = (timestamp, data) => ({ type: "Meal", timestamp, data });

test("case review food log: by day, newest first, with each day's sodium against the limit", () => {
  const timeline = [
    meal(at(2026, 11, 16, 8), { meal_name: "Arroz caldo", sodium_mg: 600, calories: 300, saturated_fat_g: 1.24, fiber_g: 2, time_of_meal: "Breakfast" }),
    meal(at(2026, 11, 16, 19), { meal_name: "Pork adobo", sodium_mg: 1100, calories: 520, portion: 1.5, from_recipe: true }),
    meal(at(2026, 11, 17, 20), { meal_name: "Champorado", sodium_mg: 200, time_of_meal: "Breakfast" }),
    { type: "Vitals", timestamp: at(2026, 11, 17, 7), data: {} },
  ];
  const days = mealsByDay(timeline);
  assert.deepEqual(days.map((d) => d.day), ["2026-11-17", "2026-11-16"]);
  assert.equal(days[1].sodium, 1700);
  assert.equal(days[1].over, true);
  assert.equal(days[0].over, false);
  assert.deepEqual(days[1].items.map((i) => i.meal), ["Breakfast", "Dinner"]);
  assert.equal(days[1].items[1].portion, 1.5);
  assert.equal(days[1].items[1].fromRecipe, true);
  // A breakfast logged in the evening stays a breakfast
  assert.equal(days[0].items[0].meal, "Breakfast");
  assert.deepEqual(sodiumOverDays(days), { over: 1, logged: 2 });
});

test("case review food log: older logs without a chosen meal use their clock time", () => {
  assert.equal(mealOf(meal(at(2026, 11, 16, 12), {})), "Lunch");
  assert.equal(mealOf(meal(at(2026, 11, 16, 23), {})), "Snack");
});

test("case review exercise log: newest first, real length, result and effort", () => {
  const rows = exerciseRows([
    { type: "Exercise", timestamp: at(2026, 11, 15, 7), data: { routine_name: "Chair march", duration_minutes: 10, status: "completed" } },
    { type: "Exercise", timestamp: at(2026, 11, 16, 7), data: { routine_name: "Wall push-ups", duration_seconds: 75, status: "incomplete_due_to_symptoms", effort_rating: 7 } },
  ]);
  assert.deepEqual(rows.map((r) => r.name), ["Wall push-ups", "Chair march"]);
  assert.equal(formatLength(rows[0].seconds), "1 min 15 s");
  assert.equal(formatLength(rows[1].seconds), "10 min");
  assert.equal(statusLabel(rows[0].status), "Stopped, felt unwell");
  assert.equal(rows[0].effort, 7);
  assert.equal(formatLength(null), "Not recorded");
});

test("recommended items show the facts an expert judges them by", () => {
  assert.deepEqual(itemFacts({ category: "Lunch", sodium_mg: 320.4, calories: 410, saturated_fat_g: 2.26 }, "recipe"), [
    "Lunch", "320 mg sodium", "410 kcal", "2.3 g saturated fat",
  ]);
  assert.deepEqual(itemFacts({ type: "Breathing", intensity: "None", duration_minutes: 5, position: "Seated" }, "exercise"), [
    "Breathing", "5 min", "Seated",
  ]);
  assert.deepEqual(itemFacts({ name: "Old item" }, "recipe"), []);
});
