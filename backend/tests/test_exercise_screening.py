"""HL-122 to HL-124: the PAR-Q+ screening decides which exercises a person may do, and never the score."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.services import coach_note, exercise_screening as es
from app.services.dashboard import emergency_reading_pause, exercise_suits, latest_severe_symptom_at
from app.services.review_rules import FAINTED_SYMPTOM

NOW = datetime(2026, 11, 9, 2, 0, tzinfo=timezone.utc)


class FakeRepo:
    def __init__(self):
        self.rows = {}

    def get(self, user_id):
        return self.rows.get(user_id)

    def save(self, user_id, row):
        self.rows[user_id] = {"user_id": user_id, **row}


@pytest.fixture
def repo(monkeypatch):
    fake = FakeRepo()
    monkeypatch.setattr(es, "_repo", lambda: fake)
    return fake


def save(result="all_no", extra=None, pregnant=False, unwell=False, declared=True):
    return es.save_answers("u1", result, extra, pregnant, unwell, declared)


WALK = {"type": "Light Cardio", "difficulty_level": "Intermediate"}
EASY_WALK = {"type": "Light Cardio", "difficulty_level": "Beginner"}
NO_LEVEL = {"type": "Stationary", "difficulty_level": None}
BREATHE = {"type": "Breathing", "difficulty_level": None}


# ── The result from the answers ──────────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("result,extra,pregnant,unwell,state", [
    ("all_no", None, False, False, "eligible"),
    ("cleared_by_follow_ups", False, False, False, "caution"),
    ("cleared_by_follow_ups", True, False, False, "locked"),  # HeartLink's extra check
    ("follow_up_yes", False, False, False, "locked"),
    ("follow_up_yes", True, False, False, "locked"),
    ("all_no", None, True, False, "delayed"),
    ("all_no", None, False, True, "delayed"),
    ("follow_up_yes", True, True, False, "delayed"),  # delayed comes first: screen again when well
])
def test_each_answer_gives_the_right_result(repo, result, extra, pregnant, unwell, state):
    assert save(result, extra, pregnant, unwell)["state"] == state


def test_the_record_keeps_the_form_and_rules_versions_and_lasts_12_months(repo):
    save("cleared_by_follow_ups", False)
    row = repo.rows["u1"]
    assert row["form_version"] == es.FORM_VERSION and row["rules_version"] == es.RULES_VERSION
    assert row["parq_result"] == "cleared_by_follow_ups" and row["answers"]["extra_check_yes"] is False
    declared = datetime.fromisoformat(row["declared_at"])
    assert datetime.fromisoformat(row["expires_at"]) - declared == timedelta(days=365)


@pytest.mark.parametrize("kwargs,why", [
    ({"result": "maybe"}, "PAR-Q+"),
    ({"result": "cleared_by_follow_ups", "extra": None}, "every question"),
    ({"declared": False}, "declaration"),
])
def test_incomplete_answers_are_refused(repo, kwargs, why):
    with pytest.raises(HTTPException) as e:
        save(**kwargs)
    assert e.value.status_code == 422 and why in e.value.detail


# ── What each result allows ──────────────────────────────────────────────────────────────────────────────────────


def test_eligible_allows_every_approved_exercise(repo):
    status = save()
    assert all(es.allows(status, e) for e in (WALK, EASY_WALK, NO_LEVEL, BREATHE))
    assert status["paused"] is False and status["beginner_only"] is False


def test_caution_allows_beginner_exercises_and_breathing_only(repo):
    status = save("cleared_by_follow_ups", False)
    assert status["beginner_only"] is True
    assert es.allows(status, EASY_WALK) and es.allows(status, BREATHE)
    assert not es.allows(status, WALK) and not es.allows(status, NO_LEVEL)  # no level yet: not shown


@pytest.mark.parametrize("kwargs", [{"result": "follow_up_yes", "extra": False}, {"pregnant": True}])
def test_locked_and_delayed_allow_breathing_only(repo, kwargs):
    status = save(**kwargs)
    assert status["paused"] is True
    assert es.allows(status, BREATHE) and not any(es.allows(status, e) for e in (WALK, EASY_WALK, NO_LEVEL))


def test_a_professionals_ok_moves_locked_to_beginner_exercises(repo):
    save("follow_up_yes", False)
    cleared = es.clear("u1")
    assert cleared["state"] == "caution" and cleared["cleared"] is True and cleared["paused"] is False
    assert es.allows(cleared, EASY_WALK) and not es.allows(cleared, WALK)
    assert es.status_for("u1")["state"] == "caution"


def test_new_answers_need_their_own_clearance(repo):
    save("follow_up_yes", False)
    es.clear("u1")
    assert save("follow_up_yes", True)["state"] == "locked"


def test_clearing_needs_answers_first(repo):
    with pytest.raises(HTTPException):
        es.clear("u1")


# ── When it has to be done again ─────────────────────────────────────────────────────────────────────────────────


def test_not_done_yet_needs_the_screening(repo):
    status = es.status_for("u1")
    assert status["state"] == "needed" and status["reason"] == "not_done" and status["answered"] is False
    assert es.allows(status, BREATHE) and not es.allows(status, EASY_WALK)


def test_the_old_5_question_check_needs_the_new_screening(repo):
    repo.rows["u1"] = {"answers": {"chest_pain": False}, "needs_assessment": False, "answered_at": NOW.isoformat()}
    assert es.status_for("u1")["reason"] == "old_check"


def test_older_app_builds_can_still_save_the_old_check(repo):
    status = es.save_old_answers("u1", {"a": False, "b": False, "c": True, "d": False, "e": False})
    assert status["answered"] is True and status["paused"] is True and status["state"] == "needed"
    with pytest.raises(HTTPException):
        es.save_old_answers("u1", {"a": False})


def test_it_expires_after_12_months():
    row = {"state": "eligible", "declared_at": NOW.isoformat(), "expires_at": (NOW + timedelta(days=365)).isoformat()}
    assert es.status_of(row, now=NOW + timedelta(days=364))["state"] == "eligible"
    expired = es.status_of(row, now=NOW + timedelta(days=365))
    assert expired["state"] == "needed" and expired["reason"] == "expired"


def test_a_severe_symptom_after_screening_needs_it_again():
    row = {"state": "eligible", "declared_at": NOW.isoformat(), "expires_at": (NOW + timedelta(days=365)).isoformat()}
    assert es.status_of(row, NOW - timedelta(days=1), now=NOW)["state"] == "eligible"  # before the screening: fine
    later = es.status_of(row, NOW + timedelta(hours=1), now=NOW + timedelta(hours=2))
    assert later["state"] == "needed" and later["reason"] == "symptom_since"


def test_a_read_failure_never_breaks_the_dashboard(monkeypatch):
    def boom():
        raise RuntimeError("table missing")

    monkeypatch.setattr(es, "_repo", boom)
    assert es.status_for("u1")["state"] == "needed"


# ── The dashboard's rules ────────────────────────────────────────────────────────────────────────────────────────


def test_only_breathing_is_suggested_during_a_rest_or_pause(repo):
    eligible = save()
    assert exercise_suits(BREATHE, eligible, True) is True
    assert exercise_suits(EASY_WALK, eligible, True) is False
    assert exercise_suits(WALK, eligible, False) is True


def test_the_score_level_no_longer_decides_exercises(repo):
    eligible = save()
    gentle_tag = {"type": "Light Cardio", "difficulty_level": "Intermediate", "hss_tier": "Critical"}
    active_tag = {"type": "Light Cardio", "difficulty_level": "Intermediate", "hss_tier": "Stable"}
    assert exercise_suits(gentle_tag, eligible, False) and exercise_suits(active_tag, eligible, False)


def reading(sys_bp, dia_bp, hours_ago=0, **extra):
    return {"systolic_bp": sys_bp, "diastolic_bp": dia_bp, "logged_at": (NOW - timedelta(hours=hours_ago)).isoformat(), **extra}


@pytest.mark.parametrize("bad", [(180, 100), (150, 120), (89, 70), (110, 59)])
def test_an_emergency_reading_pauses_until_a_later_normal_one(bad):
    assert emergency_reading_pause([reading(*bad)]) is True
    assert emergency_reading_pause([reading(*bad), reading(118, 76, hours_ago=48)]) is True
    assert emergency_reading_pause([reading(118, 76), reading(*bad, hours_ago=1)]) is False


def test_the_pause_ignores_symptom_only_logs_and_deleted_readings():
    symptom_only = {"symptoms": ["Headache"], "logged_at": NOW.isoformat()}
    assert emergency_reading_pause([symptom_only, reading(185, 95, hours_ago=1)]) is True
    assert emergency_reading_pause([reading(185, 95, deleted_at=NOW.isoformat()), reading(118, 76, hours_ago=1)]) is False
    assert emergency_reading_pause([reading(179, 119), reading(90, 60, hours_ago=1)]) is False
    assert emergency_reading_pause([]) is False


def test_the_newest_severe_symptom_is_found():
    logs = [
        {"symptoms": ["Headache"], "logged_at": NOW.isoformat()},
        {"symptoms": [FAINTED_SYMPTOM], "logged_at": (NOW - timedelta(days=2)).isoformat()},
        {"symptoms": ["Chest Discomfort / Tightness"], "severity_map": {"Chest Discomfort / Tightness": 8}, "logged_at": (NOW - timedelta(days=5)).isoformat()},
    ]
    assert latest_severe_symptom_at(logs) == NOW - timedelta(days=2)
    assert latest_severe_symptom_at([{"symptoms": ["Chest Discomfort / Tightness"], "severity_map": {"Chest Discomfort / Tightness": 6}}]) is None


def test_todays_note_doesnt_suggest_a_walk_during_a_pause():
    evening = datetime(2026, 10, 30, 10, 0, tzinfo=timezone.utc)
    vitals = [{"systolic_bp": 118, "diastolic_bp": 76, "logged_at": evening.isoformat()}]
    meals = [{"meal_name": "Rice", "sodium_mg": 10, "logged_at": evening.isoformat()}]

    def note(paused):
        f = coach_note.day_facts(
            meal_logs=meals, exercise_logs=[], vitals_logs=vitals, sleep_hours=7, sodium_limit=2000, movement_goal=30,
            exercise_paused=paused, now=evening,
        )
        return coach_note.improve_note("Holding.", "Steady.", "check-circle", None, "", 0, 82, f)

    assert note(False)[3] == "start_walk"
    assert note(True)[3] != "start_walk"


def test_screening_answers_never_change_the_score(repo):
    """The two parts of setup stay apart: the score code doesn't read the screening at all."""
    import inspect
    from app.services import heart_score, starting_score
    for module in (heart_score, starting_score):
        assert "exercise_screening" not in inspect.getsource(module)


