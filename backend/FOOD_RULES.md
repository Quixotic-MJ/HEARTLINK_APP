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
| Sodium, whole day | Within the limit +2, over it −3, over 1.5 times it −5 | Score points | `hss_service.py` | Limit: AHA. **Points are HeartLink's own choice** |
| Saturated fat, per meal | Over 5 g −2, under 1 g +1 | Score points | `hss_service.py` | **HeartLink's own choice** |
| Fibre, per meal | Over 5 g +2 | Score points | `hss_service.py` | **HeartLink's own choice** |
| Sodium left today | Under 500 mg | Lowest-sodium approved recipes are suggested first | `dashboard.py` | **HeartLink's own choice** |
| Recipe sodium | Under 300 mg a serving | Listed as a low-sodium meal in Explore | `explore.ts` | **HeartLink's own choice** |
| Score band | Recipes approved for the patient's band or "Stable" | Which recipes are suggested | `dashboard.py` | Dietitian tags each recipe |
| Allergies | Ingredient, tag or name matches | Left out of suggestions; elsewhere "Contains shrimp (you're allergic to shellfish)" | `dashboard.py`, `food_warnings.py` | Patient's setup answers |
| Diet | Ingredient, tag or name clashes | Left out of suggestions; elsewhere a warning | `dashboard.py`, `food_warnings.py` | Patient's setup answers |

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
| Barcode and packaged foods | Open Food Facts (a public, crowd-sourced database), values per 100 g, labelled "check the package" | Yes |
| Foods the patient types in | The patient's own estimate | Yes, labelled as an estimate |
| Quick Filipino dishes (sinigang, tinola, rice) | Three fixed values in `estimate-meal.tsx` | **No. No source is recorded, so these can't be confirmed from the code** |

HeartLink has **no separate local food list**, and the app doesn't use FNRI or USDA data directly. The report's suggested
sources would be new work: FNRI's [Philippine Food Composition Tables](https://i.fnri.dost.gov.ph/fct/library) and
[USDA FoodData Central](https://fdc.nal.usda.gov/).

## For the Dietitian

1. Are the 800 mg, 400 mg, 6 g and 3 g per-portion lines right? Should they follow the patient's own limit?
2. Please check the three quick dishes against FNRI's tables, or give replacement values.
3. Should each recipe record where its numbers came from?
4. Is 1,500 mg the right default limit for wellness and at-risk users, or the WHO's 2,000 mg?

*FNRI's site didn't respond to an automated check on 2026-11-07, so please confirm the link opens.*
