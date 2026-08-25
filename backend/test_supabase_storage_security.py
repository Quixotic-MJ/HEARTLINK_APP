# backend/test_supabase_storage_security.py
"""
Supabase Storage & Asset Lifecycle Security Test Suite.
Verifies bucket policies, MIME validation, file size limits, cross-user isolation,
role-based upload restrictions, and cascade asset cleanup.
"""
import io
import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.utils.security import create_access_token
from app.services.storage_service import get_storage_service, BUCKET_AVATARS, BUCKET_RECIPES, BUCKET_EXERCISES

client = TestClient(app)

class TestSupabaseStorageSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.patient_a_id = "usr-patient-101"
        cls.patient_b_id = "usr-patient-102"
        cls.expert_id = "usr-expert-201"
        cls.admin_id = "usr-chief-admin-001"

        cls.patient_a_token = create_access_token({"user_id": cls.patient_a_id, "role": "patient"})
        cls.patient_b_token = create_access_token({"user_id": cls.patient_b_id, "role": "patient"})
        cls.expert_token = create_access_token({"user_id": cls.expert_id, "role": "medical_expert"})
        cls.admin_token = create_access_token({"user_id": cls.admin_id, "role": "admin"})

    def test_unauthenticated_upload_rejected(self):
        file_data = io.BytesIO(b"fake image data")
        res = client.post(
            "/api/upload/",
            files={"file": ("avatar.jpg", file_data, "image/jpeg")},
            data={"bucket": "avatars"}
        )
        self.assertIn(res.status_code, [401, 403])

    def test_patient_can_upload_own_avatar(self):
        file_data = io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIFfake_jpeg_content")
        res = client.post(
            "/api/upload/",
            files={"file": ("my_avatar.jpg", file_data, "image/jpeg")},
            data={"bucket": "avatars", "target_id": self.patient_a_id},
            headers={"Authorization": f"Bearer {self.patient_a_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("url", data)
        self.assertIn("filename", data)

    def test_cross_user_avatar_upload_rejected(self):
        # Patient A attempting to upload avatar for Patient B
        file_data = io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIFfake_jpeg_content")
        res = client.post(
            "/api/upload/",
            files={"file": ("hacked.jpg", file_data, "image/jpeg")},
            data={"bucket": "avatars", "target_id": self.patient_b_id},
            headers={"Authorization": f"Bearer {self.patient_a_token}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_oversized_avatar_rejected(self):
        # 3 MB file (> 2 MB limit)
        oversized = io.BytesIO(b"0" * (3 * 1024 * 1024))
        res = client.post(
            "/api/upload/",
            files={"file": ("large.jpg", oversized, "image/jpeg")},
            data={"bucket": "avatars", "target_id": self.patient_a_id},
            headers={"Authorization": f"Bearer {self.patient_a_token}"}
        )
        self.assertEqual(res.status_code, 400)

    def test_invalid_mime_type_rejected(self):
        # Executable disguised as image
        bad_file = io.BytesIO(b"MZ executable header")
        res = client.post(
            "/api/upload/",
            files={"file": ("malicious.exe", bad_file, "application/octet-stream")},
            data={"bucket": "avatars", "target_id": self.patient_a_id},
            headers={"Authorization": f"Bearer {self.patient_a_token}"}
        )
        self.assertEqual(res.status_code, 400)

    def test_patient_cannot_upload_recipe_image(self):
        file_data = io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIFrecipe_img")
        res = client.post(
            "/api/upload/",
            files={"file": ("recipe.jpg", file_data, "image/jpeg")},
            data={"bucket": "recipes", "target_id": "rec-501"},
            headers={"Authorization": f"Bearer {self.patient_a_token}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_admin_can_upload_recipe_image(self):
        file_data = io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIFrecipe_img")
        res = client.post(
            "/api/upload/",
            files={"file": ("recipe.jpg", file_data, "image/jpeg")},
            data={"bucket": "recipes", "target_id": "rec-501"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("url", data)

    def test_patient_cannot_upload_exercise_video(self):
        file_data = io.BytesIO(b"fake mp4 video stream")
        res = client.post(
            "/api/upload/",
            files={"file": ("routine.mp4", file_data, "video/mp4")},
            data={"bucket": "exercises", "target_id": "rout-601"},
            headers={"Authorization": f"Bearer {self.patient_a_token}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_expert_can_upload_exercise_media(self):
        file_data = io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIFexercise_guide")
        res = client.post(
            "/api/upload/",
            files={"file": ("exercise.png", file_data, "image/png")},
            data={"bucket": "exercises", "target_id": "rout-601"},
            headers={"Authorization": f"Bearer {self.expert_token}"}
        )
        self.assertEqual(res.status_code, 200)

    def test_delete_user_assets_cleanup(self):
        storage_svc = get_storage_service()
        # Upload an avatar first
        storage_svc.upload_file(
            file_bytes=b"avatar_content",
            filename="test.png",
            content_type="image/png",
            bucket=BUCKET_AVATARS,
            target_id="usr-cleanup-test",
            caller_id="usr-cleanup-test",
            caller_role="patient"
        )
        cleaned = storage_svc.delete_user_assets("usr-cleanup-test")
        self.assertTrue(cleaned)


if __name__ == "__main__":
    unittest.main()
