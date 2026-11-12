# HeartLink daily health targets

> **Status: pending expert review.** These numbers come from published guidelines and were put in
> (HL-016, HL-017) so the app stops using placeholders. HeartLink's cardiologist and dietitian still need to
> review them. Change them in `app/services/nutrition_targets.py`, then update this file.

HeartLink is a wellness tool, not a diagnostic device. These are everyday guideline amounts, not a
prescription. **HL-156 (strict limits, as the Cardiologist asked):** sodium and cholesterol come from the guidelines.
A patient can't raise or change them; only the care team can save a **stricter** (lower) one, and a higher saved value
is ignored.

The targets are worked out every time they are read (dashboard, Health Targets & Limits), from the profile
(`date_of_birth`, `sex`, `height_cm`, `weight_kg`) and the setup answers. Nothing extra is stored, so they
follow weight changes straight away.

## Limits

| Target | Value | How it is worked out | Source |
|---|---|---|---|
| Sodium | 1,500 mg a day | Fixed. The WHO upper limit for all adults is 2,000 mg. | AHA ideal limit[^aha-sodium]; PSH/PHA 2020 Philippine hypertension guideline, "sodium restriction to as low as 1500 mg/day"[^psh-pha]; WHO[^who-sodium] |
| Cholesterol (from food) | 200 mg a day | Fixed (HL-147: a strict daily limit, as the Cardiologist asked). | PHA/PLAS 2020 Philippine dyslipidemia guideline: a low-fat, low-cholesterol diet at any risk level[^pha-plas] (no number); the 200 mg is the NCEP ATP III Therapeutic Lifestyle Changes (TLC) diet[^tlc] |
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

## Saved limits (stricter only, HL-156)

| `user_thresholds` column | Rule |
|---|---|
| `sodium_limit_mg` | Used only when **lower** than 1,500 ("Set by your care team"). Setup saves 1,500; older higher values a patient saved are ignored. `PUT /api/analytics/{id}/thresholds`: a patient can't change it (403); an expert can only set 500–1,500. |
| `cholesterol_limit_mg` | Used only when **lower** than 200. The column defaults to 200. |
| `active_minutes_goal` | The patient's daily movement goal (Settings › Health targets and limits). The only value a patient changes. |
| `daily_calories` (not a column yet) | Calories, and so saturated fat. Read if it is ever added. |

## Where it shows

- `GET /api/dashboard/me` → `nutrition_budget`: `sodium.limit_mg`, `sat_fat.limit_g`, `cholesterol.limit_mg`,
  `calories.target`, each with `source`, plus `bmi` and `bmi_category`. The app's "Today so far" card uses them.
- `GET /api/analytics/{user_id}` → `targets`: every value with its `source` and a short `why`, shown on
  Health Targets & Limits.

[^psh-pha]: Philippine Society of Hypertension and Philippine Heart Association. *Executive summary of the 2020 clinical
  practice guidelines for the management of hypertension in the Philippines.* J Clin Hypertens 2021;23(9):1637–1650.
  https://doi.org/10.1111/jch.14335 (Statement 4.1; it also prefers ABPM, with home monitoring as an acceptable alternative.)
[^pha-plas]: Philippine Heart Association, Philippine Lipid and Atherosclerosis Society, et al. *Executive summary of the 2020
  clinical practice guidelines for the management of dyslipidemia in the Philippines.* JAFES 2021;36(1).
  https://doi.org/10.15605/jafes.036.01.01
[^aha-sodium]: American Heart Association, *How much sodium should I eat per day?*
  https://heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/how-much-sodium-should-i-eat-per-day
[^who-sodium]: World Health Organization, *Reducing sodium intake to reduce blood pressure and risk of
  cardiovascular diseases in adults.* https://www.who.int/tools/elena/interventions/sodium-cvd-adults
[^tlc]: National Cholesterol Education Program (NCEP) Expert Panel. *Third Report of the NCEP Expert Panel on Detection,
  Evaluation, and Treatment of High Blood Cholesterol in Adults (Adult Treatment Panel III), final report.* Circulation
  2002;106(25):3143–3421. https://doi.org/10.1161/circ.106.25.3143 (HL-147: replaces the earlier Wikipedia link; the
  200 mg a day limit is the report's Therapeutic Lifestyle Changes diet. Open the link to confirm before the manuscript.)
[^aha-satfat]: American Heart Association, *Saturated fat.*
  https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats
[^mifflin]: Mifflin MD, St Jeor ST, et al. *A new predictive equation for resting energy expenditure in
  healthy individuals.* Am J Clin Nutr 1990;51(2):241–247.
[^bmi]: World Obesity Federation, Philippines country profile (Asia-Pacific BMI cut-offs).
  https://data.worldobesity.org/country/philippines-172/

## The Cardiologist's nutrition points (HL-147, 2026-11-11)

- **Strict daily limits:** sodium 1,500 mg (AHA) and food cholesterol 200 mg (NCEP ATP III), both fixed values with sources.
- **Personal calories:** the calorie target already uses age, weight, height and sex (Mifflin-St Jeor). Heart rate isn't
  added: there's no standard formula for a whole day's calories from heart rate, only for exercise sessions. It's worked
  out inside HeartLink, so no health data goes to an outside service (Data Privacy Act of 2012).
- **Disclaimer:** the Heart risk, setup result, food and report screens say the information follows "the latest
  evidence-based guidelines from accredited health organizations (American Heart Association, Philippine Heart
  Association)" and isn't a diagnosis (HL-156).
- **Latest values (HL-156):** a weight logged at a check-in becomes the profile weight, so BMI, calories and the Heart
  risk use the latest weight. Height comes from the profile. The latest resting heart rate is shown as logged; it isn't
  part of any limit (no standard daily-calorie formula uses it).
