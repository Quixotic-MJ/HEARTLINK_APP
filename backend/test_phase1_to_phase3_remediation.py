"""
test_phase1_to_phase3_remediation.py

Verification suite for Role 5 Remediation Roadmap (Phase 1 to Phase 3):
- HL-ENG-17: Pillar E Emergency Telephony & Facility Direct Line Fallback
- HL-ENG-18: Pillar B & A Dynamic Lifestyle Scoring Pipeline (Sodium Deductions & Exercise Boosts)
- HL-ENG-21: Pillar D Expert Recipe Database Validation & Budget-Aware Prioritization
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.hss_service import compute_lifestyle_composite_hss
from app.db.repositories.content import SupabaseContentRepository
from app.services.dashboard import get_dashboard_data


class TestRemediationPhase1To3(unittest.TestCase):
    
    def test_hl_eng_17_cebu_emergency_clinics_fallback(self):
        """Verify verified Cebu emergency facility numbers exist in fallback list."""
        mock_client = MagicMock()
        mock_client.table.side_effect = Exception("Supabase offline")
        repo = SupabaseContentRepository(mock_client)
        clinics = repo.list_clinics()
        
        self.assertGreaterEqual(len(clinics), 3)
        chong_hua = next((c for c in clinics if "Chong Hua" in c["name"]), None)
        cebu_doc = next((c for c in clinics if "Cebu Doctors" in c["name"]), None)
        perpetual = next((c for c in clinics if "Perpetual Succour" in c["name"]), None)
        
        self.assertIsNotNone(chong_hua)
        self.assertEqual(chong_hua["phone"], "+63322558000")
        self.assertIsNotNone(cebu_doc)
        self.assertEqual(cebu_doc["phone"], "+63322555555")
        self.assertIsNotNone(perpetual)
        self.assertEqual(perpetual["phone"], "+63322338620")
        print("[PASS] HL-ENG-17: Verified Cebu emergency facility direct line fallback contacts verified.")

    @patch("app.db.repositories.get_hss_repo")
    @patch("app.db.repositories.get_baseline_repo")
    @patch("app.services.dashboard._get_today_activity")
    def test_hl_eng_18_lifestyle_composite_hss_dynamic_scoring(
        self, mock_get_today, mock_get_baseline, mock_get_hss
    ):
        """Verify lifestyle composite HSS adjusts dynamically based on sodium and exercise."""
        mock_hss_repo = MagicMock()
        mock_get_hss.return_value = mock_hss_repo
        mock_base_repo = MagicMock()
        mock_get_baseline.return_value = mock_base_repo
        
        # Base HSS history: latest score = 80
        mock_hss_repo.list_hss_history.return_value = [{"score": 80, "tier": "Stable"}]
        mock_hss_repo.create_hss_record.side_effect = lambda uid, rec: rec
        mock_base_repo.get_thresholds.return_value = {"sodium_limit_mg": 2000}
        
        # Case A: Excess sodium (3000mg vs 2000mg limit = 1000mg excess -> -6 pts penalty) and 0 exercise
        mock_get_today.return_value = {
            "total_sodium_mg": 3000,
            "total_calories": 1500,
            "total_exercise_minutes": 0,
            "total_sleep_hours": 7.0,
        }
        
        score_a, tier_a, risk_a, rec_a = compute_lifestyle_composite_hss("test-patient-uuid", trigger="meal_log")
        # 80 - 6 (excess 1000 // 200 + 1 = 6) = 74
        self.assertEqual(score_a, 74)
        self.assertEqual(tier_a, "Moderate")
        self.assertEqual(rec_a["contributing_factors"]["sodium_penalty"], 6)
        
        # Case B: Compliant sodium (1200mg) and 45 minutes exercise (+5 pts bonus)
        mock_get_today.return_value = {
            "total_sodium_mg": 1200,
            "total_calories": 1400,
            "total_exercise_minutes": 45,
            "total_sleep_hours": 7.5,
        }
        
        score_b, tier_b, risk_b, rec_b = compute_lifestyle_composite_hss("test-patient-uuid", trigger="exercise_log")
        # 80 + 5 (exercise bonus) = 85
        self.assertEqual(score_b, 85)
        self.assertEqual(tier_b, "Stable")
        self.assertEqual(rec_b["contributing_factors"]["exercise_bonus"], 5)
        
        # Case C: Boundary bounds test (score capped between 1 and 100)
        mock_hss_repo.list_hss_history.return_value = [{"score": 99, "tier": "Stable"}]
        score_c, _, _, _ = compute_lifestyle_composite_hss("test-patient-uuid", trigger="exercise_log")
        self.assertLessEqual(score_c, 100)
        
        print("[PASS] HL-ENG-18: Dynamic lifestyle composite HSS (sodium penalty & exercise bonus) verified.")

    @patch("app.services.dashboard.get_profile_repo")
    @patch("app.services.dashboard.get_hss_repo")
    @patch("app.services.dashboard.get_health_logs_repo")
    @patch("app.services.dashboard.get_baseline_repo")
    @patch("app.services.dashboard.get_content_repo")
    @patch("app.services.dashboard.get_notification_repo")
    def test_hl_eng_21_budget_prioritization_and_expert_validation(
        self, mock_notif, mock_content, mock_base, mock_health, mock_hss, mock_prof
    ):
        """Verify recipes prioritize ultra-low sodium expert-reviewed meals when budget is tight."""
        mock_prof.return_value.get_by_id.return_value = {"id": "patient-1", "first_name": "Juan"}
        mock_hss.return_value.list_hss_history.return_value = [{"score": 75, "tier": "Stable"}]
        mock_health.return_value.list_user_logs.return_value = []
        mock_health.return_value.list_alerts.return_value = []
        mock_notif.return_value.list_user_notifications.return_value = []
        
        # Limit 2000mg, already consumed 1700mg -> remaining = 300mg (< 500mg tight threshold)
        mock_base.return_value.get_thresholds.return_value = {"sodium_limit_mg": 2000, "daily_calories": 2000}
        mock_base.return_value.get_baseline.return_value = {"dietary_practice": "Omnivore"}
        mock_health.return_value.list_today_meals.return_value = [{"sodium_mg": 1700, "calories": 600}]
        mock_health.return_value.list_today_exercises.return_value = []
        mock_health.return_value.list_today_sleep.return_value = []
        
        # Sample recipes: one high-sodium non-expert, one low-sodium expert, one medium-sodium expert
        recipes = [
            {"id": "r1", "name": "High Sodium Dish", "sodium_mg": 600, "status": "published", "hss_tier": "Stable", "expert_validated": False},
            {"id": "r2", "name": "Low Sodium Veggie", "sodium_mg": 85, "status": "published", "hss_tier": "Stable", "expert_validated": True},
            {"id": "r3", "name": "Medium Sodium Fish", "sodium_mg": 210, "status": "published", "hss_tier": "Stable", "expert_validated": True},
        ]
        mock_content.return_value.list_recipes.return_value = recipes
        mock_content.return_value.list_routines.return_value = []
        
        data = get_dashboard_data("patient-1")
        recs = data.get("recommendations", [])
        recipe_recs = [r for r in recs if r.get("type") == "recipe"]
        
        self.assertGreaterEqual(len(recipe_recs), 2)
        # Top recommended recipe must be r2 (lowest sodium, expert validated)
        self.assertEqual(recipe_recs[0]["id"], "r2")
        self.assertEqual(recipe_recs[0]["tag"], "Expert Verified")
        self.assertTrue(recipe_recs[0]["expert_validated"])
        print("[PASS] HL-ENG-21: Dynamic sodium budget prioritization and expert validation badge verified.")

    @patch("app.db.repositories.get_hss_repo")
    @patch("app.db.repositories.get_baseline_repo")
    @patch("app.services.dashboard._get_today_activity")
    def test_hl_eng_25_no_compounding_habit_penalty_cascade(
        self, mock_get_today, mock_get_baseline, mock_get_hss
    ):
        """Verify multiple daily logs do not compound penalties on previous composite scores (HL-ENG-25)."""
        mock_hss_repo = MagicMock()
        mock_get_hss.return_value = mock_hss_repo
        mock_base_repo = MagicMock()
        mock_get_baseline.return_value = mock_base_repo

        # Vitals base score is 80, but history[0] is an existing lifestyle_composite record with 77
        mock_hss_repo.list_hss_history.return_value = [
            {"score": 77, "tier": "Moderate", "source": "lifestyle_composite"},
            {"score": 80, "tier": "Stable", "source": "vitals"},
        ]
        mock_hss_repo.create_hss_record.side_effect = lambda uid, rec: rec
        mock_base_repo.get_thresholds.return_value = {"sodium_limit_mg": 2000}

        # Day total sodium is 3000mg (excess 1000mg -> penalty = 6)
        mock_get_today.return_value = {
            "total_sodium_mg": 3000,
            "total_calories": 1800,
            "total_exercise_minutes": 0,
            "total_sleep_hours": 7.0,
        }

        score, tier, risk, rec = compute_lifestyle_composite_hss("test-patient-uuid", trigger="meal_log")
        # Target score MUST be 80 (baseline) - 6 = 74, NOT 77 - 6 = 71!
        self.assertEqual(score, 74)
        self.assertEqual(rec["contributing_factors"]["base_score"], 80)
        self.assertEqual(rec["contributing_factors"]["sodium_penalty"], 6)
        print("[PASS] HL-ENG-25: Multi-event daily habit logging does NOT compound intermediate penalties.")

    @patch("app.services.dashboard.get_profile_repo")
    @patch("app.services.dashboard.get_hss_repo")
    @patch("app.services.dashboard.get_health_logs_repo")
    @patch("app.services.dashboard.get_baseline_repo")
    @patch("app.services.dashboard.get_content_repo")
    @patch("app.services.dashboard.get_notification_repo")
    def test_hl_eng_26_defensive_null_sodium_recipe_sort(
        self, mock_notif, mock_content, mock_base, mock_health, mock_hss, mock_prof
    ):
        """Verify sorting does not raise TypeError when recipes in DB have sodium_mg: None (HL-ENG-26)."""
        mock_prof.return_value.get_by_id.return_value = {"id": "patient-1", "first_name": "Juan"}
        mock_hss.return_value.list_hss_history.return_value = [{"score": 75, "tier": "Stable"}]
        mock_health.return_value.list_user_logs.return_value = []
        mock_health.return_value.list_alerts.return_value = []
        mock_notif.return_value.list_user_notifications.return_value = []

        mock_base.return_value.get_thresholds.return_value = {"sodium_limit_mg": 2000, "daily_calories": 2000}
        mock_base.return_value.get_baseline.return_value = {"dietary_practice": "Omnivore"}
        # Remaining sodium < 500mg (consumed 1700mg)
        mock_health.return_value.list_today_meals.return_value = [{"sodium_mg": 1700, "calories": 600}]
        mock_health.return_value.list_today_exercises.return_value = []
        mock_health.return_value.list_today_sleep.return_value = []

        # Recipe with sodium_mg: None!
        recipes = [
            {"id": "r1", "name": "Null Sodium Recipe", "sodium_mg": None, "status": "published", "hss_tier": "Stable", "expert_validated": False},
            {"id": "r2", "name": "Valid Sodium Recipe", "sodium_mg": 120, "status": "published", "hss_tier": "Stable", "expert_validated": True},
        ]
        mock_content.return_value.list_recipes.return_value = recipes
        mock_content.return_value.list_routines.return_value = []

        # This must execute cleanly without TypeError
        data = get_dashboard_data("patient-1")
        recs = data.get("recommendations", [])
        recipe_recs = [r for r in recs if r.get("type") == "recipe"]
        self.assertEqual(len(recipe_recs), 2)
        print("[PASS] HL-ENG-26: Recommendation sorting survives recipes with null sodium without TypeError.")

    @patch("app.api.meals.meals.delete_meal_log")
    @patch("app.services.hss_service.compute_lifestyle_composite_hss")
    @patch("app.api.meals.meals.verify_user_access")
    def test_hl_eng_29_meal_delete_triggers_hss_recalculation(
        self, mock_verify, mock_compute_hss, mock_del_meal
    ):
        """Verify deleting a meal invokes compute_lifestyle_composite_hss (HL-ENG-29)."""
        from app.api.meals.meals import remove_meal_log
        mock_del_meal.return_value = True
        mock_compute_hss.return_value = (78, "Stable", 0.22, {})
        current_user = {"user_id": "patient-1", "role": "patient"}

        res = remove_meal_log("patient-1", "meal-123", current_user=current_user)
        self.assertTrue(res["success"])
        mock_compute_hss.assert_called_once_with("patient-1", trigger="meal_delete")
        print("[PASS] HL-ENG-29: Deleting meal log invokes composite HSS recalculation.")


if __name__ == "__main__":
    unittest.main()
