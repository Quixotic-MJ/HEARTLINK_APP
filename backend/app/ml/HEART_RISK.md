# Heart risk: the method and the source of every rule (HL-139 to HL-148)

> **Status: not reviewed by any expert.** The Cardiologist's consultation (2026-11-10) asked to replace the Heart score
> with an ASCVD risk score. There was no time for another consultation, so where their notes don't cover a detail, the
> app follows the AHA's published method and this file marks it **[HeartLink]**. Don't describe any of it as
> expert-approved.
>
> It's an estimate to discuss with a doctor, not a diagnosis. It was built on US data and hasn't been tested on Filipino
> users.

**Code:** `app/services/heart_risk.py`. **Tests:** `tests/test_heart_risk.py`, plus the risk parts of
`test_review_queue.py`, `test_setup_score_flow.py`, `test_lab_results.py`, `test_family.py` and `test_health_report.py`.

## What it is

The Heart risk is the chance of a heart attack or stroke in the next 10 years (10-year ASCVD risk), from the American
Heart Association's **PREVENT** equations, base model [1]. Lower is better.

- It's the app's main number.
- The Life's Essential 8 score stays under it as **"Heart health habits"** (`HEART_SCORE.md`), unchanged, because the
  risk barely moves when someone exercises, eats or sleeps better. The habits score shows that daily progress.

## How it's worked out

| Rule | Label |
|---|---|
| PREVENT base model, ASCVD outcome, logistic form, sex-specific coefficients | [Source] Khan et al. 2024 [1] |
| Ages 30 to 79 only; outside that, no number and "estimates cover ages 30 to 79" | [Source] [1] |
| The 30-year risk is also shown for ages 30 to 59 when the 10-year risk is Low | [Source] 2026 ACC/AHA guideline [2] |
| Inputs: age, sex, total cholesterol, HDL, systolic BP, BP medicine, cholesterol medicine (statin), diabetes, current smoking, eGFR. BMI enters only the heart failure equation | [Source] [1] |
| Values outside PREVENT's ranges (SBP 90–180, total cholesterol 130–320, HDL 20–100, eGFR 15–140, BMI 18.5–39.9) are set to the nearest limit, and the result lists them | [HeartLink]; the ranges are the preventr package's [3] |
| eGFR from creatinine with the race-free CKD-EPI 2021 equation, using age on the test date | [Source] Inker et al. 2021 [4] |
| Lab results count for 12 months from the test date, like the habits score's | [HeartLink] |
| A missing BMI uses 25. It doesn't change the ASCVD risk, because BMI isn't in that equation | [HeartLink] |
| The coefficients were checked against the preventr package's published results: a 50-year-old woman (SBP 160 treated, total 200, HDL 45, diabetes, non-smoker, eGFR 90, BMI 35) gives 9.2%, and a man with the same values 10.2%, at 10 and 30 years | Tested in `test_heart_risk.py` |

## Blood pressure: the Cardiologist's ABPM point (HL-142)

The Cardiologist asked for 24-hour ambulatory monitoring (ABPM), focusing on the 12 hours after waking. That needs a
special device worn for a day, which a phone can't do. HeartLink uses the closest version with home readings:

| Rule | Label |
|---|---|
| The risk uses the average of daytime readings in the last 7 days: within 12 hours after waking, from that day's sleep log wake time | [HeartLink], following the Cardiologist |
| Without a sleep log that day, daytime is 6 am to 6 pm | [HeartLink] |
| With no daytime readings this week, the latest reading from the last 30 days | [HeartLink] |
| With no reading in 30 days, the estimate uses a typical value, and the explanation says so | [HeartLink] |

The Philippine hypertension guideline (PSH/PHA 2020, J Clin Hypertens 2021;23:1637–50) also prefers ABPM and accepts
home blood pressure monitoring as an alternative, which is what the app has (HL-156).

## Bands (lower is better)

| 10-year risk | Band | What happens |
|---|---|---|
| Under 3% | Low | 30-year view for ages 30 to 59 |
| 3 to 4.9% | Borderline | |
| 5 to 9.9% | Intermediate | A gentle "Discuss your heart risk with your doctor at your next checkup" note |
| 10% or more | High | The same note, and the patient goes into the case review urgent lane |

- **The bands:** [Source] the 2026 ACC/AHA cholesterol guideline's PREVENT-ASCVD categories [2].
- **The note and the urgent lane:** [HeartLink], decided with the owner on 2026-11-11. Neither is ever an emergency
  alarm. The emergency thresholds (180/120, 90/60, chest discomfort 7+, breathlessness at rest, fainting) are unchanged
  and don't depend on the risk.

## Without lab results: the machine learning estimate (HL-143)

Most people won't have recent cholesterol and kidney results. Until they add them, the app shows an **Estimated** risk:

1. Three linear regressions predict total cholesterol, HDL and eGFR from setup answers: age, sex, BMI, current smoking,
   BP medicine, diabetes, cholesterol medicine, and a systolic reading when there is one.
2. PREVENT then gives the risk from those predicted values and the person's own answers.

The model file is `heart_risk_model.json`, built with `scripts/train_heart_risk.py`.

**Data:** NHANES 2017-2018, 3,192 adults aged 30 to 79, not pregnant, with no heart disease or stroke, and with
cholesterol, HDL, blood pressure and creatinine measured. Each person's label is their real PREVENT risk from their
measurements. Their average risk is 4.4%.

**How well it does** (5-fold cross-validation, percentage points of risk):

