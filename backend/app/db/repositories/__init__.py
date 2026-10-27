# backend/app/db/repositories/__init__.py
"""
Repository Layer Module & Factories.
Provides singleton repository instances configured for the active DATABASE_MODE.
"""
from app.db.client import get_supabase_client
from app.db.repositories.profiles import ProfileRepository, SupabaseProfileRepository
from app.db.repositories.baseline import BaselineRepository, SupabaseBaselineRepository
from app.db.repositories.health_logs import HealthLogsRepository, SupabaseHealthLogsRepository
from app.db.repositories.meals import MealsRepository, SupabaseMealsRepository
from app.db.repositories.exercises import ExercisesRepository, SupabaseExercisesRepository
from app.db.repositories.sleep import SleepLogsRepository, SupabaseSleepLogsRepository
from app.db.repositories.hss import HSSRepository, SupabaseHSSRepository
from app.db.repositories.notifications import NotificationRepository, SupabaseNotificationRepository
from app.db.repositories.admin import AdminRepository, SupabaseAdminRepository
from app.db.repositories.feedback import FeedbackRepository, SupabaseFeedbackRepository
from app.db.repositories.case_review import CaseReviewRepository, SupabaseCaseReviewRepository
from app.db.repositories.content import ContentRepository, SupabaseContentRepository
from app.db.repositories.pending_registrations import PendingRegistrationRepository, SupabasePendingRegistrationRepository
from app.db.repositories.refresh_tokens import RefreshTokenRepository, SupabaseRefreshTokenRepository
from app.db.repositories.patient_notes import PatientNotesRepository, SupabasePatientNotesRepository
from app.db.repositories.push_tokens import PushTokenRepository, SupabasePushTokenRepository
from app.db.repositories.premium import PremiumRepository, SupabasePremiumRepository

_profile_repo = None
_baseline_repo = None
_health_logs_repo = None
_meals_repo = None
_exercises_repo = None
_sleep_repo = None
_hss_repo = None
_notification_repo = None
_admin_repo = None
_feedback_repo = None
_case_review_repo = None
_content_repo = None
_pending_registration_repo = None
_refresh_token_repo = None
_push_token_repo = None
_patient_notes_repo = None
_premium_repo = None

def get_profile_repo() -> ProfileRepository:
    global _profile_repo
    if _profile_repo is None:
        _profile_repo = SupabaseProfileRepository(get_supabase_client())
    return _profile_repo

def get_baseline_repo() -> BaselineRepository:
    global _baseline_repo
    if _baseline_repo is None:
        _baseline_repo = SupabaseBaselineRepository(get_supabase_client())
    return _baseline_repo

def get_health_logs_repo() -> HealthLogsRepository:
    global _health_logs_repo
    if _health_logs_repo is None:
        _health_logs_repo = SupabaseHealthLogsRepository(get_supabase_client())
    return _health_logs_repo

def get_meals_repo() -> MealsRepository:
    global _meals_repo
    if _meals_repo is None:
        _meals_repo = SupabaseMealsRepository(get_supabase_client())
    return _meals_repo

def get_exercises_repo() -> ExercisesRepository:
    global _exercises_repo
    if _exercises_repo is None:
        _exercises_repo = SupabaseExercisesRepository(get_supabase_client())
    return _exercises_repo

def get_sleep_repo() -> SleepLogsRepository:
    global _sleep_repo
    if _sleep_repo is None:
        _sleep_repo = SupabaseSleepLogsRepository(get_supabase_client())
    return _sleep_repo

def get_hss_repo() -> HSSRepository:
    global _hss_repo
    if _hss_repo is None:
        _hss_repo = SupabaseHSSRepository(get_supabase_client())
    return _hss_repo

def get_notification_repo() -> NotificationRepository:
    global _notification_repo
    if _notification_repo is None:
        _notification_repo = SupabaseNotificationRepository(get_supabase_client())
    return _notification_repo

def get_admin_repo() -> AdminRepository:
    global _admin_repo
    if _admin_repo is None:
        _admin_repo = SupabaseAdminRepository(get_supabase_client())
    return _admin_repo

def get_feedback_repo() -> FeedbackRepository:
    global _feedback_repo
    if _feedback_repo is None:
        _feedback_repo = SupabaseFeedbackRepository(get_supabase_client())
    return _feedback_repo

def get_case_review_repo() -> CaseReviewRepository:
    global _case_review_repo
    if _case_review_repo is None:
        _case_review_repo = SupabaseCaseReviewRepository(get_supabase_client())
    return _case_review_repo

def get_content_repo() -> ContentRepository:
    global _content_repo
    if _content_repo is None:
        _content_repo = SupabaseContentRepository(get_supabase_client())
    return _content_repo

def get_pending_registration_repo() -> PendingRegistrationRepository:
    global _pending_registration_repo
    if _pending_registration_repo is None:
        _pending_registration_repo = SupabasePendingRegistrationRepository(get_supabase_client())
    return _pending_registration_repo

def get_refresh_token_repo() -> RefreshTokenRepository:
    global _refresh_token_repo
    if _refresh_token_repo is None:
        _refresh_token_repo = SupabaseRefreshTokenRepository(get_supabase_client())
    return _refresh_token_repo

def get_push_token_repo() -> PushTokenRepository:
    global _push_token_repo
    if _push_token_repo is None:
        _push_token_repo = SupabasePushTokenRepository(get_supabase_client())
    return _push_token_repo

def get_patient_notes_repo() -> PatientNotesRepository:
    global _patient_notes_repo
    if _patient_notes_repo is None:
        _patient_notes_repo = SupabasePatientNotesRepository(get_supabase_client())
    return _patient_notes_repo

get_sleep_logs_repo = get_sleep_repo

def get_premium_repo() -> PremiumRepository:
    global _premium_repo
    if _premium_repo is None:
        _premium_repo = SupabasePremiumRepository(get_supabase_client())
    return _premium_repo
