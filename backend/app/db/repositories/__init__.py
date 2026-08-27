# backend/app/db/repositories/__init__.py
"""
Repository Layer Module & Factories.
Provides singleton repository instances configured for the active DATABASE_MODE.
"""
from app.db.client import is_supabase_mode, get_supabase_client
from app.db.repositories.profiles import ProfileRepository, MockProfileRepository, SupabaseProfileRepository
from app.db.repositories.baseline import BaselineRepository, MockBaselineRepository, SupabaseBaselineRepository
from app.db.repositories.health_logs import HealthLogsRepository, MockHealthLogsRepository, SupabaseHealthLogsRepository
from app.db.repositories.meals import MealsRepository, MockMealsRepository, SupabaseMealsRepository
from app.db.repositories.exercises import ExercisesRepository, MockExercisesRepository, SupabaseExercisesRepository
from app.db.repositories.sleep import SleepLogsRepository, MockSleepLogsRepository, SupabaseSleepLogsRepository
from app.db.repositories.hss import HSSRepository, MockHSSRepository, SupabaseHSSRepository
from app.db.repositories.notifications import NotificationRepository, MockNotificationRepository, SupabaseNotificationRepository
from app.db.repositories.admin import AdminRepository, MockAdminRepository, SupabaseAdminRepository
from app.db.repositories.feedback import FeedbackRepository, MockFeedbackRepository, SupabaseFeedbackRepository
from app.db.repositories.case_review import CaseReviewRepository, MockCaseReviewRepository, SupabaseCaseReviewRepository
from app.db.repositories.content import ContentRepository, MockContentRepository, SupabaseContentRepository

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

def get_profile_repo() -> ProfileRepository:
    global _profile_repo
    if _profile_repo is None:
        if is_supabase_mode():
            _profile_repo = SupabaseProfileRepository(get_supabase_client())
        else:
            _profile_repo = MockProfileRepository()
    return _profile_repo

def get_baseline_repo() -> BaselineRepository:
    global _baseline_repo
    if _baseline_repo is None:
        if is_supabase_mode():
            _baseline_repo = SupabaseBaselineRepository(get_supabase_client())
        else:
            _baseline_repo = MockBaselineRepository()
    return _baseline_repo

def get_health_logs_repo() -> HealthLogsRepository:
    global _health_logs_repo
    if _health_logs_repo is None:
        if is_supabase_mode():
            _health_logs_repo = SupabaseHealthLogsRepository(get_supabase_client())
        else:
            _health_logs_repo = MockHealthLogsRepository()
    return _health_logs_repo

def get_meals_repo() -> MealsRepository:
    global _meals_repo
    if _meals_repo is None:
        if is_supabase_mode():
            _meals_repo = SupabaseMealsRepository(get_supabase_client())
        else:
            _meals_repo = MockMealsRepository()
    return _meals_repo

def get_exercises_repo() -> ExercisesRepository:
    global _exercises_repo
    if _exercises_repo is None:
        if is_supabase_mode():
            _exercises_repo = SupabaseExercisesRepository(get_supabase_client())
        else:
            _exercises_repo = MockExercisesRepository()
    return _exercises_repo

def get_sleep_repo() -> SleepLogsRepository:
    global _sleep_repo
    if _sleep_repo is None:
        if is_supabase_mode():
            _sleep_repo = SupabaseSleepLogsRepository(get_supabase_client())
        else:
            _sleep_repo = MockSleepLogsRepository()
    return _sleep_repo

def get_hss_repo() -> HSSRepository:
    global _hss_repo
    if _hss_repo is None:
        if is_supabase_mode():
            _hss_repo = SupabaseHSSRepository(get_supabase_client())
        else:
            _hss_repo = MockHSSRepository()
    return _hss_repo

def get_notification_repo() -> NotificationRepository:
    global _notification_repo
    if _notification_repo is None:
        if is_supabase_mode():
            _notification_repo = SupabaseNotificationRepository(get_supabase_client())
        else:
            _notification_repo = MockNotificationRepository()
    return _notification_repo

def get_admin_repo() -> AdminRepository:
    global _admin_repo
    if _admin_repo is None:
        if is_supabase_mode():
            _admin_repo = SupabaseAdminRepository(get_supabase_client())
        else:
            _admin_repo = MockAdminRepository()
    return _admin_repo

def get_feedback_repo() -> FeedbackRepository:
    global _feedback_repo
    if _feedback_repo is None:
        if is_supabase_mode():
            _feedback_repo = SupabaseFeedbackRepository(get_supabase_client())
        else:
            _feedback_repo = MockFeedbackRepository()
    return _feedback_repo

def get_case_review_repo() -> CaseReviewRepository:
    global _case_review_repo
    if _case_review_repo is None:
        if is_supabase_mode():
            _case_review_repo = SupabaseCaseReviewRepository(get_supabase_client())
        else:
            _case_review_repo = MockCaseReviewRepository()
    return _case_review_repo

def get_content_repo() -> ContentRepository:
    global _content_repo
    if _content_repo is None:
        if is_supabase_mode():
            _content_repo = SupabaseContentRepository(get_supabase_client())
        else:
            _content_repo = MockContentRepository()
    return _content_repo

get_sleep_logs_repo = get_sleep_repo