# ── 2026-11-12: the whole PAR-Q+ answered in the app ──────────────────────────────────────────────────────────────


def form(page1_yes=(), present=(), follow_up_yes=()):
    """A filled-in form: page 1 YES for the given questions; the given sections present, with the given follow-ups YES
    (as "3b")."""
    page1 = {q: q in page1_yes for q in es.PAGE_ONE}
    sections = {}
    for n, letters in es.SECTIONS.items():
        on = n in present
        sections[n] = {"present": on, "answers": {l: f"{n}{l}" in follow_up_yes for l in letters} if on else None}
    return {"page1": page1, "sections": sections}


def test_all_no_on_page_one_is_eligible_and_needs_no_follow_ups(repo):
    f = {"page1": {q: False for q in es.PAGE_ONE}}
    status = es.save_form("u1", f, False, False, True)
    assert status["state"] == "eligible"
    saved = repo.rows["u1"]
    assert saved["parq_result"] == "all_no" and saved["answers"]["entered_in_app"] is True
    assert saved["answers"]["form"]["page1"] == f["page1"]


def test_a_page_one_yes_cleared_by_the_follow_ups_is_beginner(repo):
    # Q1 YES (high blood pressure), section 4 present, both follow-ups NO
    status = es.save_form("u1", form(page1_yes=("q1",), present=("4",)), False, False, True)
    assert status["state"] == "caution"
    assert repo.rows["u1"]["parq_result"] == "cleared_by_follow_ups"


