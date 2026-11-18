"""HeartLink is for adults aged 18 and over (Terms of Service, 2026-11-18): the profile refuses a younger birth date."""
from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.user import UNDER_AGE_DETAIL, ProfileUpdate, age_on
from app.utils.time import to_local_date, utc_now

TODAY = to_local_date(utc_now())


def profile(dob: date) -> dict:
    return {"first_name": "Ana", "date_of_birth": dob.isoformat(), "sex": "female", "height_cm": 155, "weight_kg": 55}


def years_ago(n: int) -> date:
    try:
        return TODAY.replace(year=TODAY.year - n)
    except ValueError:  # 29 February
        return TODAY.replace(year=TODAY.year - n, day=28)


@pytest.mark.parametrize("dob", [TODAY, years_ago(10), years_ago(17)])
def test_under_18_is_refused(dob):
    with pytest.raises(ValidationError) as exc:
        ProfileUpdate(**profile(dob))
    assert UNDER_AGE_DETAIL in str(exc.value)


def test_18_today_and_adults_are_accepted():
    assert ProfileUpdate(**profile(years_ago(18))).date_of_birth == years_ago(18)
    assert ProfileUpdate(**profile(date(1985, 6, 15))).date_of_birth == date(1985, 6, 15)


def test_over_120_is_refused():
    with pytest.raises(ValidationError):
        ProfileUpdate(**profile(date(1890, 1, 1)))


def test_age_counts_the_birthday():
    assert age_on(date(2008, 11, 19), date(2026, 11, 18)) == 17
    assert age_on(date(2008, 11, 18), date(2026, 11, 18)) == 18
