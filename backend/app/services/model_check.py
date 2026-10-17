"""
HL-058: Model Check, which replaces Calibration History.

One row per review round that has a Cardiologist review: the Cardiologist's risk level next to what the app
said when the round opened. The Dietitian's and PT's checks are shown inside that row, not as rows of their
own: they say whether recommendations are safe for the patient, not whether the model is accurate.

Measures use clinical reviews only (reviewers verified as clinicians at submit time); practice reviews are
summarised separately.
"""
from typing import Any, Dict, List, Optional

from app.db.repositories import get_case_review_repo
from app.services import review_rules as rules

SCORERS = ("baseline_model", "bp_rules", "lifestyle_points", "unknown")
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
            tier = rc.get("app_tier")
            if tier not in recs_by_tier:
                recs_by_tier[tier] = recommendations_for(rc)
            recs = recs_by_tier[tier]
            rows.append({
                "round_id": rc["id"],
                "case_code": rc.get("case_code"),
                "lane": rc.get("lane"),
                "status": rc.get("status"),
                "opened_at": rc.get("created_at"),
                "reviewed_at": cardio.get("updated_at") or cardio.get("created_at"),
                "app_tier": tier,
                "app_score": rc.get("app_score"),
                "app_scorer": rc.get("app_scorer") if rc.get("app_scorer") in SCORERS else "unknown",
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


def weighted_kappa(pairs: List[tuple]) -> Optional[float]:
    """
    Cohen's kappa with quadratic weights for the four ordered levels (app level, cardiologist level).
    A one-level miss counts much less than a three-level miss. None when it cannot be computed
    (no rows, or every rating in a single level so chance agreement is total).
    """
    k = len(rules.TIERS)
    index = {t: i for i, t in enumerate(rules.TIERS)}
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
    comparable = [r for r in rows if r["app_tier"] in rules.TIERS and r["expert_tier"] in rules.TIERS]
    n = len(comparable)
    agree = sum(1 for r in comparable if r["tier_agreement"] == "agree")
    under = sum(1 for r in comparable if r["tier_agreement"] == "under")
    over = sum(1 for r in comparable if r["tier_agreement"] == "over")
    matrix = [[0] * len(rules.TIERS) for _ in rules.TIERS]
    for r in comparable:
        matrix[rules.TIERS.index(r["app_tier"])][rules.TIERS.index(r["expert_tier"])] += 1
    diffs = [abs(r["score_difference"]) for r in comparable if r["score_difference"] is not None]
    kappa = weighted_kappa([(r["app_tier"], r["expert_tier"]) for r in comparable])
    pct = lambda x: round(100 * x / n, 1) if n else None
    return {
        "reviews": n,
        "enough_reviews": n >= MIN_CLINICAL_REVIEWS,
        "agreement": {"count": agree, "percent": pct(agree)},
        "weighted_kappa": kappa,
        "kappa_label": kappa_label(kappa),
        "under_calling": {"count": under, "percent": pct(under)},
        "over_calling": {"count": over, "percent": pct(over)},
        "matrix": {"levels": list(rules.TIERS), "rows_app_columns_cardiologist": matrix},
        "score_difference": {"reviews_with_score": len(diffs),
                             "average_gap": round(sum(diffs) / len(diffs), 1) if diffs else None},
    }


def model_check(scorer: str = "all") -> Dict[str, Any]:
    rows = list_rows()
    if scorer in SCORERS:
        rows = [r for r in rows if r["app_scorer"] == scorer]
    clinical = [r for r in rows if r["is_clinical"]]
    practice = [r for r in rows if not r["is_clinical"]]
    practice_measures = measures(practice)
    return {
        "scorer": scorer if scorer in SCORERS else "all",
        "min_clinical_reviews": MIN_CLINICAL_REVIEWS,
        "clinical": measures(clinical),
        "practice": {"reviews": practice_measures["reviews"], "agreement": practice_measures["agreement"]},
        "rows": rows,
    }