def test_a_follow_up_yes_locks_active_workouts(repo):
    status = es.save_form("u1", form(page1_yes=("q1",), present=("3",), follow_up_yes=("3b",)), False, False, True)
    assert status["state"] == "locked"
    assert repo.rows["u1"]["parq_result"] == "follow_up_yes"


@pytest.mark.parametrize("question", ["q2", "q3", "q7"])
def test_chest_pain_dizziness_or_supervised_only_is_heartlinks_extra_check(repo, question):
    # Cleared by the follow-ups, but page 1 said chest pain, dizziness or supervised activity only
    status = es.save_form("u1", form(page1_yes=(question,), present=("10",)), False, False, True)
    assert status["state"] == "locked"
    assert repo.rows["u1"]["answers"]["extra_check_yes"] is True


def test_pregnant_or_ill_still_delays(repo):
    assert es.save_form("u1", form(), True, False, True)["state"] == "delayed"


@pytest.mark.parametrize("bad, why", [
    ({"page1": {"q1": False}}, "page 1"),
    (form(page1_yes=("q4",)) | {"sections": {}}, "pages 2 and 3"),
    ({"page1": {q: q == "q5" for q in es.PAGE_ONE}, "sections": {**form()["sections"], "5": {"present": True, "answers": {"a": False}}}}, "follow-up"),
])
def test_an_incomplete_form_is_refused(repo, bad, why):
    with pytest.raises(HTTPException) as exc:
        es.save_form("u1", bad, False, False, True)
    assert exc.value.status_code == 422 and why in exc.value.detail
    assert "u1" not in repo.rows


def test_the_form_needs_the_declaration(repo):
    with pytest.raises(HTTPException):
        es.save_form("u1", form(), False, False, False)


def test_the_condition_lists_are_kept_short_and_unknown_fields_dropped(repo):
    f = form(page1_yes=("q4",), present=("10",))
    f["notes"] = {"p1.q4_list": "  Asthma  ", "conditions_list": "x" * 400, "something_else": "dropped"}
    es.save_form("u1", f, False, False, True)
    notes = repo.rows["u1"]["answers"]["form"]["notes"]
    assert notes == {"p1.q4_list": "Asthma", "conditions_list": "x" * 300}
