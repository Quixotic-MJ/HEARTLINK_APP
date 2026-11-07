# HeartLink portal: who sees what (HL-101)

Checked against the real rules on 2026-11-07: `HeartLink-web/src/app/access.js` (pages) and
`backend/app/utils/security.py` `EXPERT_PERMISSIONS`, `patient_overview.py`, `review_sections.py` (server).
Telehealth and remote rehabilitation are future work, not Version 1.

## What each role can do

| | Administrator | Cardiologist | Dietitian | Physical Therapist |
|---|---|---|---|---|
| Dashboard, analytics, users, feedback, Premium, announcements, settings, activity log | Yes | No | No | No |
| Add and manage staff accounts | Yes | No | No | No |
| Open the patient list | Yes | Yes | Yes | Yes |
| Patient's BP, check-ins, sleep, scores, alerts | Yes | Yes | Yes | Yes |
| Patient's meals | Yes | Yes | Yes | No |
| Patient's exercise | Yes | Yes | No | Yes |
| Read care-team notes | Yes | Yes | Yes | Yes |
| Post guidance to a patient's care team | No | Yes | No | No |
| Post a care-team message | No | No | Yes | Yes |
| Edit recipes | Yes | No | Yes | No |
| Approve recipes | No | No | Yes | No |
| Edit exercises | Yes | No | No | Yes |
| Approve exercises | No | No | No | Yes |
| Case reviews: open the list | Yes | Yes | Yes | Yes |
| Case reviews: give a risk level | No | Yes | No | No |
| Case reviews: check suggested food | No | No | Yes | No |
| Case reviews: check suggested exercise | No | No | No | Yes |
| Model check page | Yes | Yes | Yes | Yes |
| Notifications | Yes | Yes | Yes | Yes |

The pages and the server agree on the table above, with the exceptions below.

## Decisions stay with the professional

- Case reviews and care-team notes record the reviewer's name and expert type, so a clinical decision is shown as theirs.
- Recipes and exercises record who approved them and when.
- Reviews don't change the score or retrain the model. A patient's score stays the app's calculation.

## Mismatches found

| # | What's wrong | Risk | Ticket |
|---|---|---|---|
| 1 | Any staff account, including a Dietitian or Physical Therapist, can call the server to register a model or change its status to "approved" or "deployed". These two routes check only for staff | A status could be changed by the wrong person. The live score doesn't read this status, as far as checked | HL-106 |
| 2 | Every expert can open **every** patient's records from the patient list. Another server rule limits experts to patients on their care team, so the two rules differ | Privacy: should a Dietitian see all patients, or only their own? | HL-107 |
| 3 | The Cardiologist and Dietitian hold "write" permissions for patient logs (`vitals:write`, `meal_logs:write`), and no portal page uses them. The Physical Therapist has none | An expert on a patient's care team could add a log through the server directly | HL-107 |
