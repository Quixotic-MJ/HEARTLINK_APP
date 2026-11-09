# HeartLink exercise rules: FITT and progression (HL-099)

> **Status: a draft proposal for Sir Eugene's approval (OT-14).** These rules aren't in the app yet. HeartLink has no
> levels or progression today. The levels, effort ranges and step-up rule below are HeartLink's starting suggestion, not
> published prescriptions. Sir Eugene's changes become tickets.

FITT means Frequency, Intensity, Time and Type.

## What the guidelines say

| Guidance | Summary |
|---|---|
| WHO 2020, adults | 150-300 min of moderate or 75-150 min of vigorous activity a week, and muscle strengthening on 2 or more days [1][2] |
| WHO 2020, 65 and over | The same, plus varied activity for balance and strength on 3 or more days, to help prevent falls [2] |
| WHO effort scale | Moderate is about 5 or 6 out of 10 on a person's own scale [3] |
| ACSM, high blood pressure | Moderate aerobic exercise most days (5-7), 30-60 min, can be built from bouts of at least 10 min; resistance work 2-3 days; flexibility 2-3 days [4] |
| ACSM, progression | Progress gradually, avoid large increases in any FITT part, and adjust to tolerance and preference [4] |

*An AHA source for the activity targets wasn't retrieved; please add one if it's needed for the manuscript.*

## Proposed rules for each level

| | Beginner | Intermediate | Advanced |
|---|---|---|---|
| **Frequency** | 3-5 days a week | 5 days a week | 5 or more days a week |
| **Intensity** | Effort 3-4 of 10; talking is easy | Effort 5-6 of 10; can talk, can't sing | Mostly 5-6; 7-8 only with the therapist's OK |
| **Time** | 5-15 min bouts, up to 15-20 min a day | 20-30 min a day | 30-60 min a day |
| **Type: aerobic** | Marching in place, easy walking | Walking, side steps | Brisk walking, longer sets |
| **Type: strength, 2 days** | Sit-to-stand with a chair, wall push-ups | Sit-to-stand, chair push-ups, supported squats | Squat variations, slower tempo |
| **Type: balance and mobility** | Supported balance, gentle stretching | Balance, mobility, stretching | Balance challenges, mobility, stretching |

Chair dips and big position changes stay out until Sir Eugene reviews them (HL-104).

## Moving up a level

The app would **suggest** a step up, and the patient chooses. It's never automatic.

A suggestion appears only when all of these are true for the last 2 weeks:

- At least 3 sessions a week were completed.
- Average effort was within the level's range or lower.
- No session was stopped for feeling unwell.
- No exercise pause applies: the safety check, a recent severe symptom, or a score under 50.

Change one part of FITT at a time, usually Time first, then Frequency, then Intensity.

**Stepping down:** after a session stopped for feeling unwell, or after a break of 2 weeks or more, the app suggests the
previous level.

**A pause always wins.** The safety check pause (HL-093) and the emergency rules aren't affected by level or progress,
and the only way out of a safety check pause is the existing clearing step.

## The 30-minute daily goal

| Question | Finding |
|---|---|
| Does it fit the guidance? | 30 min on 5 days is 150 min, the lower end of the WHO range. Every day is 210 min, inside the range |
| The problem | The guidance is **weekly**, but the app shows a **daily** goal, so a planned rest day looks like a miss |
| For beginners | 30 min may be too much at first. WHO supports starting small and building up [1] |

**Proposal:** keep 30 min as the default for now, add a weekly view (150 min), and start Beginners at 15 min a day.

## For Sir Eugene

1. Are the three levels and their FITT values right?
2. Which exercises belong at each level (HL-104)?
3. Is the 2-week step-up rule safe and practical?
4. Should the goal be weekly, and should Beginners start at 15 minutes?
5. Is the 0-10 effort scale acceptable, or should it be replaced (OT-13)?

## Sources

1. Bull FC et al. WHO 2020 guidelines. [PMC7719906](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7719906/).
2. [WHO/Europe physical activity recommendations](https://www.euro.who.int/en/health-topics/disease-prevention/physical-activity/activities/physical-activity-recommendations).
3. [WHO guidelines at a glance](https://apps.who.int/iris/bitstream/handle/10665/337001/9789240014886-eng.pdf).
4. Pescatello LS et al. Exercise for hypertension. [PMC4589552](https://pmc.ncbi.nlm.nih.gov/articles/PMC4589552);
   [ACSM summary](https://acsm.org/exercise-hypertension). This is a 2015 review: check for newer ACSM guidance.

## Who may do which exercises (HL-122 to HL-124, built)

The PAR-Q+ screening decides this, never the Heart score. The app opens the official PAR-Q+ unchanged and the person records
its result; the code is `backend/app/services/exercise_screening.py`.

| Result | When | Exercises |
|---|---|---|
| Eligible | All NO on page 1 | Every approved exercise |
| Eligible with caution | YES on page 1, all NO in the follow-ups, and no YES to HeartLink's extra check | Beginner exercises and breathing **[Proposal]** |
| Delayed | Pregnant, or ill right now | Breathing only, until they do the check again |
| Locked | A follow-up YES, or HeartLink's extra check: chest pain, dizziness or fainting, or supervised activity only **[Proposal]** | Breathing only. "A doctor cleared me" moves them to Eligible with caution |
| Needed | Not done, the old check, over 12 months old, or a severe symptom since | Breathing only, and starting a workout opens the check |

On top of any result, active workouts pause during the 24 hours after a severe symptom, and after an emergency-level reading
until a later reading isn't one.

