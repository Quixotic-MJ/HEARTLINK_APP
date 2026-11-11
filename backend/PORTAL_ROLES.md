# HeartLink portal: who sees what (HL-101, updated for HL-136 on 2026-11-10)

Checked against the real rules on 2026-11-10: `HeartLink-web/src/app/access.js` (pages) and
`backend/app/utils/security.py` `EXPERT_PERMISSIONS`, `patient_overview.py`, `review_sections.py` (server).
Telehealth and remote rehabilitation are future work, not Version 1.

## What each role can do

| | Administrator | Cardiologist | Dietitian | Physical Therapist |
|---|---|---|---|---|
| Dashboard, analytics (totals only), users, feedback, Premium, announcements, activity log | Yes | No | No | No |
| Own settings and password | Yes | Yes | Yes | Yes |
| Permanently delete accounts, content or announcements | No | No | No | No |
| Add and manage staff accounts | Yes | No | No | No |
| Open the patient list | No | Yes | Yes | Yes |
| Patient's BP, check-ins, sleep, scores, alerts | No | Yes | Yes | Yes |
| Patient's meals | No | Yes | Yes | No |
| Patient's exercise | No | Yes | No | Yes |
| Read care-team notes | No | Yes | Yes | Yes |
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
| Register a model or change its status | Yes | No | No | No |
| Notifications | Yes | Yes | Yes | Yes |

The pages and the server agree on the table above, with the exceptions below.

## Decisions stay with the professional

- Case reviews and care-team notes record the reviewer's name and expert type, so a clinical decision is shown as theirs.
- Recipes and exercises record who approved them and when.
- Reviews don't change the score or retrain the model. A patient's score stays the app's calculation.

## Health records (HL-107, decided 2026-11-09)

Patient health records are for the patient and the care team: the Cardiologists, Dietitians and Physical Therapists in
the portal. Admins manage accounts, content and operations but never open a patient's records, in the portal or through
the app's own routes (`has_permission` and `verify_user_access` in `security.py`). Every expert sees every patient;
HeartLink doesn't assign experts to patients. The phone app's "Care team" is only the patient's own contact list and
isn't connected to the portal. Case reviews show a case code, age and sex, never a name or date of birth.

## Mismatches found (2026-11-07) and what happened

| # | What was wrong | Now |
|---|---|---|
| 1 | Any staff account could register a model or change its status | Admins only, the safe default until the Cardiologist decides otherwise (HL-106, `test_model_registry_access.py`) |
| 2 | Every expert could open every patient, while another rule used the patient's contact list | Decided: every expert sees every patient, Admins none (HL-107, HL-136) |
| 3 | The Cardiologist and Dietitian held unused log-writing permissions | Removed (HL-107, HL-136) |
