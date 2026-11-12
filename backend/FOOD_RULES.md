# HeartLink food advice rules and sources (HL-097)

> **Status: pending the Dietitian's review (HL-066, OT-10).** This describes what the code does today. Daily limits and
> their sources are in `HEALTH_TARGETS.md`; this file covers how food values change what the patient sees.

Principles, from the physiotherapist consultation: advice considers the serving and the whole day, and no food is called
forbidden. Allergy and diet warnings are different: they stay strong and specific.

## How values change what the patient sees

| Value | Rule | What the patient sees | Where | Basis |
|---|---|---|---|---|
| Sodium in one portion | Over 800 mg | "High in sodium", the amount, and that it's more than half of a 1,500 mg daily limit, with a smaller serving or lighter meals as the next step | Scan result, Estimate meal, Recipe page (`foodAdvice.ts`) | **HeartLink's own choice** (800 is about half of the 1,500 mg limit) |
| Sodium in one portion | 401 to 800 mg | "Moderate", the amount, and that it can fit if other meals are lighter | Scan result, Estimate meal | **HeartLink's own choice** |
| Saturated fat in one portion | Over 6 g / 3.1 to 6 g | "High in saturated fat" / "Moderate", with the amount | Scan result, Estimate meal | **HeartLink's own choice** |
| Sodium, whole day | Running total against the patient's limit | Sodium left today, or how far over | Log review, Meal logged (`foodLogging.ts`) | Limit: AHA, WHO |
| Sodium, whole day | Over 2,000 mg | Note suggesting a lighter, lower-salt dinner | Companion note (`companionService.ts`) | WHO |
| Sodium, last 7 days | No days over the limit 2, 1-2 days 1, 3 or more days 0, once 3 days have meals | Part of the Heart score's adapted diet points | `heart_score.py` | Limit: AHA. **Points are HeartLink's own choice** |
| Sodium left today | A recipe's sodium vs what's left today | Recipes that fit what's left are suggested first (Dietitian-validated first, then lowest sodium); then the rest, lowest sodium first (HL-158) | `dashboard.py` (`order_recipe_picks`) | **HeartLink's own choice** |
| Recipe sodium | Under 300 mg a serving | Listed as a low-sodium meal in Explore | `explore.ts` | **HeartLink's own choice** |
| Score band | Recipes approved for the patient's band or "Stable" | Which recipes are suggested | `dashboard.py` | Dietitian tags each recipe |
| Allergies | Ingredient, tag or name matches | Left out of suggestions and the weekly meal plan; elsewhere "Contains shrimp (you're allergic to shellfish)" | `dashboard.py`, `meal_plan.py`, `food_warnings.py` | Patient's setup answers |
| Diet | Ingredient, tag or name clashes (Halal, Vegan, Vegetarian, Pescatarian) | Left out of suggestions and the weekly meal plan; elsewhere a warning | `dashboard.py`, `meal_plan.py`, `food_warnings.py` | Patient's setup answers. **Low-carb (a setup choice) has no rule yet: needs the Dietitian's carbohydrate limit** |
| Hidden by the care team | A recipe marked not suitable for this patient (HL-057) | Left out of suggestions, Explore's lists and the weekly meal plan | `dashboard.py`, `meal_plan.py`, `browse.tsx` | The care team's case review |

Calories and cholesterol are shown against daily limits but don't change the score or the suggestions.

## Changed in HL-097

- "High Sodium" could appear when saturated fat was the real reason. The title now names the actual reason.
- "Heart-Friendly" and "Excellent choice for cardiovascular stability" were health claims. They're now "Lower in sodium
  and saturated fat" and the amounts.
- The recipe page warned at **140 mg** and said "based on your baseline", though nothing was personal: nearly any recipe
  would trigger it. It now uses the same 800 mg rule and states the amount.
- The companion note credited the 2,000 mg limit to DOST-FNRI; it's the WHO's figure. It also suggested a
  "potassium-rich dinner", which was removed: more potassium isn't safe for everyone, such as some people with kidney
  disease or on some blood pressure medicines.
