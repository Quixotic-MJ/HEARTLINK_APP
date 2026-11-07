# Heart score: the evidence for every part (HL-098)

> **Status: pending the Cardiologist's review (OT-10).** This lists what the code does today and how much evidence sits
> behind each number. Sources were looked up on 2026-11-07, mostly through summaries, so the reviewer should confirm them
> against the original guidelines. Nothing here has been validated as a score: it's a wellness indicator, not a
> diagnosis or a risk prediction.

Each part has one of these labels:

- **Guideline:** the threshold comes directly from the cited source.
- **Guideline, adapted:** the threshold is from the source, but the points or the use are HeartLink's.
- **Own choice:** HeartLink's own choice, needs expert review.

**Main finding:** the health thresholds are mostly from guidelines, but almost every *points value* is HeartLink's own
choice. No published source says how many points a meal or a walk is worth.

## 1. Starting score

| Part | Rule | Label | Source or note |
|---|---|---|---|
| Model | Logistic regression on setup answers; score = (1 − probability) × 99 + 1 | Published data, own model | NHANES 2017-2018; see `STARTING_SCORE.md` |
| What it predicts | Ever told by a doctor of heart disease or stroke | Own choice | This is existing disease, not future risk. Worth saying plainly in the manuscript |
| Before any score exists | Base of 75 | Own choice | Fallback only |

## 2. Score bands

| Part | Rule | Label | Note |
|---|---|---|---|
| Bands | 80+, 60-79, 50-59, under 50 | Own choice | No published source; shown as On track, Room to improve, Needs attention, Get checked |

## 3. Reading bands (`compute_vitals_hss`)

| Reading | Band score | Label | Source or note |
|---|---|---|---|
| Under 120 and under 80 | 90 | Guideline, adapted | Category: AHA/ACC [1]. Score: own choice |
| 120-129 with bottom under 80 | 78 | Guideline, adapted | "Elevated" [1] |
| 130-139 or 80-89 | 68 | Guideline, adapted | "Stage 1" [1] |
| 140+ or 90+ | 52 | Guideline, adapted | "Stage 2" [1] |
| 180+ or 120+ | 25, plus the emergency flow | Guideline, adapted | The 2025 guideline reportedly says "severe hypertension" and treats it as an emergency only with organ damage or symptoms [1]. HeartLink deliberately stays cautious and shows emergency guidance either way |
| Under 90 or under 60 | 35, plus the emergency flow | Own choice | Common low blood pressure cut-offs; the emergency response is a safety choice |
| Pulse over 100 / over 110 | −4 / −8 | Guideline, adapted | Over 100 is the usual adult resting limit; points and the 110 step are own choice |
| Pulse under 50 | −8 | Own choice | The usual lower limit is 60; 50 was chosen to avoid penalising fit people |
| High pulse "after exercise" | No points lost | Own choice | Depends on the patient saying when they measured it (HL-096) |
| Gap between numbers over 60 or under 25 | −5 | Own choice | Clinical rule of thumb; please confirm or remove |

The 2025 AHA/ACC guideline kept the 2017 categories [1], so the code's "AHA/ACC 2017" note is still accurate on the cut-offs.

## 4. How readings move the score

| Part | Rule | Label |
|---|---|---|
| Emergency reading | Drops straight to its band, unsmoothed | Own choice, safety |
| Healthy reading | Never lowers the score | Own choice |
| Other readings | Move a third of the way to the band | Own choice |
| After an emergency | Habits can't raise the score that day | Own choice, safety |

## 5. Daily points (`compute_lifestyle_composite_hss`)

| Part | Rule | Label | Source or note |
|---|---|---|---|
| Sodium, whole day | Within limit +2; over −3; over 1.5 times −5 | Guideline, adapted | Limit: AHA 1,500 mg, WHO 2,000 mg [3][4] |
| Saturated fat, each meal | Over 5 g −2; under 1 g +1 | Own choice | The daily AHA limit isn't what's used here |
| Fibre, each meal | Over 5 g +2 | Own choice | |
| Exercise | +1 per 10 min; ×2 moderate; ×3 vigorous | Guideline, adapted | WHO counts vigorous minutes double, not triple [5]. Uses the routine's fixed label, not how hard it felt |
| Sleep | 7-9 h +3; 6-7 or 9-10 h +1; under 5 or over 11 h −2 | Guideline, adapted | 7-9 h is ideal in Life's Essential 8 [2]; the rest is own choice |
| Medicine | Taken +2 | Own choice | People who take no medicine can't earn these points |
| Symptoms | Chest discomfort, shortness of breath or fainting −10 | Own choice | Emergency handling is separate |
| Blood sugar | Under 70 or over 180 −3; otherwise +2 | Guideline, adapted | Common clinical cut-offs, mostly used in diabetes care; please confirm. Uses the day's latest check-in only |
| Weight | Up 1.5 kg or more since the last weighing −15 | Own choice | A heart-failure style warning with no time limit, and it doesn't match the alert (+1.36 kg in 3 days) |
| Streak | +1 a day, up to +5 | Own choice | Rewards logging, not health |
| Missing data | Nothing for 2 days −5 | Own choice | Penalises not logging, not health |
| Daily cap | ±20 | Own choice | |

## 6. Against Life's Essential 8

Life's Essential 8 scores eight areas from 0 to 100 and averages them equally [2]. HeartLink's score is **not** a Life's
Essential 8 score and shouldn't be described as one.

| Area | In HeartLink? | How |
|---|---|---|
| Blood pressure | **Yes, the main driver** | Every reading |
| Physical activity | Yes | Setup answers and daily minutes |
| Sleep | Yes | Daily hours |
| Diet | Partly | Sodium, saturated fat and fibre only; no overall diet pattern |
| Nicotine | Setup only | Starting score; quitting later doesn't change it |
| Body weight (BMI) | Setup only | Starting score; the daily rule tracks weight gain, not BMI |
| Blood sugar | Partly, optional | Spot value if entered; the framework uses fasting glucose or HbA1c |
| Blood lipids | **No** | The score doesn't use cholesterol levels. Food cholesterol is shown only as a daily limit |

HeartLink also adds things outside the framework: symptoms, medicine, logging streak and missing data.

## For the Cardiologist

1. Are the band scores and the score bands acceptable, given they're not from a published source?
2. Should the score keep rewarding logging and medicine? (See the proposal in HL-102.)
3. Should the weight rule stay now that Version 1 is for wellness and at-risk users?
4. Is the pulse-pressure rule worth keeping?

## Sources

1. 2025 AHA/ACC High Blood Pressure Guideline. Read through summaries:
   [Quick reference](https://www.2minutemedicine.com/guidelines/high-blood-pressure/),
   [AHA news release](https://www.eurekalert.org/news-releases/1094543). Confirm against the full guideline.
2. Lloyd-Jones DM et al. Life's Essential 8. Circulation 2022.
   [PubMed 35766027](https://pubmed.ncbi.nlm.nih.gov/35766027/). The exact point tables weren't retrieved.
3. American Heart Association.
   [How much sodium should I eat per day?](https://heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/how-much-sodium-should-i-eat-per-day)
4. World Health Organization. [Salt reduction fact sheet](https://www.who.int/news-room/fact-sheets/detail/salt-reduction).
5. Bull FC et al. WHO 2020 guidelines on physical activity and sedentary behaviour.
   [PMC7719906](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7719906/).
6. Daily limits and their sources: `backend/HEALTH_TARGETS.md`. Food rules: `backend/FOOD_RULES.md`.
