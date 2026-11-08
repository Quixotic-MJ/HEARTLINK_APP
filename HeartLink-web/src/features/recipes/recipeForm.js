import * as z from "zod";

// HL-031: ingredient units are picked from a list instead of typed
export const UNIT_GROUPS = [
  {
    label: "Weight",
    units: [
      ["g", "g (grams)"],
      ["kg", "kg (kilograms)"],
    ],
  },
  {
    label: "Volume",
    units: [
      ["ml", "ml (millilitres)"],
      ["L", "L (litres)"],
      ["cup", "cup"],
      ["tbsp", "tbsp (tablespoon)"],
      ["tsp", "tsp (teaspoon)"],
    ],
  },
  {
    label: "Count",
    units: [
      ["pc", "pc (piece)"],
      ["slice", "slice"],
      ["clove", "clove"],
      ["stalk", "stalk"],
      ["can", "can"],
      ["pack", "pack"],
      ["serving", "serving"],
      ["pinch", "pinch"],
    ],
  },
  {
    label: "Size",
    units: [
      ["small", "small"],
      ["medium", "medium"],
      ["large", "large"],
    ],
  },
];
export const UNIT_VALUES = new Set(
  UNIT_GROUPS.flatMap((g) => g.units.map(([value]) => value)),
);

// Older recipes typed some units differently; these select the matching dropdown option.
const UNIT_ALIASES = {
  cups: "cup",
  cloves: "clove",
  stalks: "stalk",
  slices: "slice",
  pcs: "pc",
  piece: "pc",
  pieces: "pc",
  gram: "g",
  grams: "g",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  l: "L",
  liter: "L",
  litre: "L",
  cans: "can",
  packs: "pack",
  servings: "serving",
};

const normalizeUnit = (unit) => {
  const trimmed = (unit || "").trim();
  if (!trimmed || UNIT_VALUES.has(trimmed)) return trimmed;
  return UNIT_ALIASES[trimmed.toLowerCase()] || trimmed;
};

const parseIngredientString = (str) => {
  if (!str) return { name: "", amount: "", unit: "" };
  const match = str.trim().match(/^([0-9./]+)\s*([a-zA-Z]+)?\s+(.+)$/);
  if (match) {
    const amtStr = match[1];
    let amount = parseFloat(amtStr);
    if (amtStr.includes("/")) {
      const parts = amtStr.split("/");
      if (parts.length === 2) {
        amount = parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    }
    const unit = normalizeUnit(match[2]);
    const name = match[3] || "";
    if (!isNaN(amount) && name) {
      return { name, amount: String(amount), unit };
    }
  }
  return { name: str, amount: "", unit: "" };
};

export const foodSchema = z
  .object({
    name: z.string().min(1, "Name is required."),
    foodSourceType: z.string().default("Home Recipe"),
    category: z.string().min(1, "Category is required."),
    categoryOther: z
      .string()
      .max(40, "Keep it under 40 characters.")
      .optional(),
    prepTimeMinutes: z.coerce.number().min(0, "Cannot be negative").default(15),
    servings: z.coerce.number().min(1, "At least 1 serving").default(1),
    difficulty: z.string().default("Easy"),
    calories: z.coerce.number().min(0, "Cannot be negative"),
    sodium: z.coerce.number().min(0, "Cannot be negative"),
    satFat: z.coerce.number().min(0, "Cannot be negative"),
    cholesterol: z.coerce.number().min(0, "Cannot be negative"),
    fiber: z.coerce.number().min(0, "Cannot be negative"),
    expertValidated: z.boolean().default(false),
    status: z.string().default("draft"),
    mediaUrl: z.string().optional(),
    ingredients: z
      .array(
        z.object({
          name: z.string().min(1, "Ingredient name is required."),
          amount: z
            .union([
              z.literal(""),
              z.coerce.number().min(0, "Amount cannot be negative"),
            ])
            .nullable()
            .optional(),
          unit: z.string().nullable().optional(),
        }),
      )
      .min(1, "At least one ingredient is required."),
    steps: z
      .array(
        z.object({
          value: z.string().min(1, "Step content is required."),
        }),
      )
      .min(1, "At least one step is required."),
  })
  .superRefine((data, ctx) => {
    // HL-030: "Others" needs a typed category name
    if (data.category === "Others" && !(data.categoryOther || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryOther"],
        message: "Type the category name.",
      });
    }
  });

