# HeartLink daily health targets

> **Status: pending expert review.** These numbers come from published guidelines and were put in
> (HL-016, HL-017) so the app stops using placeholders. HeartLink's cardiologist and dietitian still need to
> review them. Change them in `app/services/nutrition_targets.py`, then update this file.

HeartLink is a wellness tool, not a diagnostic device. These are everyday guideline amounts, not a
prescription. A limit saved for a patient in `user_thresholds` (by the patient on Health Targets & Limits,
or by an expert) always wins over the guideline value.

The targets are worked out every time they are read (dashboard, Health Targets & Limits), from the profile
(`date_of_birth`, `sex`, `height_cm`, `weight_kg`) and the setup answers. Nothing extra is stored, so they
follow weight changes straight away.

## Limits

| Target | Value | How it is worked out | Source |
|---|---|---|---|
| Sodium | 1,500 mg a day | Fixed. The WHO upper limit for all adults is 2,000 mg. | AHA ideal limit[^aha-sodium]; WHO[^who-sodium] |
| Cholesterol (from food) | 200 mg a day | Fixed. | NCEP ATP III Therapeutic Lifestyle Changes (TLC) diet[^tlc] |
| Saturated fat | 6% of the calorie target ÷ 9 kcal/g, rounded to whole grams (13 g on 2,000 kcal) | Follows the calorie target. | AHA: 5–6% of calories for people who need to lower LDL cholesterol[^aha-satfat] |
| Calories | Resting energy × activity factor, −500 kcal when BMI is 25 or more, never below 1,200 (women) / 1,500 (men), rounded to 10 kcal | See below. | Mifflin-St Jeor equation[^mifflin] |
| BMI | weight (kg) ÷ height (m)² | Shown with its category. | WHO Asia-Pacific cut-offs[^bmi] |

### Calories

1. **Resting energy (Mifflin-St Jeor):** `10 × kg + 6.25 × cm − 5 × age + 5` (men) or `− 161` (women).
2. **Activity factor** from the setup answers. Weekly active minutes = 2 × vigorous + moderate + walking or
   cycling to get around (vigorous counts twice, as in the WHO activity guidelines).

   | Weekly active minutes | Factor | Level |
   |---|---|---|
   | under 60 | 1.2 | little or no exercise |
   | 60–149 | 1.375 | light exercise |
   | 150–299 | 1.55 | moderate exercise |
   | 300 or more | 1.725 | very active |

   No setup answers counts as 1.2 (the lowest, safest factor). Sitting hours are not used, to avoid
   counting inactivity twice.
3. **BMI 25 or more:** take off 500 kcal (about 0.5 kg a week).
4. **Floor:** never below 1,200 kcal (women) or 1,500 kcal (men).

### BMI categories (WHO Asia-Pacific)

| BMI | Category |
|---|---|
| under 18.5 | Underweight |
| 18.5–22.9 | Normal |
| 23–24.9 | Overweight |
| 25 or more | Obese |

## When information is missing

| Missing | What happens |
|---|---|
| Height or weight (or a value outside 100–250 cm / 25–300 kg) | No BMI. Calories 2,000 kcal, so saturated fat 13 g. The reason says which details to add. |
| Date of birth or sex | BMI is still shown. Calories 2,000 kcal, as above. |
| Setup answers | Activity factor 1.2. |

## Saved limits (always win)

| `user_thresholds` column | Overrides |
|---|---|
| `sodium_limit_mg` | Sodium. Setup saves 1,500 for every patient; a value equal to 1,500 is shown with the AHA source, any other value as "Set for you". |
| `cholesterol_limit_mg` | Cholesterol. The column defaults to 200; same rule as sodium. |
| `daily_calories` (not a column yet) | Calories, and so saturated fat. Read if it is ever added. |

## Where it shows

- `GET /api/dashboard/me` → `nutrition_budget`: `sodium.limit_mg`, `sat_fat.limit_g`, `cholesterol.limit_mg`,
  `calories.target`, each with `source`, plus `bmi` and `bmi_category`. The app's "Today so far" card uses them.
- `GET /api/analytics/{user_id}` → `targets`: every value with its `source` and a short `why`, shown on
  Health Targets & Limits.

[^aha-sodium]: American Heart Association, *How much sodium should I eat per day?*
  https://heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/how-much-sodium-should-i-eat-per-day
[^who-sodium]: World Health Organization, *Reducing sodium intake to reduce blood pressure and risk of
  cardiovascular diseases in adults.* https://www.who.int/tools/elena/interventions/sodium-cvd-adults
[^tlc]: Therapeutic Lifestyle Changes (TLC) diet, NCEP Adult Treatment Panel III.
  https://en.wikipedia.org/wiki/Therapeutic_Lifestyle_Changes
[^aha-satfat]: American Heart Association, *Saturated fat.*
  https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats
[^mifflin]: Mifflin MD, St Jeor ST, et al. *A new predictive equation for resting energy expenditure in
  healthy individuals.* Am J Clin Nutr 1990;51(2):241–247.
[^bmi]: World Obesity Federation, Philippines country profile (Asia-Pacific BMI cut-offs).
  https://data.worldobesity.org/country/philippines-172/
