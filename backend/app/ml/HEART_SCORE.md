# Heart score: the method and the evidence for every part (HL-111, HL-118)

> **Status: not yet reviewed by any expert.** The review pack is
> [HeartLink Heart Score: Expert Review Pack](https://claude.ai/artifact/5qTcaMpKMPo1VjYZo42e8v). Don't describe the
> score as reviewed until a form is signed, and then only for the areas that reviewer covered.
>
> The score is **based on** the American Heart Association's Life's Essential 8 (LE8). It isn't the official LE8 score,
> it hasn't been validated, and it's a wellness indicator: not a diagnosis, a treatment or a risk prediction.

The code is `app/services/heart_score.py`. Tests are `tests/test_heart_score.py` and `tests/test_score_notes.py`.

Each part has one of these labels:

- **AHA:** the points come directly from the LE8 paper [1].
- **Adapted:** the AHA's points, with HeartLink's choice of data or a change listed here.
- **HeartLink:** HeartLink's own rule. It needs expert review.

## How it works

**Before the first log,** the score comes from a machine learning model: a linear regression trained on NHANES 2017-2018 to
estimate a person's LE8 score from setup answers (`STARTING_SCORE.md`, `starting_score.py`). The app calls it a starting estimate.
The limit of 79 with no reading and the floor of 50 apply to it too.

**From the first log onward:**

1. Each area with data gets 0 to 100 points.
2. The score is the unweighted average of those areas, rounded with halves going up.
3. HeartLink's blood pressure rules then set limits on it.
4. The app shows the score as one of four levels: On track (80+), Room to improve (60-79), Needs attention (50-59),
   Get checked (under 50). The bands are HeartLink's own and predate this method.

The score is recalculated after every reading, meal, workout and sleep log, including deleted logs, and after the
setup, Settings and height or weight answers change. On a day with nothing logged, it's checked once when the Dashboard
opens, because old logs drop out of the last 7 days.

## Points for each area

| Area | Data | Points | Label |
|---|---|---|---|
| Blood pressure | Average of the last 7 days' readings. If there are none, the latest reading from the last 30 days | Under 120 and under 80: 100. 120-129 and under 80: 75. 130-139 or 80-89: 50. 140-159 or 90-99: 25. 160+ or 100+: 0 | Adapted: the AHA's table, HeartLink's choice of data, no deduction for medicine |
| Activity | Minutes in the last 7 days | 150+: 100. 120-149: 90. 90-119: 80. 60-89: 60. 30-59: 40. 1-29: 20. None: 0 | Adapted: see "Which minutes count" |
| Sleep | Average of the nights logged in the last 7 days. Logs on one day add up | 7 to under 9: 100. 9 to under 10: 90. 6 to under 7: 70. 5 to under 6, or 10+: 40. 4 to under 5: 20. Under 4: 0 | AHA |
| Nicotine | Setup answers, editable in Settings | Never: 100. Quit 5+ years ago: 75. 1 to under 5 years: 50. Under 1 year: 25. Current use: 0 | Adapted: see below |
| Body weight | BMI from profile height and weight | 18.5-22.9: 100. 23-24.9: 75. 25-29.9: 50. 30-34.9: 25. 35+: 0 | AHA, Asian and Pacific row |
| Diet | Three habits, see below | 100, 80, 50, 25, 0 | HeartLink: the AHA's levels, our questions |
| Blood sugar | Not scored | Needs fasting glucose or HbA1c | Left out for now |
| Cholesterol | Not scored | Needs non-HDL cholesterol | Left out for now |

### Which minutes count (HeartLink)

The AHA counts moderate or harder activity, with vigorous minutes double.

| Exercise | Minutes count as |
|---|---|
| Library intensity High | Double |
| Library intensity Moderate | In full |
| Library intensity Low, or a quick log with no known intensity | Half, or in full if the effort rating is 5 or more |
| Library intensity None, such as breathing exercises | Not counted |

Abandoned workouts don't count. Exercise logs don't store intensity, so it comes from the exercise library.

### Nicotine details (HeartLink's choices)

- The AHA gives 25 points for inhaled nicotine devices. Setup asks about cigarettes, vapes and other tobacco together,
  so any current use gets 0.
- Someone who quit without saying when counts as under 1 year (25 points) until they answer in Settings.
- The quit answer doesn't age by itself. Someone who answers "under 1 year" stays there until they change it.

### Adapted diet score (HeartLink)

Three habits, each scored 0 to 2. This isn't the AHA's MEPA questionnaire.

| Habit | 2 | 1 | 0 |
|---|---|---|---|
| Fruit and vegetables a day (setup) | 4 or more | 2-3 | 0-1 |
| Fried or fatty food (setup) | Rarely | Sometimes | Often or daily |
| Sodium | No days over the limit | 1-2 days | 3 or more days |

Sodium uses the last 7 days against the patient's own limit, once 3 days have meals. Before that it uses the setup
answer on salty food: rarely 2, sometimes 1, often or daily 0.

The total maps to: 6 is 100, 5 is 80, 3-4 is 50, 1-2 is 25, 0 is 0.

### Setup answers in the first week (HeartLink)

For the first 7 days after setup:

- Activity uses the higher of the setup answer and the logged minutes, so a short first walk can't lower the score.
- Sleep uses the setup answer until a night is logged.

After that, logs alone count. No logged activity is 0 points, and no logged sleep means the area has no data.

## HeartLink's rules

| Rule | Why |
|---|---|
| Average at stage 1 (130-139 or 80-89): the score can't go above 79. Stage 2 or higher (140+ or 90+): it can't go above 59 | Good habits can't hide high blood pressure. Without this, 150/95 with excellent habits scores 88 |
| Latest reading at an emergency level (180+ or 120+, under 90 or under 60): the score stays at 49 or lower until a later non-emergency reading | Keeps the safety behaviour |
| Otherwise the score can't go below 50 | "Get checked" pauses active workouts. This stops poor habits alone from locking someone out of exercise |
| No reading in 30 days: the score can't go above 79 | Blood pressure is the app's main purpose |
| Average only the areas with data, and show how many | The LE8 paper doesn't say how to handle missing areas |
| No deduction for blood pressure medicine, though the AHA takes off 20 | The app doesn't record this reliably, and it would mark down people whose blood pressure is well controlled |
| Under BMI 18.5 isn't scored | The AHA's row starts at 18.5, so this needs a reviewer's decision |
| Symptoms don't change the score, including emergency-level ones | See "Outside the score" |

## Outside the score, and unchanged

These run on their own and don't depend on the score:

- The emergency thresholds and flow: 180/120, 90/60, chest discomfort 7 or more, shortness of breath at rest, fainting.
- The 24-hour workout rest after a severe symptom, and the exercise safety check.
- Symptom alerts and case review.

**Question for the reviewer:** someone who logs an emergency-level symptom sees emergency steps and a workout pause, but
their score doesn't drop. Is that acceptable? The review pack asks this in Question 9.

## What the old score did

The old score started from a logistic regression on existing heart disease or stroke, turned into a score with our own
formula. It then moved a base score with reading bands and added up to 20 daily lifestyle points, and almost all of those points
were HeartLink's own choice. Older history records still hold those
details, and the portal labels them under their old names.

## Limitations to state in the manuscript

- It's an adapted method, not the official LE8 score.
- The score can jump at the first log, when the model's estimate gives way to the areas.
- It usually uses 6 of 8 areas, and new users have setup answers only.
- The data is self-reported.
- It hasn't been validated, so nothing can be claimed about predicting outcomes.

## Sources

1. Lloyd-Jones DM, et al. Life's Essential 8: Updating and Enhancing the American Heart Association's Construct of
   Cardiovascular Health. Circulation, 2022. [Full paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC10503546/).
2. Daily limits and their sources: `backend/HEALTH_TARGETS.md`. Food rules: `backend/FOOD_RULES.md`.
