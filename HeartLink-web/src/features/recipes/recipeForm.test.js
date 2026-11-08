import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_VALUES,
  foodSchema,
  recipePayload,
  recipeValues,
} from "./recipeForm.js";

test("recipe form mapping preserves legacy ingredient quantities and unknown amounts", () => {
  const input = {
    name: "Synthetic recipe",
    ingredients: ["1/2 cups oats", { name: "Water", amount: null, unit: "ml" }],
    instructions: "Mix\n\nServe",
  };
  const before = structuredClone(input);
  const values = recipeValues(input);
  assert.deepEqual(values.ingredients, [
    { name: "oats", amount: "0.5", unit: "cup" },
    { name: "Water", amount: "", unit: "ml" },
  ]);
  assert.deepEqual(values.steps, [{ value: "Mix" }, { value: "Serve" }]);
  assert.deepEqual(input, before);
});

test("recipe saves trim form rows without submitting an approval", () => {
  const input = {
    ...DEFAULT_VALUES,
    name: "Synthetic recipe",
    expertValidated: true,
    category: "Others",
    categoryOther: "  Local meal  ",
    ingredients: [
      { name: " Oats ", amount: "", unit: " g " },
      { name: " ", amount: "9" },
    ],
    steps: [{ value: " Mix " }, { value: " " }],
  };
  const before = structuredClone(input);
  const payload = recipePayload(input);
  assert.deepEqual(payload.ingredients, [
    { name: "Oats", amount: null, unit: "g" },
  ]);
  assert.deepEqual(payload.steps, ["Mix"]);
  assert.equal(payload.categoryOther, "Local meal");
  assert.equal(Object.hasOwn(payload, "expertValidated"), false);
  assert.deepEqual(input, before);
});

test("extracted recipe validation still rejects incomplete names, quantities and custom categories", () => {
  const valid = {
    ...DEFAULT_VALUES,
    name: "Synthetic recipe",
    ingredients: [{ name: "Oats", amount: 1, unit: "g" }],
    steps: [{ value: "Mix" }],
  };
  assert.equal(foodSchema.safeParse(valid).success, true);
  for (const changed of [
    { name: "" },
    { servings: 0 },
    { category: "Others", categoryOther: " " },
    { ingredients: [{ name: "Oats", amount: -1 }] },
  ]) {
    assert.equal(foodSchema.safeParse({ ...valid, ...changed }).success, false);
  }
});
