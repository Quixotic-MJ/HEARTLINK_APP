"""
HL-058: Model Check, which replaces Calibration History.

One row per review round that has a Cardiologist review: the Heart risk band the Cardiologist would give next to the
app's Heart risk when the round opened (HL-153). The "estimated" kind is the machine learning estimate for people without
lab results, so it's the part this check matters most for. Older reviews (a habits-style level, before HL-153) are listed
but left out of the measures: they compared a doctor's risk judgment with the habits score. The Dietitian's and PT's checks are shown inside that row, not as rows of their
own: they say whether recommendations are safe for the patient, not whether the model is accurate.

Measures use clinical reviews only (reviewers verified as clinicians at submit time); practice reviews are
summarised separately.
"""
from typing import Any, Dict, List, Optional

from app.db.repositories import get_case_review_repo
from app.services import review_rules as rules

SCORERS = ("heart_score", "baseline_model", "bp_rules", "lifestyle_points", "unknown")
KINDS = ("calculated", "estimated")
MIN_CLINICAL_REVIEWS = 30  # Proposed minimum before the measures are worth reading (pending the adviser)


def _items(section_row: Optional[Dict[str, Any]], recommended: bool) -> Dict[str, Any]:
    if section_row:
        verdicts = section_row.get("item_verdicts") or []
        return {
            "status": "done",
            "reviewer_name": section_row.get("reviewer_name"),
            "not_suitable": [v.get("item_name") for v in verdicts if v.get("verdict") == "no"],
            "with_changes": [v.get("item_name") for v in verdicts if v.get("verdict") == "changes"],
        }
    return {"status": "waiting" if recommended else "not_needed", "reviewer_name": None,
            "not_suitable": [], "with_changes": []}


def list_rows(include_archived: bool = False) -> List[Dict[str, Any]]:
    """One row per round with a Cardiologist review, newest first."""
    from app.services.review_sections import recommendations_for

    repo = get_case_review_repo()
    by_round: Dict[str, Dict[str, Dict[str, Any]]] = {}
    for section in repo.list_sections(include_archived=include_archived):
        by_round.setdefault(section.get("review_case_id"), {})[section.get("section")] = section

    statuses = ["open", "complete"] + (["archived"] if include_archived else [])
    recs_by_tier: Dict[Any, Dict[str, List]] = {}
    rows = []
    for status in statuses:
        for rc in repo.list_review_cases(status=status):
            sections = by_round.get(rc["id"], {})
            cardio = sections.get("cardiology")
            if not cardio:
                continue
            # 2026-11-12: the lists depend on the patient (diet, allergies, PAR-Q+), not only the level
            key = (rc.get("app_tier"), rc.get("patient_id"))
            if key not in recs_by_tier:
                recs_by_tier[key] = recommendations_for(rc)
            recs = recs_by_tier[key]
            rows.append({
                "round_id": rc["id"],
                "case_code": rc.get("case_code"),
                "lane": rc.get("lane"),
                "status": rc.get("status"),
                "opened_at": rc.get("created_at"),
                "reviewed_at": cardio.get("updated_at") or cardio.get("created_at"),
                "app_tier": rc.get("app_tier"),
                "app_score": rc.get("app_score"),
                "app_scorer": rc.get("app_scorer") if rc.get("app_scorer") in SCORERS else "unknown",
                "app_risk_band": rc.get("app_risk_band"),
                "app_risk_percent": rc.get("app_risk_percent"),
                "app_risk_kind": rc.get("app_risk_kind"),
                "expert_risk_band": cardio.get("expert_risk_band"),
                "expert_risk_percent": cardio.get("expert_risk_percent"),
                "risk_agreement": cardio.get("risk_agreement"),
                "risk_difference": cardio.get("risk_difference"),
                "older_review": not cardio.get("expert_risk_band"),
                "model_version": rc.get("model_version"),
                "expert_tier": cardio.get("expert_tier"),
                "expert_score": cardio.get("expert_score"),
                "tier_agreement": cardio.get("tier_agreement"),
                "score_difference": cardio.get("score_difference"),
                "confidence": cardio.get("confidence"),
                "reasons": cardio.get("reasons") or [],
                "checkup_flag": cardio.get("checkup_flag"),
                "notes": cardio.get("notes") or "",
                "is_clinical": bool(cardio.get("is_clinical")),
                "reviewer_name": cardio.get("reviewer_name"),
                "food_check": _items(sections.get("nutrition"), bool(recs.get("recipes"))),
                "exercise_check": _items(sections.get("exercise"), bool(recs.get("exercises"))),
            })
    rows.sort(key=lambda r: r["reviewed_at"] or "", reverse=True)
    return rows


