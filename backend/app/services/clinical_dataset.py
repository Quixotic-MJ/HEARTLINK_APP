"""
HL-059: the clinical dataset export.

One row per completed review round whose Cardiologist review is clinical (by a verified clinician at submit time):
the starting score's inputs, what the app said, the Cardiologist's level and a yes/no label. Practice, archived and
incomplete reviews are left out, and the export lists why. No patient id, names or free-text notes are included.

Retraining happens outside the app: `scripts/train_starting_score.py --clinical-export <file>` reads this export.
"""
import math
import os
from typing import Any, Dict, List, Optional, Tuple

from app.db.repositories import get_case_review_repo
from app.services import review_rules as rules
from app.services.feature_transform import INPUTS, _age, transform_to_model_features
from app.services.model_check import MIN_CLINICAL_REVIEWS
from app.utils.time import parse_utc, utc_now

# Which Cardiologist levels count as "higher risk" (label 1). The starting score predicts heart disease or stroke,
# which the four levels only roughly match, so this stays a setting until the cardiologist confirms it.
DEFAULT_HIGHER_RISK_TIERS = ("Elevated Risk", "Critical")
LABEL_STATUS = "pending cardiologist review"
FORMAT_VERSION = "clinical-export-1"


class NotEnoughReviews(Exception):
    def __init__(self, count: int):
        super().__init__(f"Only {count} clinical reviews; the export needs at least {MIN_CLINICAL_REVIEWS}.")
        self.count = count


def higher_risk_tiers() -> Tuple[str, ...]:
    """CLINICAL_LABEL_HIGHER_RISK_TIERS, e.g. "Elevated Risk,Critical" (the default)."""
    raw = os.getenv("CLINICAL_LABEL_HIGHER_RISK_TIERS", "")
    tiers = tuple(t.strip() for t in raw.split(",") if t.strip()) or DEFAULT_HIGHER_RISK_TIERS
    unknown = [t for t in tiers if t not in rules.TIERS]
    if unknown:
        raise ValueError(f"CLINICAL_LABEL_HIGHER_RISK_TIERS has unknown levels: {', '.join(unknown)}")
    return tiers


def _plain(value: Any) -> Any:
    """JSON-friendly numbers; a missing value (NaN) becomes null."""
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def round_inputs(rc: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], bool]:
    """
    The starting score's inputs for a round, and whether they had to be rebuilt.
    Rounds opened before the 10-input model saved the old model's inputs, so those are rebuilt from the setup
    answers and profile saved with the round, with the age as of the day the round opened.
    """
    saved = rc.get("model_features") or {}
    if set(INPUTS) <= set(saved):
        return {k: _plain(saved[k]) for k in INPUTS}, False
    snap = rc.get("input_snapshot") or {}
    onboarding = snap.get("onboarding") or {}
    if not onboarding:
        return None, False
    profile = {k: snap.get(k) for k in ("sex", "date_of_birth", "height_cm", "weight_kg")}
    row = transform_to_model_features(onboarding, profile).iloc[0].to_dict()
    opened = parse_utc(rc.get("created_at"))
    row["age"] = _age(profile.get("date_of_birth"), on=opened.date() if opened else None)
    return {k: _plain(row[k]) for k in INPUTS}, True


def _exclusion(rc: Dict[str, Any], cardio: Dict[str, Any]) -> Optional[str]:
    if rc.get("status") == "archived" or cardio.get("status") == "archived":
        return "Archived"
    if rc.get("status") != "complete":
        return "Round not complete"
    if not cardio.get("is_clinical"):
        return "Practice review (reviewer not a verified clinician)"
    if cardio.get("expert_tier") not in rules.TIERS:
        return "No risk level given"
    return None


def build_export(model_version: Optional[str] = None) -> Dict[str, Any]:
    """Raises NotEnoughReviews below the minimum; the caller turns that into a clear error."""
    tiers = higher_risk_tiers()
    repo = get_case_review_repo()
    cardio_by_round = {
        s.get("review_case_id"): s
        for s in repo.list_sections(section="cardiology", include_archived=True)
    }

    rows: List[Dict[str, Any]] = []
    excluded: List[Dict[str, str]] = []
    for status in ("complete", "open", "archived"):
        for rc in repo.list_review_cases(status=status):
            cardio = cardio_by_round.get(rc["id"])
            if not cardio:
                continue  # no Cardiologist review yet, so not a review at all
            reason = _exclusion(rc, cardio)
            inputs, rebuilt = (None, False) if reason else round_inputs(rc)
            if not reason and inputs is None:
                reason = "No setup answers saved with the round"
            if reason:
                excluded.append({"case_code": rc.get("case_code"), "reason": reason})
                continue
            rows.append({
                "case_code": rc.get("case_code"),
                "lane": rc.get("lane"),
                "opened_at": rc.get("created_at"),
                "reviewed_at": cardio.get("updated_at") or cardio.get("created_at"),
                "inputs": inputs,
                "inputs_rebuilt": rebuilt,
                "app_score": rc.get("app_score"),
                "app_tier": rc.get("app_tier"),
                "app_scorer": rc.get("app_scorer"),
                "app_model_version": rc.get("model_version"),
                "expert_tier": cardio["expert_tier"],
                "expert_score": cardio.get("expert_score"),
                "confidence": cardio.get("confidence"),
                "reasons": cardio.get("reasons") or [],
                "checkup_flag": cardio.get("checkup_flag"),
                "label": 1 if cardio["expert_tier"] in tiers else 0,
            })

    if len(rows) < MIN_CLINICAL_REVIEWS:
        raise NotEnoughReviews(len(rows))

    rows.sort(key=lambda r: r["reviewed_at"] or "")
    return {
        "format": FORMAT_VERSION,
        "generated_at": utc_now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "model_version": model_version,
        "inputs": list(INPUTS),
        "label": {
            "rule": f"1 when the Cardiologist's level is {' or '.join(tiers)}, otherwise 0",
            "higher_risk_tiers": list(tiers),
            "status": LABEL_STATUS,
        },
        "min_clinical_reviews": MIN_CLINICAL_REVIEWS,
        "counts": {
            "rows": len(rows),
            "higher_risk": sum(r["label"] for r in rows),
            "inputs_rebuilt": sum(1 for r in rows if r["inputs_rebuilt"]),
            "excluded": len(excluded),
        },
        "rows": rows,
        "excluded": excluded,
    }