export const DEFAULT_VALUES = {
  name: "",
  category: "Breakfast",
  categoryOther: "",
  foodSourceType: "Home Recipe",
  prepTimeMinutes: 15,
  servings: 1,
  difficulty: "Easy",
  sodium: 0,
  calories: 0,
  satFat: 0,
  cholesterol: 0,
  fiber: 0,
  status: "draft",
  expertValidated: false,
  mediaUrl: "",
  ingredients: [{ name: "", amount: "", unit: "" }],
  steps: [{ value: "" }],
};

// shortcut: legacy nutrient defaults remain until the deferred nullable-nutrition contract is implemented.
export function recipeValues(recipe) {
  if (!recipe) return DEFAULT_VALUES;
  let stepsList = [];
  if (recipe.steps && recipe.steps.length > 0) {
    stepsList = recipe.steps.map((s) => ({ value: s }));
  } else if (recipe.instructions) {
    stepsList = recipe.instructions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ value: s }));
  }
  if (stepsList.length === 0) {
    stepsList = [{ value: "" }];
  }

  let ingredientsList = [];
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    ingredientsList = recipe.ingredients.map((ing) => {
      if (typeof ing === "string") {
        return parseIngredientString(ing);
      }
      return {
        name: ing.name || "",
        amount:
          ing.amount !== null && ing.amount !== undefined
            ? String(ing.amount)
            : "",
        unit: normalizeUnit(ing.unit),
      };
    });
  }
  if (ingredientsList.length === 0) {
    ingredientsList = [{ name: "", amount: "", unit: "" }];
  }

  return {
    name: recipe.name || "",
    category: recipe.category || "Breakfast",
    categoryOther: recipe.categoryOther || "",
    foodSourceType: recipe.foodSourceType || "Home Recipe",
    prepTimeMinutes:
      recipe.prepTimeMinutes !== undefined ? recipe.prepTimeMinutes : 15,
    servings: recipe.servings !== undefined ? recipe.servings : 1,
    difficulty: recipe.difficulty || "Easy",
    sodium: recipe.sodium || 0,
    calories: recipe.calories || 0,
    satFat: recipe.satFat || 0,
    cholesterol: recipe.cholesterol || 0,
    fiber: recipe.fiber || 0,
    status: recipe.status || "draft",
    expertValidated: recipe.expertValidated || false,
    mediaUrl: recipe.mediaUrl || "",
    ingredients: ingredientsList,
    steps: stepsList,
  };
}

export function recipePayload(data) {
  const mappedIngredients = (data.ingredients || [])
    .filter((i) => i.name && i.name.trim())
    .map((i) => ({
      name: i.name.trim(),
      amount:
        i.amount !== "" && i.amount !== null && i.amount !== undefined
          ? Number(i.amount)
          : null,
      unit: i.unit ? i.unit.trim() : null,
    }));

  const mappedSteps = (data.steps || [])
    .filter((s) => s.value && s.value.trim())
    .map((s) => s.value.trim());

  const payload = { ...data };
  delete payload.expertValidated;
  return {
    ...payload,
    categoryOther:
      data.category === "Others" ? (data.categoryOther || "").trim() : "",
    prepTimeMinutes: Number(data.prepTimeMinutes) || 15,
    servings: Number(data.servings) || 1,
    difficulty: data.difficulty || "Easy",
    ingredients: mappedIngredients,
    steps: mappedSteps,
  };
}
