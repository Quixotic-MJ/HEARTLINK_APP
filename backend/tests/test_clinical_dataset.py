"""HL-059: the clinical dataset export (clinical reviews only, starting-score inputs, yes/no label)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import clinical_dataset
from app.services.feature_transform import INPUTS
from app.utils.security import get_current_admin_user

SAVED_INPUTS = {"age": 50.0, "male": 1.0, "bmi": 24.0, "current_smoker": 0.0, "former_smoker": 0.0,
                "active_min_week": 150.0, "sitting_hours": 5.0, "sleep_hours": 7.0, "drinks_week": 0.0,
                "binge_days_year": 0.0}
OLD_37_INPUTS = {"RIDAGEYR": 50, "BMXBMI": 24.0}  # what rounds saved before the 10-input model
SETUP = {"sex": "female", "date_of_birth": "1970-06-01", "height_cm": 160, "weight_kg": 60,
         "onboarding": {"vigorous_activity": False, "moderate_activity": True, "moderate_days": 3,
                        "moderate_minutes": 30, "walk_bike_transport": False, "sedentary_hours": "4-6h",
                        "sleep_hours": 7, "ever_smoked": False, "ever_drank": False}}


class FakeRepo:
    def __init__(self):
        self.cases, self.sections = [], []

    def add(self, n, status="complete", tier="Moderate", clinical=True, features=None, snapshot=None,
            section_status="submitted", created_at="2026-10-01T08:00:00Z"):
        rid = f"r{len(self.cases)}"
        self.cases.append({"id": rid, "patient_id": f"patient-{rid}", "case_code": f"HL-{rid}", "lane": "sample",
                           "status": status, "app_score": 70, "app_tier": "Moderate", "app_scorer": "bp_rules",
                           "model_version": "starting-score-2", "created_at": created_at,
                           "model_features": SAVED_INPUTS if features is None else features,
                           "input_snapshot": snapshot or {}})
        self.sections.append({"review_case_id": rid, "section": "cardiology", "status": section_status,
                              "is_clinical": clinical, "expert_tier": tier, "expert_score": 60, "confidence": "high",
                              "reasons": ["bp_trend"], "checkup_flag": "within_2_weeks", "notes": "Seen at clinic",
                              "reviewer_name": "Dr. Cruz", "created_at": "2026-10-02T08:00:00Z"})
        for _ in range(n - 1):
            self.add(1, status, tier, clinical, features, snapshot, section_status, created_at)
        return self

    def list_sections(self, review_case_id=None, section=None, include_archived=False):
        return [s for s in self.sections if section in (None, s["section"])]

    def list_review_cases(self, status=None, lane=None):
        return [c for c in self.cases if status in (None, c["status"])]


@pytest.fixture
def repo(monkeypatch):
    fake = FakeRepo()
    monkeypatch.setattr(clinical_dataset, "get_case_review_repo", lambda: fake)
    monkeypatch.delenv("CLINICAL_LABEL_HIGHER_RISK_TIERS", raising=False)
    return fake


def test_only_completed_clinical_reviews_become_rows_and_the_rest_say_why(repo):
    repo.add(30, tier="Moderate").add(5, tier="Critical")
    repo.add(1, clinical=False).add(1, status="open").add(1, status="archived").add(1, section_status="archived")
    repo.add(1, features={}, snapshot={})

    export = clinical_dataset.build_export()

    assert export["counts"]["rows"] == 35
    assert export["counts"]["higher_risk"] == 5
    reasons = sorted(e["reason"] for e in export["excluded"])
    assert reasons == ["Archived", "Archived", "No setup answers saved with the round",
                       "Practice review (reviewer not a verified clinician)", "Round not complete"]


def test_rows_have_the_inputs_and_label_but_no_one_identifiable(repo):
    repo.add(30, tier="Elevated Risk")
    row = clinical_dataset.build_export()["rows"][0]
    assert list(row["inputs"]) == INPUTS and row["inputs"] == SAVED_INPUTS
    assert row["label"] == 1 and row["inputs_rebuilt"] is False
    for private in ("patient_id", "reviewer_name", "notes", "id"):
        assert private not in row


def test_rounds_from_the_old_model_have_their_inputs_rebuilt_with_age_on_the_day(repo):
    repo.add(30, features=OLD_37_INPUTS, snapshot=SETUP, created_at="2020-06-02T08:00:00Z")
    export = clinical_dataset.build_export()
    row = export["rows"][0]
    assert row["inputs_rebuilt"] is True and export["counts"]["inputs_rebuilt"] == 30
    assert row["inputs"]["age"] == 50  # born 1970-06-01, round opened 2020-06-02
    assert row["inputs"]["male"] == 0 and round(row["inputs"]["bmi"], 1) == 23.4
    assert row["inputs"]["active_min_week"] == 90


def test_fewer_than_30_clinical_reviews_is_refused(repo):
    repo.add(29).add(5, clinical=False)
    with pytest.raises(clinical_dataset.NotEnoughReviews, match="Only 29 clinical reviews"):
        clinical_dataset.build_export()


def test_the_label_rule_is_a_setting_marked_pending_the_cardiologist(repo, monkeypatch):
    repo.add(15, tier="Elevated Risk").add(15, tier="Critical")
    export = clinical_dataset.build_export()
    assert export["label"]["higher_risk_tiers"] == ["Elevated Risk", "Critical"]
    assert export["label"]["status"] == "pending cardiologist review"

    monkeypatch.setenv("CLINICAL_LABEL_HIGHER_RISK_TIERS", "Critical")
    assert clinical_dataset.build_export()["counts"]["higher_risk"] == 15

    monkeypatch.setenv("CLINICAL_LABEL_HIGHER_RISK_TIERS", "Very high")
    with pytest.raises(ValueError):
        clinical_dataset.build_export()


@pytest.fixture
def signed_in(monkeypatch):
    monkeypatch.setattr("app.utils.activity_helper.record_admin_activity", lambda **k: None)
    def as_role(role):
        app.dependency_overrides[get_current_admin_user] = lambda: {"user_id": "admin-1", "role": role}
    yield as_role
    app.dependency_overrides.pop(get_current_admin_user, None)


def test_only_admins_can_export(repo, signed_in):
    repo.add(30)
    client = TestClient(app)

    signed_in("medical_expert")
    assert client.get("/api/admin/model-check/export").status_code == 403

    signed_in("admin")
    response = client.get("/api/admin/model-check/export")
    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    assert response.json()["counts"]["rows"] == 30


def test_too_few_reviews_gives_a_clear_error(repo, signed_in):
    repo.add(3)
    signed_in("admin")
    response = TestClient(app).get("/api/admin/model-check/export")
    assert response.status_code == 409
    assert "at least 30" in response.json()["detail"]


def test_there_is_no_in_app_retraining(signed_in):
    signed_in("admin")
    client = TestClient(app)
    assert client.post("/api/admin/retrain").status_code == 404
    assert client.post("/api/admin/datasets/generate").status_code == 404
