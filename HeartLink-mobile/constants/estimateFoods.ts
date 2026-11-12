// HL-157: the values behind "Help me estimate" (Meals › Estimate a meal).
//
// Every number is copied from USDA FoodData Central, SR Legacy (April 2018), per 100 g, with its FDC ID, and every
// household portion is USDA's own (food_portion). FNRI's Philippine Food Composition Tables are the better source for
// Filipino food, but FNRI's servers were down (2026-11-12); swap an entry for FNRI's values when they're back:
// keep the same `id`, set `source` to { name: "FNRI Philippine Food Composition Tables", ref: "<food code>", food: "<FNRI name>" }.
// All values are pending the Dietitian's review (backend/FOOD_RULES.md). USDA foods are US products and recipes.
//
// A nutrient USDA doesn't list is left out (counted as 0).

export interface Per100g {
  sodium: number; // mg
  kcal: number;
  satFat?: number; // g
  cholesterol?: number; // mg
  fiber?: number; // g
}

export interface FoodSource {
  name: "USDA FoodData Central, SR Legacy" | "FNRI Philippine Food Composition Tables";
  /** FDC ID for USDA, the food code for FNRI */
  ref: string;
  /** The food's name in that source */
  food: string;
}

export interface Portion {
  label: string;
  grams: number;
}

export interface EstimateDish {
  id: string;
  name: string;
  group: "Rice and noodles" | "Main dishes" | "Eggs";
  per100g: Per100g;
  portions: Portion[];
  source: FoodSource;
  reviewed: boolean;
}

export interface EstimateExtra {
  id: string;
  name: string;
  group: "Sauces and salt" | "Processed meats";
  /** One tap on + adds this much */
  unit: Portion;
  per100g: Per100g;
  source: FoodSource;
  reviewed: boolean;
}

const USDA = (ref: number, food: string): FoodSource => ({ name: "USDA FoodData Central, SR Legacy", ref: String(ref), food });

export const DISHES: EstimateDish[] = [
  {
    id: "rice",
    name: "Steamed white rice",
    group: "Rice and noodles",
    per100g: { sodium: 1, kcal: 130, satFat: 0.077, cholesterol: 0, fiber: 0.4 },
    portions: [
      { label: "½ cup", grams: 79 },
      { label: "1 cup", grams: 158 },
      { label: "2 cups", grams: 316 },
    ],
    source: USDA(168878, "Rice, white, long-grain, regular, enriched, cooked"),
    reviewed: false,
  },
  {
    id: "fried_rice",
    name: "Fried rice (no meat)",
    group: "Rice and noodles",
    per100g: { sodium: 387, kcal: 174, satFat: 0.54, cholesterol: 18, fiber: 1.1 },
    portions: [
      { label: "½ cup", grams: 68.5 },
      { label: "1 cup", grams: 137 },
      { label: "2 cups", grams: 274 },
    ],
    source: USDA(167668, "Restaurant, Chinese, fried rice, without meat"),
    reviewed: false,
  },
  {
    id: "instant_noodles",
    name: "Instant noodles with the seasoning",
    group: "Rice and noodles",
    per100g: { sodium: 1855, kcal: 440, satFat: 8.117, cholesterol: 0, fiber: 2.9 },
    // USDA: 1 package without the flavor packet = 81 g; 1 flavor packet = 5.8 g
    portions: [
      { label: "½ pack", grams: 43.4 },
      { label: "1 pack", grams: 86.8 },
    ],
    source: USDA(171177, "Soup, ramen noodle, any flavor, dry"),
    reviewed: false,
  },
  {
    id: "fried_chicken",
    name: "Fried chicken",
    group: "Main dishes",
    per100g: { sodium: 88, kcal: 262, satFat: 4.09, cholesterol: 97, fiber: 0.1 },
    portions: [
      { label: "1 piece (thigh)", grams: 62 },
      { label: "2 pieces", grams: 124 },
    ],
    source: USDA(173624, "Chicken, broilers or fryers, thigh, meat and skin, cooked, fried, flour"),
    reviewed: false,
  },
  {
    id: "bangus",
    name: "Bangus (milkfish), grilled or baked",
    group: "Main dishes",
    per100g: { sodium: 92, kcal: 190, cholesterol: 67, fiber: 0 },
    portions: [
      { label: "Palm-sized piece", grams: 85 },
      { label: "2 palm-sized pieces", grams: 170 },
    ],
    source: USDA(171995, "Fish, milkfish, cooked, dry heat"),
    reviewed: false,
  },
  {
    id: "tilapia",
    name: "Tilapia, grilled or baked",
    group: "Main dishes",
    per100g: { sodium: 56, kcal: 128, satFat: 0.94, cholesterol: 57, fiber: 0 },
    portions: [
      { label: "1 fillet", grams: 87 },
      { label: "2 fillets", grams: 174 },
    ],
    source: USDA(175177, "Fish, tilapia, cooked, dry heat"),
    reviewed: false,
  },
  {
    id: "fried_egg",
    name: "Fried egg",
    group: "Eggs",
    per100g: { sodium: 207, kcal: 196, satFat: 4.323, cholesterol: 401, fiber: 0 },
    portions: [
      { label: "1 egg", grams: 46 },
      { label: "2 eggs", grams: 92 },
    ],
    source: USDA(173423, "Egg, whole, cooked, fried"),
    reviewed: false,
  },
];