- The Estimate meal tips said soy sauce **or patis** has nearly 900 mg a tablespoon. Patis can have more, so the tip was
  corrected and now points to FNRI's tables.

## Where food values come from

| Food | Source | Confirmed? |
|---|---|---|
| HeartLink recipes | Entered in the portal; a Dietitian approves each recipe before patients see it | The approval is recorded. **The source of each recipe's numbers isn't recorded** |
| Barcode and packaged foods (scanned, or found by typing a name) | Open Food Facts (a public, crowd-sourced database), values per 100 g, labelled "check the package" (`barcode-scan.tsx`, `searchPackagedFoods` in `services/foodSearch.ts`) | Yes |
| Recent meals | Copies of the patient's own earlier logs, so they carry whichever source above the first log used | Yes |
| Foods the patient types in | The patient's own estimate | Yes, labelled as an estimate |
| "Help me estimate" (Estimate a meal, HL-157) | USDA FoodData Central, SR Legacy, each with its FDC ID (`constants/estimateFoods.ts`; table below). Replaced the three unsourced quick dishes (sinigang, tinola, rice) | Yes, sourced. **Pending the Dietitian's review; US foods and recipes** |

Checked against the code on 2026-11-10: these are the only sources. The AI (Gemini) writes companion notes only and
never supplies food values. Since HL-157 the only local food list is the estimate helper's (below), from
[USDA FoodData Central](https://fdc.nal.usda.gov/). FNRI's [Philippine Food Composition Tables](https://i.fnri.dost.gov.ph/fct/library)
are the better source for Filipino food; FNRI's servers were down on 2026-11-12, so USDA is used until they're back.

## Weekly meal plan (HL-155, HL-159)

| Rule | What happens | Where |
|---|---|---|
| Recipes | Dietitian-approved and published, no allergy or diet clash, not hidden by the care team | `meal_plan.py` (`suitable_recipes`) |
| Sodium | Each day's meals stay within 80% of the daily limit (20% kept for snacks and drinks); a meal that can't fit is "Your choice" | `meal_plan.py` |
| Patient's swap | Another recipe that passes the same rules and fits the day; checked again every time the plan is read, and the plan's pick comes back if it no longer suits | `meal_plan.py`, `meal_plan_changes` |
| "My own meal" | The patient's own estimate (the estimate helper or a label): counts against the day's sodium, shown as "Your estimate", never as approved, not on the shopping list; a day over the limit says so | `meal_plan.py`, `estimate-meal.tsx` |
| Saved recipes | Picked first, each at most twice a week and never two days running (**HeartLink's own choice**) | `meal_plan.py` |

A planned meal isn't a logged meal: only meals the patient logs count toward the day's totals and the Heart score.

## Estimate helper values (HL-157)

Meals › Estimate a meal › **Help me estimate**: the patient picks the closest dish and portion, then adds the sauces,
salt and processed meats they used. The app adds them up and fills the same fields as a food label would; the patient
can change every number ("Use a food label"). The meal saves as a manual entry.

Every value is copied from **USDA FoodData Central, SR Legacy (April 2018)**, per 100 g, with USDA's own household
portion weights (`food_portion`). All are `reviewed: false`. Sodium per portion = per 100 g × grams ÷ 100.

**Dishes**

| Shown as | USDA food (FDC ID) | Sodium mg / 100 g | kcal / 100 g | Portions |
|---|---|---|---|---|
| Steamed white rice | Rice, white, long-grain, regular, enriched, cooked (168878) | 1 | 130 | ½ cup 79 g, 1 cup 158 g, 2 cups 316 g |
| Fried rice (no meat) | Restaurant, Chinese, fried rice, without meat (167668) | 387 | 174 | ½ cup 68.5 g, 1 cup 137 g, 2 cups 274 g |
| Instant noodles with the seasoning | Soup, ramen noodle, any flavor, dry (171177) | 1,855 | 440 | ½ pack 43.4 g, 1 pack 86.8 g |
| Fried chicken | Chicken, broilers or fryers, thigh, meat and skin, cooked, fried, flour (173624) | 88 | 262 | 1 thigh 62 g, 2 pieces 124 g |
| Bangus (milkfish), grilled or baked | Fish, milkfish, cooked, dry heat (171995) | 92 | 190 | palm-sized 85 g, 2 pieces 170 g |
| Tilapia, grilled or baked | Fish, tilapia, cooked, dry heat (175177) | 56 | 128 | 1 fillet 87 g, 2 fillets 174 g |
| Fried egg | Egg, whole, cooked, fried (173423) | 207 | 196 | 1 egg 46 g, 2 eggs 92 g |

**Hidden salt (one tap on +)**

| Shown as | USDA food (FDC ID) | Sodium mg / 100 g | One unit | Sodium per unit |
|---|---|---|---|---|
| Soy sauce (toyo) | Soy sauce made from soy and wheat (shoyu) (174277) | 5,493 | 1 tbsp, 16 g | 879 mg |
| Fish sauce (patis) | Sauce, fish, ready-to-serve (174531) | 7,851 | 1 tbsp, 18 g | 1,413 mg |
| Oyster sauce | Sauce, oyster, ready-to-serve (174529) | 2,733 | 1 tbsp, 18 g | 492 mg |
| Ketchup | Catsup (168556) | 907 | 1 tbsp, 17 g | 154 mg |
| Salt | Salt, table (173468) | 38,758 | ¼ tsp, 1.5 g | 581 mg |
| Hotdog | Frankfurter, meat and poultry, cooked, boiled (171633) | 914 | 1 piece, 50 g | 457 mg |
| Vienna sausage | Sausage, Vienna, canned, chicken, beef, pork (172942) | 879 | 1 piece, 16 g | 141 mg |
| Luncheon meat | Luncheon meat, pork, canned (174571) | 1,289 | 1 slice, 21 g | 271 mg |
| Corned beef (canned) | Beef, cured, corned beef, canned (170602) | 897 | 1 oz, 28 g | 254 mg |
| Sardines in tomato sauce | Fish, sardine, Pacific, canned in tomato sauce, drained solids with bone (175140) | 414 | 1 sardine, 38 g | 157 mg |

**Limits of these values:** USDA foods are US products and recipes. Filipino home and carinderia cooking is often
saltier, which is why the hidden-salt step is there. The screen says "an estimate from USDA FoodData Central values (US
foods and recipes), pending Dietitian review".

### Dietitian template: Filipino dishes from FNRI

When FNRI's tables are reachable, fill one row per dish from FNRI's Philippine Food Composition Tables. The team copies
each row into `constants/estimateFoods.ts`: a new entry, or the same `id` to replace a USDA one, with
`source: { name: "FNRI Philippine Food Composition Tables", ref: "<food code>", food: "<FNRI name>" }`.

| Dish | FNRI food code | FNRI food name | Sodium mg / 100 g | kcal / 100 g | Sat fat g / 100 g | Cholesterol mg / 100 g | Fibre g / 100 g | Portions (label and grams) |
|---|---|---|---|---|---|---|---|---|
| Pork adobo | | | | | | | | |
| Chicken adobo | | | | | | | | |
| Sinigang na baboy | | | | | | | | |
| Tinola (chicken) | | | | | | | | |
| Pancit canton | | | | | | | | |
| Pancit bihon | | | | | | | | |
| Longganisa | | | | | | | | |
| Tocino | | | | | | | | |
| Pinakbet | | | | | | | | |
| Menudo | | | | | | | | |
| Fried fish (galunggong) | | | | | | | | |
| Lumpia | | | | | | | | |
| Bagoong (per tsp) | | | | | | | | |
| Rice, and the USDA rows above | | | | | | | | |

## For the Dietitian

1. Are the 800 mg, 400 mg, 6 g and 3 g per-portion lines right? Should they follow the patient's own limit?
2. Please check the estimate helper's values (above) and fill the FNRI template when FNRI's tables are reachable.
3. Should each recipe record where its numbers came from?
4. Is 1,500 mg the right default limit for wellness and at-risk users, or the WHO's 2,000 mg?

*FNRI's site didn't respond to an automated check on 2026-11-07, so please confirm the link opens.*
