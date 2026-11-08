# Starting score: the machine learning model (HL-121)

> **Status: not yet reviewed by any expert.** It's a starting estimate for a wellness guide. It isn't the official Life's
> Essential 8 score, hasn't been validated outside NHANES, and doesn't diagnose or predict any condition.

The score a patient sees at the end of setup, before they log anything. From the first log onward, the score comes from
`heart_score.py`: see `HEART_SCORE.md`.

The model estimates a person's Life's Essential 8 (LE8) score from their setup answers. Its answer is already on the LE8
scale, so no conversion of our own is needed.

| | |
| --- | --- |
| Model file | `starting_score_model.json` (version `starting-score-le8-1`) |
| App code | `app/services/starting_score.py` |
| Built by | `scripts/train_starting_score.py --data-dir <NHANES 2017-2018 folder> --write`; labels in `scripts/le8_label.py`, diet in `scripts/hei2015.py` |
| Data | NHANES 2017-2018 (US): 3,703 adults aged 20 and over with all 8 areas, not pregnant, and not told they have heart disease or had a stroke |
| Label | Each person's LE8 score: the AHA's published points, from their NHANES measurements and answers |
| Method | Linear regression on standardised features |

## How the first score is worked out

1. Setup answers for BMI, activity, sleep and smoking become the AHA's points, using the same tables as the app.
2. The model combines those with age and sex to give an estimate from 0 to 100.
3. HeartLink's own rules apply, using `heart_score.final_score`. There's no reading yet, so the score can't go above 79, and it
   can't go below 50, because answers alone shouldn't pause workouts.

The saved record keeps the model's raw estimate as `model_estimate`, and the rule that changed it as `rule`.

## The model

| Feature | From setup | Weight per SD |
| --- | --- | --- |
| Activity points | Weekly minutes; hard exercise counts twice | +6.77 |
| BMI points | Height and weight, AHA's Asian and Pacific row | +6.51 |
| Nicotine points | Smoking answers and when they quit | +4.94 |
| Sleep points | Sleep question | +3.41 |
| Age | Date of birth (80+ counted as 80) | -2.91 |
| Male | Sex | -1.22 |

Alcohol and sitting time are left out because they added almost nothing. Setup still asks them, because case review and the
clinical export use them. Setup's diet questions aren't inputs because they don't match anything in NHANES.

## How the labels were made

| Area | NHANES data | Rule |
| --- | --- | --- |
| Blood pressure | Average of exam readings, `BPQ050A` for medicine | AHA table, minus 20 if treated |
| Activity | `PAQ_J`: leisure and getting around; vigorous counts double | AHA table |
| Sleep | `SLD012` and `SLD013`, weighted to a 7-day week | AHA table |
| Nicotine | `SMQ_J`, `SMD460` | AHA table, minus 20 for a smoker at home. Current cigars count as smoking; current e-cigarettes as 25 points |
| BMI | `BMXBMI` | AHA's Asian and Pacific row for everyone, to match the app and fit Filipino users. Under 18.5 gets 100, as in the AHA's standard row |
| Cholesterol | Total minus HDL, `BPQ100D` for medicine | AHA table, minus 20 if treated |
| Blood sugar | HbA1c first, then fasting glucose; `DIQ010` | AHA table |
| Diet | HEI-2015, NCI's simple method, from `DR1IFF_J`, `DR2IFF_J` and USDA's FPED 2017-2018 | AHA's percentile points among these adults, using survey weights |

**Work activity is left out on purpose.** With it, activity scored 78.8, not among the lowest areas as the AHA reports, and the
overall average moved further from theirs (68.5, compared with 66.0 without it). This choice was made after seeing those
results, and reviewers should know that.

## Checking the labels against the AHA

Using the AHA's standard BMI row, ages 20 to 79, not pregnant, no heart disease or stroke, with survey weights:

| | Ours (2017-2018) | AHA (2013-2018) |
| --- | --- | --- |
| Adult average | 66.0 | 64.7 |
| Women / men | 67.6 / 64.4 | 67.0 / 62.5 |
| High / moderate / low | 20.2% / 64.3% / 15.5% | 19.6% / 62.5% / 17.9% |

Diet, activity and BMI are the lowest areas, as the AHA reports. The AHA figures come from news summaries of Lloyd-Jones et al.
(see Sources), and the comparison isn't exact because the survey years differ.

## How well it does (5-fold cross-validation, Asian and Pacific BMI row)

| Method | Average error | Typical error (RMSE) | R² | Same level |
| --- | --- | --- | --- | --- |
| Guessing everyone's average | 12.2 | 15.0 | 0.00 | 43% |
| Age alone | 11.8 | 14.5 | 0.07 | 38% |
| AHA rules on setup answers, no training | 9.4 | 11.8 | 0.39 | 55% |
| Linear model on raw answers | 8.6 | 10.7 | 0.50 | 51% |
| Gradient boosting on raw answers | 6.7 | 8.4 | 0.69 | 62% |
| **This model** | **6.5** | **8.1** | **0.71** | **64%** |
| This model, if setup also asked about diagnosed high blood pressure, cholesterol and diabetes | 6.2 | 7.7 | 0.74 | 65% |

- 78% of estimates are within 10 points.
- 17% of the time, the estimate's level looks better than the real one. The limit of 79 reduces this at the top.
- Average error is similar across groups: women 6.3, men 6.6, ages 20-39 6.2, 40-59 6.7, 60+ 6.5.
- For context, Zheng et al. reported a typical error of 9.21 for their fewest-input NHANES model, but 18.33 on outside data. Their
  inputs differ, so this isn't a direct comparison.

## Known limits

- It mostly reads what the person told us. BMI, activity, sleep and smoking do most of the work, and it says little about blood
  pressure, cholesterol, blood sugar or diet (typical error on those four areas: 15.3, compared with 17.7 for guessing).
- It uses US data, it hasn't been tested on Filipino users or HeartLink patients, and expect it to do worse on them.
- Most inputs are self-reported, though the labels use measurements.
- It's only used until the first log, and the score can jump at that point.
- Retraining from the portal's clinical reviews (HL-059) is switched off. Those reviews hold yes/no labels from the old method. The
  export and the accuracy check remain.

## Sources

1. Lloyd-Jones DM, et al. [Life's Essential 8](https://pmc.ncbi.nlm.nih.gov/articles/PMC10503546/). Circulation, 2022. Points tables.
2. Lloyd-Jones DM, et al. Status of Cardiovascular Health in US Adults and Children Using the American Heart Association's New
   Life's Essential 8 Metrics. Circulation, 2022. Published averages, read through
   [a news summary](https://www.news-medical.net/news/20220629/Study-Nearly-8025-of-people-in-the-US-have-low-to-moderate-cardiovascular-health.aspx).
3. Zheng Y, et al. [Estimation of life's essential 8 score with incomplete data of individual metrics](https://www.frontiersin.org/articles/10.3389/fcvm.2023.1216693/full).
   Frontiers in Cardiovascular Medicine, 2023.
4. [CDC NHANES 2017-2018](https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?BeginYear=2017).
5. National Cancer Institute: [HEI scoring method](https://epi.grants.cancer.gov/hei/hei-scoring-method.html),
   [HEI-2015 standards](https://epi.grants.cancer.gov/hei/developing.html).
6. [USDA Food Patterns Equivalents Database](https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/food-surveys-research-group/docs/fped-databases/).

## Replaced

- `starting-score-2` (in git history): logistic regression on whether a person had been told they have heart disease or had a
  stroke, turned into a score with our own formula, `(1 - probability) x 99 + 1`.
- `heartlink_model.pkl` (in git history): 37 inputs and labels generated by an AI.
