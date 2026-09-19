import pytest
from datetime import datetime, timedelta
from app.services.hss_service import compute_vitals_hss, compute_lifestyle_composite_hss

def test_vitals_scoring_base():
    # Normal
    score, tier, prob = compute_vitals_hss(115, 75)
    assert score == 90
    
    # Elevated
    score, _, _ = compute_vitals_hss(125, 75)
    assert score == 78

    # Stage 1
    score, _, _ = compute_vitals_hss(135, 80)
    assert score == 68

    # Stage 2
    score, _, _ = compute_vitals_hss(145, 95)
    assert score == 52

    # Crisis
    score, _, _ = compute_vitals_hss(185, 125)
    assert score == 25

def test_vitals_scoring_heart_rate():
    # Normal HR
    score, _, _ = compute_vitals_hss(115, 75, heart_rate=80)
    assert score == 90
    
    # High HR (Tachycardia penalty)
    score, _, _ = compute_vitals_hss(115, 75, heart_rate=105)
    assert score == 86 # 90 - 4
    
    # Very High HR
    score, _, _ = compute_vitals_hss(115, 75, heart_rate=115)
    assert score == 82 # 90 - 8

    # Low HR (Bradycardia penalty)
    score, _, _ = compute_vitals_hss(115, 75, heart_rate=45)
    assert score == 82 # 90 - 8

def test_vitals_scoring_context_waive():
    # High HR post-workout should be waived
    score, _, _ = compute_vitals_hss(115, 75, heart_rate=120, context="after_exercise")
    assert score == 90 # No penalty

    # Even higher HR post-workout
    score, _, _ = compute_vitals_hss(115, 75, heart_rate=140, context="after_exercise")
    assert score == 90 # No penalty

def test_vitals_scoring_pulse_pressure():
    # Gap > 60 (Arterial Stiffness)
    score, _, _ = compute_vitals_hss(140, 70) # Gap = 70. Base for 140/70 is 52. 
    assert score == 47 # 52 - 5

    # Gap < 25 (Low Cardiac Output)
    score, _, _ = compute_vitals_hss(100, 80) # Gap = 20. Base for 100/80 is 68.
    assert score == 63 # 68 - 5

    # Combined Pulse Pressure and Heart Rate
    score, _, _ = compute_vitals_hss(100, 80, heart_rate=115) # Gap=20 (-5), HR=115 (-8). Base=68
    assert score == 55 # 68 - 5 - 8

# For lifestyle, we need to mock the database and today's activity
from unittest.mock import patch, MagicMock