export const EXTRAS: EstimateExtra[] = [
  {
    id: "soy_sauce",
    name: "Soy sauce (toyo)",
    group: "Sauces and salt",
    unit: { label: "1 tbsp", grams: 16 },
    per100g: { sodium: 5493, kcal: 53, satFat: 0.073, cholesterol: 0, fiber: 0.8 },
    source: USDA(174277, "Soy sauce made from soy and wheat (shoyu)"),
    reviewed: false,
  },
  {
    id: "fish_sauce",
    name: "Fish sauce (patis)",
    group: "Sauces and salt",
    unit: { label: "1 tbsp", grams: 18 },
    per100g: { sodium: 7851, kcal: 35, satFat: 0.003, cholesterol: 0, fiber: 0 },
    source: USDA(174531, "Sauce, fish, ready-to-serve"),
    reviewed: false,
  },
  {
    id: "oyster_sauce",
    name: "Oyster sauce",
    group: "Sauces and salt",
    unit: { label: "1 tbsp", grams: 18 },
    per100g: { sodium: 2733, kcal: 51, satFat: 0.043, cholesterol: 0, fiber: 0.3 },
    source: USDA(174529, "Sauce, oyster, ready-to-serve"),
    reviewed: false,
  },
  {
    id: "ketchup",
    name: "Ketchup",
    group: "Sauces and salt",
    unit: { label: "1 tbsp", grams: 17 },
    per100g: { sodium: 907, kcal: 101, satFat: 0.014, cholesterol: 0, fiber: 0.3 },
    source: USDA(168556, "Catsup"),
    reviewed: false,
  },
  {
    id: "salt",
    name: "Salt",
    group: "Sauces and salt",
    // USDA: 1 tsp = 6 g
    unit: { label: "¼ tsp", grams: 1.5 },
    per100g: { sodium: 38758, kcal: 0, satFat: 0, cholesterol: 0, fiber: 0 },
    source: USDA(173468, "Salt, table"),
    reviewed: false,
  },
  {
    id: "hotdog",
    name: "Hotdog",
    group: "Processed meats",
    unit: { label: "1 piece", grams: 50 },
    per100g: { sodium: 914, kcal: 298, satFat: 8.216, cholesterol: 84, fiber: 0 },
    source: USDA(171633, "Frankfurter, meat and poultry, cooked, boiled"),
    reviewed: false,
  },
  {
    id: "vienna_sausage",
    name: "Vienna sausage",
    group: "Processed meats",
    unit: { label: "1 piece", grams: 16 },
    per100g: { sodium: 879, kcal: 230, satFat: 7.125, cholesterol: 87, fiber: 0 },
    source: USDA(172942, "Sausage, Vienna, canned, chicken, beef, pork"),
    reviewed: false,
  },
  {
    id: "luncheon_meat",
    name: "Luncheon meat",
    group: "Processed meats",
    unit: { label: "1 slice", grams: 21 },
    per100g: { sodium: 1289, kcal: 334, satFat: 10.79, cholesterol: 62, fiber: 0 },
    source: USDA(174571, "Luncheon meat, pork, canned"),
    reviewed: false,
  },
  {
    id: "corned_beef",
    name: "Corned beef (canned)",
    group: "Processed meats",
    unit: { label: "1 oz (28 g)", grams: 28.35 },
    per100g: { sodium: 897, kcal: 250, satFat: 6.18, cholesterol: 86, fiber: 0 },
    source: USDA(170602, "Beef, cured, corned beef, canned"),
    reviewed: false,
  },
  {
    id: "sardines",
    name: "Sardines in tomato sauce",
    group: "Processed meats",
    unit: { label: "1 sardine", grams: 38 },
    per100g: { sodium: 414, kcal: 185, satFat: 2.684, cholesterol: 61, fiber: 0.1 },
    source: USDA(175140, "Fish, sardine, Pacific, canned in tomato sauce, drained solids with bone"),
    reviewed: false,
  },
];
