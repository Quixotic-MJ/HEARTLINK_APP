"""The Healthy Eating Index 2015, using the National Cancer Institute's "simple" method for one person.

Standards: https://epi.grants.cancer.gov/hei/developing.html and https://epi.grants.cancer.gov/hei/hei-scoring-method.html.
Add up each person's foods across their recall days, turn the totals into amounts per 1,000 kcal, score each of the 13
parts against its standard, and add the parts up to get a total out of 100.
"""
from typing import Dict

import numpy as np
import pandas as pd

# Amount of food-group per 1,000 kcal for full points; none scores 0
ADEQUACY = {
    "total_fruits": (5, 0.8),
    "whole_fruits": (5, 0.4),
    "total_vegetables": (5, 1.1),
    "greens_and_beans": (5, 0.2),
    "whole_grains": (10, 1.5),
    "dairy": (10, 1.3),
    "total_protein": (5, 2.5),
    "seafood_plant_protein": (5, 0.8),
}
# (points, full points at or below, 0 points at or above)
MODERATION = {
    "refined_grains": (10, 1.8, 4.3),   # oz. eq. per 1,000 kcal
    "sodium": (10, 1.1, 2.0),           # g per 1,000 kcal
    "added_sugars": (10, 6.5, 26.0),    # % of energy
    "saturated_fat": (10, 8.0, 16.0),   # % of energy
}
FATTY_ACIDS_POINTS, FATTY_ACIDS_MIN, FATTY_ACIDS_MAX = 10, 1.2, 2.5
KCAL_PER_TSP_ADDED_SUGAR = 16
KCAL_PER_G_SATURATED_FAT = 9

# FPED columns behind each part. Legumes count in four parts, as HEI-2015 sets out.
FPED_PARTS: Dict[str, list] = {
    "total_fruits": ["F_TOTAL"],
    "whole_fruits": ["F_CITMLB", "F_OTHER"],
    "total_vegetables": ["V_TOTAL", "V_LEGUMES"],
    "greens_and_beans": ["V_DRKGR", "V_LEGUMES"],
    "whole_grains": ["G_WHOLE"],
    "dairy": ["D_TOTAL"],
    "total_protein": ["PF_MPS_TOTAL", "PF_EGGS", "PF_NUTSDS", "PF_SOY", "PF_LEGUMES"],
    "seafood_plant_protein": ["PF_SEAFD_HI", "PF_SEAFD_LOW", "PF_NUTSDS", "PF_SOY", "PF_LEGUMES"],
    "refined_grains": ["G_REFINED"],
    "added_sugars_tsp": ["ADD_SUGARS"],
}
FPED_COLUMNS = sorted({c for cols in FPED_PARTS.values() for c in cols})


def _adequacy(density: pd.Series, points: float, full_at: float) -> pd.Series:
    return (density / full_at).clip(0, 1) * points


def _moderation(value: pd.Series, points: float, full_at: float, zero_at: float) -> pd.Series:
    return ((zero_at - value) / (zero_at - full_at)).clip(0, 1) * points


def score(t: pd.DataFrame) -> pd.DataFrame:
    """One row per person. `t` has the FPED_PARTS names (added sugars in tsp) plus kcal, sodium_mg, saturated_fat_g,
    mono_fat_g and poly_fat_g, added up across their days. People with no energy get no score."""
    kcal = t["kcal"].where(t["kcal"] > 0)
    out = pd.DataFrame(index=t.index)
    for name, (points, full_at) in ADEQUACY.items():
        out[name] = _adequacy(t[name] / kcal * 1000, points, full_at)

    out["refined_grains"] = _moderation(t["refined_grains"] / kcal * 1000, *MODERATION["refined_grains"])
    out["sodium"] = _moderation(t["sodium_mg"] / 1000 / kcal * 1000, *MODERATION["sodium"])
    out["added_sugars"] = _moderation(t["added_sugars_tsp"] * KCAL_PER_TSP_ADDED_SUGAR / kcal * 100, *MODERATION["added_sugars"])
    out["saturated_fat"] = _moderation(t["saturated_fat_g"] * KCAL_PER_G_SATURATED_FAT / kcal * 100, *MODERATION["saturated_fat"])

    # No saturated fat at all: full points if there are other fats, none if there's no fat at all
    good = t["mono_fat_g"] + t["poly_fat_g"]
    ratio = (good / t["saturated_fat_g"].where(t["saturated_fat_g"] > 0)).fillna(np.inf).where(good > 0, 0.0)
    out["fatty_acids"] = ((ratio - FATTY_ACIDS_MIN) / (FATTY_ACIDS_MAX - FATTY_ACIDS_MIN)).clip(0, 1) * FATTY_ACIDS_POINTS
    out = out.where(kcal.notna())
    out["total"] = out.sum(axis=1, min_count=len(out.columns))
    return out


def totals_from_foods(foods: pd.DataFrame, fped: pd.DataFrame) -> pd.DataFrame:
    """Food groups per person. `foods`: SEQN, food_code and grams, one row per food eaten. `fped`: food groups per 100 g."""
    joined = foods.merge(fped[["food_code"] + FPED_COLUMNS], on="food_code", how="left")
    amounts = joined[FPED_COLUMNS].multiply(joined["grams"] / 100, axis=0)
    amounts["SEQN"] = joined["SEQN"].values
    by_person = amounts.groupby("SEQN").sum(min_count=1)
    return pd.DataFrame({name: by_person[cols].sum(axis=1) for name, cols in FPED_PARTS.items()})