@patch("app.services.dashboard._safe_date")
@patch("app.services.health_logs.get_health_logs")
@patch("app.db.repositories.get_sleep_repo")
@patch("app.db.repositories.get_exercises_repo")
@patch("app.db.repositories.get_meals_repo")
@patch("app.db.repositories.get_hss_repo")
def test_lifestyle_composite_scoring(mock_hss_repo, mock_meals_repo, mock_exercises_repo, mock_sleep_repo, mock_health_logs, mock_safe_date):
    # Setup Mocks
    mock_hss = MagicMock()
    mock_hss.list_hss_history.return_value = [{"score": 75, "computed_at": datetime.utcnow().isoformat()}]
    mock_hss.create_hss_record.side_effect = lambda uid, data: data
    mock_hss_repo.return_value = mock_hss

    mock_meals = MagicMock()
    # 2 Meals: One great, one bad
    mock_meals.list_user_meals.return_value = [
        {"logged_at": "2026-09-19T10:00:00", "sodium_mg": 100, "saturated_fat_g": 0.5, "fiber_g": 6}, # Great: sod(+2), fat(+1), fib(+2) = +5
        {"logged_at": "2026-09-19T14:00:00", "sodium_mg": 900, "saturated_fat_g": 6, "fiber_g": 1} # Bad: sod(-3), fat(-2), fib(0) = -5
    ]
    mock_meals_repo.return_value = mock_meals
    
    mock_exercises = MagicMock()
    mock_exercises.list_user_logs.return_value = [
        {"logged_at": "2026-09-19T08:00:00", "duration_minutes": 30, "intensity": "moderate", "status": "completed"} # 30 // 10 * 2 = 6 points
    ]
    mock_exercises_repo.return_value = mock_exercises

    mock_sleep = MagicMock()
    mock_sleep.list_user_logs.return_value = [
        {"logged_at": "2026-09-19T07:00:00", "duration_hours": 8} # 8 hours = 3 points
    ]
    mock_sleep_repo.return_value = mock_sleep

    # Vitlas / Health logs
    mock_health_logs.return_value = [
        {"logged_at": "2026-09-19T09:00:00", "medication_taken": True, "symptoms": [], "blood_sugar": 100, "weight_kg": 70}, # Meds(+2), Sugar Normal(+2), Symptoms(0)
        {"logged_at": "2026-09-18T09:00:00", "weight_kg": 70} # No weight gain
    ]

    mock_safe_date.return_value = datetime.utcnow().date()
    
    # Calculate Points:
    # Meals: 0 (+5, -5)
    # Exercise: +6
    # Sleep: +3
    # Meds: +2
    # Symptoms: 0
    # Sugar: +2
    # Weight: 0
    # Streak: 0 (default fallback)
    # Staleness: 0
    # Expected Points: 14 (due to 1 point from 1-day streak)
    # Expected Score: 75 + 14 = 89

    score, tier, prob, record = compute_lifestyle_composite_hss("test_user")
    
    factors = record.get("contributing_factors", {})
    assert factors.get("meal_points") == 0
    assert factors.get("exercise_points") == 6
    assert factors.get("sleep_points") == 3
    assert factors.get("medication_points") == 2
    assert factors.get("blood_sugar_points") == 2
    assert factors.get("streak_points") == 1
    assert factors.get("total_lifestyle_adjustment") == 14
    assert score == 89

@patch("app.services.dashboard._safe_date")
@patch("app.services.health_logs.get_health_logs")
@patch("app.db.repositories.get_sleep_repo")
@patch("app.db.repositories.get_exercises_repo")
@patch("app.db.repositories.get_meals_repo")
@patch("app.db.repositories.get_hss_repo")
def test_lifestyle_penalties(mock_hss_repo, mock_meals_repo, mock_exercises_repo, mock_sleep_repo, mock_health_logs, mock_safe_date):
    # Setup Mocks
    mock_hss = MagicMock()
    mock_hss.list_hss_history.return_value = [{"score": 75, "computed_at": datetime.utcnow().isoformat()}]
    mock_hss.create_hss_record.side_effect = lambda uid, data: data
    mock_hss_repo.return_value = mock_hss
    mock_meals_repo.return_value = MagicMock(list_user_meals=lambda u: [])
    mock_exercises_repo.return_value = MagicMock(list_user_logs=lambda u: [])
    mock_sleep_repo.return_value = MagicMock(list_user_logs=lambda u: [])

    # Vitlas / Health logs showing massive penalties
    mock_health_logs.return_value = [
        {"logged_at": "2026-09-19T09:00:00", "medication_taken": False, "symptoms": ["Chest Discomfort / Tightness"], "blood_sugar": 200, "weight_kg": 72}, 
        {"logged_at": "2026-09-18T09:00:00", "weight_kg": 70} # 2kg weight gain!
    ]

    # Test Date
    def mock_safe_date_impl(val):
        if "2026-09-18" in val:
            return (datetime.utcnow().date() - timedelta(days=1))
        return datetime.utcnow().date()
    
    mock_safe_date.side_effect = mock_safe_date_impl

    # Calculate Points:
    # Symptoms: -10
    # Sugar High: -3
    # Weight Gain (2kg): -15
    # Meds: 0
    # Expected Points before cap: -28
    # Cap limits to: -20
    # Expected Score: 75 - 20 = 55

    score, tier, prob, record = compute_lifestyle_composite_hss("test_user")
    
    factors = record.get("contributing_factors", {})
    assert factors.get("symptom_points") == -10
    assert factors.get("blood_sugar_points") == -3
    assert factors.get("weight_gain_points") == -15
    assert factors.get("total_lifestyle_adjustment") == -20
    assert score == 55
