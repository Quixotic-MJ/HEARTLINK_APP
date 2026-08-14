# test_standardization_matrix.py
import os
import sys
import unittest

# Add CAPSTONE-2/backend to path
backend_path = os.path.abspath(r"c:\Users\JOHN MARK MAGDASAL\OneDrive\Desktop\CTU main\CAPSTONE-2\backend")
sys.path.insert(0, backend_path)

from app.services.hss_service import determine_tier
from app.services.exercises import map_hss_tier, create_routine, get_routines
from app.services.recipes import map_hss_tier as map_recipe_hss_tier
from app.services.dashboard import get_dashboard_data
from app.main import app
from fastapi.testclient import TestClient
import app.mock_db as mock_db

class TestHssStandardizationMatrix(unittest.TestCase):
    def setUp(self):
        # Save original mock DB states
        self.original_routines = list(mock_db.exercise_routines)
        self.original_logs = list(mock_db.exercise_logs)
        self.original_health_logs = list(mock_db.daily_health_logs)
        self.original_profiles = list(mock_db.profiles)
        self.client = TestClient(app)

    def tearDown(self):
        # Restore original DB lists
        mock_db.exercise_routines.clear()
        mock_db.exercise_routines.extend(self.original_routines)
        mock_db.exercise_logs.clear()
        mock_db.exercise_logs.extend(self.original_logs)
        mock_db.daily_health_logs.clear()
        mock_db.daily_health_logs.extend(self.original_health_logs)
        mock_db.profiles.clear()
        mock_db.profiles.extend(self.original_profiles)
        mock_db.save_logs()

    def test_determine_tier_boundaries(self):
        # Exact Boundary Matrix: Stable >= 80, Moderate 60-79, Elevated Risk 50-59, Critical < 50
        self.assertEqual(determine_tier(79), "Moderate")
        self.assertEqual(determine_tier(80), "Stable")
        self.assertEqual(determine_tier(59), "Elevated Risk")
        self.assertEqual(determine_tier(60), "Moderate")
        self.assertEqual(determine_tier(49), "Critical")
        self.assertEqual(determine_tier(50), "Elevated Risk")
        self.assertEqual(determine_tier(39), "Critical")
        self.assertEqual(determine_tier(40), "Critical")

        # Additional Matrix Checks
        self.assertEqual(determine_tier(85), "Stable")
        self.assertEqual(determine_tier(72), "Moderate")
        self.assertEqual(determine_tier(55), "Elevated Risk")
        self.assertEqual(determine_tier(45), "Critical")
        self.assertEqual(determine_tier(20), "Critical")

    def test_legacy_tier_normalizers(self):
        # Exercises mapping normalizations
        self.assertEqual(map_hss_tier("Caution"), "Elevated Risk")
        self.assertEqual(map_hss_tier("At Risk"), "Elevated Risk")
        self.assertEqual(map_hss_tier("Needs Attention"), "Critical")
        
        # Recipes mapping normalizations
        self.assertEqual(map_recipe_hss_tier("Caution"), "Elevated Risk")
        self.assertEqual(map_recipe_hss_tier("At Risk"), "Elevated Risk")
        self.assertEqual(map_recipe_hss_tier("Needs Attention"), "Critical")

    def test_no_double_counting_in_admin_stats(self):
        # Mock various user scores to check bin counting
        # Stable >= 80, Moderate 60-79, Elevated Risk 50-59, Critical < 50
        mock_db.profiles.clear()
        mock_db.daily_health_logs.clear()
        mock_db.hss_history.clear()
        
        # Add 4 test patients
        mock_db.profiles.extend([
            {"id": "usr-p1", "role": "patient", "onboarding_status": "complete"},
            {"id": "usr-p2", "role": "patient", "onboarding_status": "complete"},
            {"id": "usr-p3", "role": "patient", "onboarding_status": "complete"},
            {"id": "usr-p4", "role": "patient", "onboarding_status": "complete"},
        ])
        
        # Add HSS logs
        mock_db.hss_history.extend([
            {"user_id": "usr-p1", "score": 80, "tier": "Stable", "computed_at": "2026-08-14T09:00:00Z"},
            {"user_id": "usr-p2", "score": 79, "tier": "Moderate", "computed_at": "2026-08-14T09:00:00Z"},
            {"user_id": "usr-p3", "score": 50, "tier": "Elevated Risk", "computed_at": "2026-08-14T09:00:00Z"},
            {"user_id": "usr-p4", "score": 49, "tier": "Critical", "computed_at": "2026-08-14T09:00:00Z"},
        ])
        
        # Fetch stats directly using client API with admin token
        from app.utils.security import create_access_token
        admin_token = create_access_token({"user_id": "usr-chief-admin-001", "role": "admin"})
        response = self.client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(response.status_code, 200)
        stats = response.json()
        dist = stats.get("hss_distribution", {})
        
        # Ensure correct counts in each bin
        self.assertEqual(dist["stable"]["count"], 1)
        self.assertEqual(dist["moderate"]["count"], 1)
        self.assertEqual(dist["elevated_risk"]["count"], 1)
        self.assertEqual(dist["critical"]["count"], 1)
        
        # Total counted must be exactly equal to 4, with no overlap
        total_counted = sum(b["count"] for b in dist.values())
        self.assertEqual(total_counted, 4)

    def test_dashboard_recommendations_tier_mapping(self):
        # Set up standard routines and recipes for all tiers
        mock_db.exercise_routines.clear()
        mock_db.recipes.clear()
        mock_db.profiles.clear()
        mock_db.daily_health_logs.clear()
        mock_db.hss_history.clear()
        
        # Add user profiles
        mock_db.profiles.extend([
            {"id": "user-stable", "role": "patient", "name": "Stable User", "onboarding_status": "complete"},
            {"id": "user-moderate", "role": "patient", "name": "Moderate User", "onboarding_status": "complete"},
            {"id": "user-elevated", "role": "patient", "name": "Elevated User", "onboarding_status": "complete"},
            {"id": "user-critical", "role": "patient", "name": "Critical User", "onboarding_status": "complete"}
        ])
        
        # Add corresponding HSS scores
        mock_db.hss_history.extend([
            {"user_id": "user-stable", "score": 85, "tier": "Stable", "computed_at": "2026-08-14T09:00:00Z"},
            {"user_id": "user-moderate", "score": 72, "tier": "Moderate", "computed_at": "2026-08-14T09:00:00Z"},
            {"user_id": "user-elevated", "score": 55, "tier": "Elevated Risk", "computed_at": "2026-08-14T09:00:00Z"},
            {"user_id": "user-critical", "score": 45, "tier": "Critical", "computed_at": "2026-08-14T09:00:00Z"}
        ])
        
        # Add standard exercises and recipes for each tier
        mock_db.exercise_routines.extend([
            {"id": "ex-stable", "name": "Stable Ex", "description": "Stable desc", "hss_tier": "Stable", "status": "published"},
            {"id": "ex-moderate", "name": "Mod Ex", "description": "Mod desc", "hss_tier": "Moderate", "status": "published"},
            {"id": "ex-elevated", "name": "Elevated Ex", "description": "Elevated desc", "hss_tier": "Elevated Risk", "status": "published"},
            {"id": "ex-critical", "name": "Crit Ex", "description": "Crit desc", "hss_tier": "Critical", "status": "published"}
        ])
        mock_db.recipes.extend([
            {"id": "rec-stable", "name": "Stable Rec", "hss_tier": "Stable", "status": "published", "dietary_tags": []},
            {"id": "rec-moderate", "name": "Mod Rec", "hss_tier": "Moderate", "status": "published", "dietary_tags": []},
            {"id": "rec-elevated", "name": "Elevated Rec", "hss_tier": "Elevated Risk", "status": "published", "dietary_tags": []},
            {"id": "rec-critical", "name": "Crit Rec", "hss_tier": "Critical", "status": "published", "dietary_tags": []}
        ])

        # Test Stable User (85) -> receives Stable target content
        stable_dash = get_dashboard_data("user-stable")
        stable_reco_ids = [r["id"] for r in stable_dash.get("recommendations", [])]
        self.assertIn("ex-stable", stable_reco_ids)
        self.assertIn("rec-stable", stable_reco_ids)

        # Test Moderate User (72) -> receives Moderate target content
        mod_dash = get_dashboard_data("user-moderate")
        mod_reco_ids = [r["id"] for r in mod_dash.get("recommendations", [])]
        self.assertIn("ex-moderate", mod_reco_ids)
        self.assertIn("rec-moderate", mod_reco_ids)

        # Test Elevated Risk User (55) -> receives Elevated Risk target content
        elevated_dash = get_dashboard_data("user-elevated")
        elevated_reco_ids = [r["id"] for r in elevated_dash.get("recommendations", [])]
        self.assertIn("ex-elevated", elevated_reco_ids)
        self.assertIn("rec-elevated", elevated_reco_ids)

        # Test Critical User (45) -> receives Critical target content
        crit_dash = get_dashboard_data("user-critical")
        crit_reco_ids = [r["id"] for r in crit_dash.get("recommendations", [])]
        self.assertIn("ex-critical", crit_reco_ids)
        self.assertIn("rec-critical", crit_reco_ids)

if __name__ == "__main__":
    unittest.main()