def weighted_kappa(pairs: List[tuple], levels=rules.RISK_BANDS) -> Optional[float]:
    """
    Cohen's kappa with quadratic weights for the four ordered bands (app band, cardiologist band).
    A one-level miss counts much less than a three-level miss. None when it cannot be computed
    (no rows, or every rating in a single level so chance agreement is total).
    """
    k = len(levels)
    index = {t: i for i, t in enumerate(levels)}
    valid = [(index[a], index[e]) for a, e in pairs if a in index and e in index]
    n = len(valid)
    if n == 0:
        return None
    observed = [[0.0] * k for _ in range(k)]
    for a, e in valid:
        observed[a][e] += 1
    row_totals = [sum(observed[i]) for i in range(k)]
    col_totals = [sum(observed[i][j] for i in range(k)) for j in range(k)]
    weight = lambda i, j: ((i - j) ** 2) / ((k - 1) ** 2)
    disagreement_observed = sum(weight(i, j) * observed[i][j] for i in range(k) for j in range(k)) / n
    disagreement_expected = sum(weight(i, j) * row_totals[i] * col_totals[j] for i in range(k) for j in range(k)) / (n * n)
    if disagreement_expected == 0:
        return None
    return round(1 - disagreement_observed / disagreement_expected, 3)


def kappa_label(kappa: Optional[float]) -> Optional[str]:
    """Landis & Koch (1977) bands."""
    if kappa is None:
        return None
    if kappa < 0:
        return "Poor"
    for upper, label in ((0.20, "Slight"), (0.40, "Fair"), (0.60, "Moderate"), (0.80, "Substantial")):
        if kappa <= upper:
            return label
    return "Almost perfect"


def measures(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """HL-153: the app's Heart risk band vs the Cardiologist's. Older reviews and rounds without an app risk are left out."""
    bands = rules.RISK_BANDS
    comparable = [r for r in rows if r.get("app_risk_band") in bands and r.get("expert_risk_band") in bands]
    n = len(comparable)
    agree = sum(1 for r in comparable if r["risk_agreement"] == "agree")
    under = sum(1 for r in comparable if r["risk_agreement"] == "under")
    over = sum(1 for r in comparable if r["risk_agreement"] == "over")
    matrix = [[0] * len(bands) for _ in bands]
    for r in comparable:
        matrix[bands.index(r["app_risk_band"])][bands.index(r["expert_risk_band"])] += 1
    diffs = [abs(float(r["risk_difference"])) for r in comparable if r.get("risk_difference") is not None]
    kappa = weighted_kappa([(r["app_risk_band"], r["expert_risk_band"]) for r in comparable])
    pct = lambda x: round(100 * x / n, 1) if n else None
    return {
        "reviews": n,
        "enough_reviews": n >= MIN_CLINICAL_REVIEWS,
        "agreement": {"count": agree, "percent": pct(agree)},
        "weighted_kappa": kappa,
        "kappa_label": kappa_label(kappa),
        "under_calling": {"count": under, "percent": pct(under)},
        "over_calling": {"count": over, "percent": pct(over)},
        "matrix": {"levels": list(bands), "rows_app_columns_cardiologist": matrix},
        # The Cardiologist's own % vs the app's, in percentage points
        "percent_difference": {"reviews_with_percent": len(diffs),
                               "average_gap": round(sum(diffs) / len(diffs), 1) if diffs else None},
        "left_out": {
            "older_reviews": sum(1 for r in rows if r.get("older_review")),
            "no_app_risk": sum(1 for r in rows if not r.get("older_review") and r.get("app_risk_band") not in bands),
        },
    }


def model_check(kind: str = "all") -> Dict[str, Any]:
    """HL-153: `kind` narrows to calculated (with lab results) or estimated (machine learning, no labs) Heart risks."""
    rows = list_rows()
    if kind in KINDS:
        rows = [r for r in rows if r.get("app_risk_kind") == kind]
    clinical = [r for r in rows if r["is_clinical"]]
    practice = [r for r in rows if not r["is_clinical"]]
    practice_measures = measures(practice)
    return {
        "kind": kind if kind in KINDS else "all",
        "min_clinical_reviews": MIN_CLINICAL_REVIEWS,
        "clinical": measures(clinical),
        "practice": {"reviews": practice_measures["reviews"], "agreement": practice_measures["agreement"]},
        "rows": rows,
    }