| Method | Average error | Within 2 points | Same band | High called High |
|---|---|---|---|---|
| **This model** (predicted labs, then PREVENT) | **0.78** | **91%** | **85%** | **78%** |
| This model, with no BP reading yet | 1.06 | 85% | 79% | 59% |
| PREVENT with typical lab values (median for sex and age group) | 0.79 | 91% | 85% | 77% |
| Gradient boosting on the answers | 0.82 | 90% | 84% | 74% |
| A linear model guessing the risk directly | 1.09 | 85% | 82% | 79% |
| Guessing everyone's average | 3.47 | 29% | 15% | 0% |

- **To state honestly:** the model is about as accurate as plugging in typical lab values, and clearly better than
  guessing the risk directly. The first version guessed the risk directly. It was replaced because it was less accurate.
- **Too optimistic:** 9% of estimates are in a lower band than the real risk (16% without a BP reading). That's why the
  app always says "Estimated" and asks for lab results.
- **By age:** the average error grows with age (0.3 points at 30-49, 0.9 at 50-64, 1.4 at 65-79), because older people's
  risks are larger.

**Tested and not added (2026-11-12):** a fourth question, "Has a doctor told you your cholesterol is high?" (NHANES
BPQ080), on the same people and folds. It improved the estimate only slightly: average error 0.78 → 0.76 points, same band
85.0% → 85.4%, High called High 77.6% → 79.6% (8 more of the 393 high-risk people), and the cholesterol guess 30.4 → 29.1
mg/dL off. Without a blood pressure reading it made no difference (High called High 58.5% → 58.3%). "Told you have high
blood pressure" (BPQ020) added nothing on top of the BP medicine answer. A blood pressure reading matters far more: it
lifts High called High from 59% to 78%.

## Where the answers come from (HL-140)

- **The three yes/no questions:** "Do you take medicine for blood pressure?", "Has a doctor told you that you have
  diabetes?" and "Do you take medicine for cholesterol?".
- **Where they're asked:** new users answer them in setup. Existing users answer them once on the Dashboard, and anyone
  can change them in Settings › Health answers.
- **Lab results:** the diabetes and cholesterol-medicine answers on the lab results screen update the same answers.
- **Without them:** there's no risk, only "Answer 3 quick questions".

## Where it shows

- **Phone app:** the Dashboard's top card, with "About your heart risk", and the end of setup (the estimated risk).
  Also Trends (up to 30 days), the health report (screen and PDF) and the family view.
- **Portal:** the patient list and patient page (HL-146), and case review, where it shows under "App said" as extra
  information. Like the app's level, it stays hidden until the Cardiologist submits, so the review stays blind.
- **Price:** free on the Dashboard. The report, long-term trends and family view stay Premium.
- **The AI summary on Trends** never mentions the risk % (it bans the word "risk" and any number not in its facts).

## Limitations to state in the manuscript

- PREVENT was developed and validated on US data. It hasn't been tested on Filipino adults.
- Lab results and answers are self-reported.
- Home readings aren't 24-hour ABPM.
- The estimate without lab results is rough, especially for older people and without a BP reading.
- No expert has reviewed HeartLink's choices above.

## Sources

1. Khan SS, Matsushita K, Sang Y, et al. Development and Validation of the American Heart Association's PREVENT Equations.
   Circulation. 2024;149(6):430-449. https://doi.org/10.1161/CIRCULATIONAHA.123.067626
2. 2026 ACC/AHA Guideline on the Management of Dyslipidemia (published 13 March 2026). J Am Coll Cardiol.
   doi:10.1016/j.jacc.2025.11.016. Bands checked through the ACC press release and clinician summaries; **confirm against
   the full guideline before the manuscript.**
3. Mayer MG. preventr: An Implementation of the PREVENT and Pooled Cohort Equations (R package, CRAN).
   https://github.com/martingmayer/preventr. Its published results check the coefficients. The coefficients were read
   from a plain-text copy (github.com/InterconnectedSystems/prevent-calculator, MIT licence), because the paper's
   supplement couldn't be downloaded automatically.
4. Inker LA, Eneanya ND, Coresh J, et al. New Creatinine- and Cystatin C-Based Equations to Estimate GFR without Race.
   N Engl J Med. 2021;385:1737-1749.
5. CDC NHANES 2017-2018, including BIOPRO_J (creatinine), downloaded 2026-11-11.

## For the panel: why PREVENT, and why the habits score stayed

- **Why an ASCVD risk:** the Cardiologist advised replacing the Heart score with an ASCVD risk score, based on AHA
  standards.
- **Why PREVENT and not the 2013 Pooled Cohort Equations:** PREVENT is the AHA's current method (2023/2024). It works
  from age 30, doesn't use race (Filipinos don't fit the older equations' race groups), and the 2026 ACC/AHA cholesterol
  guideline uses it in place of the older equations, which overestimated risk.
- **Why the habits score stayed:** a 10-year risk barely moves when someone walks or eats better. The AHA's Life's
  Essential 8 (also AHA) shows that daily progress, so it stays under the risk as "Heart health habits".
- **Where the machine learning fits:** most people have no recent blood test. The model predicts their missing lab
  values from setup answers, and the official PREVENT equations do the rest. It's labelled "Estimated" until real
  results are added.

## How the estimate is checked by clinicians (HL-153)

In the web portal's **Case review**, a Cardiologist gives the Heart risk band they would give a patient, without seeing
the app's. **Model Check** then compares the two: agreement, weighted kappa, and how often the app's band is lower
(under-calling) or higher. Its **Estimated** filter shows the rounds where the risk came from this model (no lab results).
`python scripts/train_heart_risk.py --clinical-export <file>` gives the same check on the portal's export. It only
measures: the model is never retrained from reviews until the adviser and the cardiologist approve the labels. The steps
for admins and experts are in `documentation/CASE_REVIEW_GUIDE.md`.
