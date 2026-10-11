import pytest
from fastapi import HTTPException
from app.schemas.user import normalize_expert_type
from app.api.admin_api.admin_api import _resolve_expert_type, create_system_staff


def test_normalize_expert_type_canonical():
    assert normalize_expert_type("Physical Therapist") == "Physical Therapist"
    assert normalize_expert_type("Dietitian") == "Dietitian"
    assert normalize_expert_type("Cardiologist") == "Cardiologist"


def test_normalize_expert_type_snake_and_kebab_case():
    assert normalize_expert_type("physical_therapist") == "Physical Therapist"
    assert normalize_expert_type("physical-therapist") == "Physical Therapist"
    assert normalize_expert_type("dietitian") == "Dietitian"
    assert normalize_expert_type("cardiologist") == "Cardiologist"


def test_normalize_expert_type_mixed_case_and_whitespace():
    assert normalize_expert_type("  DIETITIAN  ") == "Dietitian"
    assert normalize_expert_type("cardiologist ") == "Cardiologist"
    assert normalize_expert_type("  physical_therapist  ") == "Physical Therapist"


def test_normalize_expert_type_invalid_and_empty():
    assert normalize_expert_type("Neurologist") is None
    assert normalize_expert_type("doctor") is None
    assert normalize_expert_type("random string") is None
    assert normalize_expert_type("") is None
    assert normalize_expert_type("   ") is None
    assert normalize_expert_type(None) is None


def test_resolve_expert_type_for_admin_and_super_admin():
    # Admin and Super Admin accounts do not have an expert_type
    assert _resolve_expert_type("admin", None) is None
    assert _resolve_expert_type("admin", "Physical Therapist") is None
    assert _resolve_expert_type("super_admin", "Dietitian") is None
    assert _resolve_expert_type("super_admin", None) is None


def test_resolve_expert_type_for_medical_expert_valid():
    assert _resolve_expert_type("medical_expert", "Physical Therapist") == "Physical Therapist"
    assert _resolve_expert_type("medical_expert", "physical_therapist") == "Physical Therapist"
    assert _resolve_expert_type("medical_expert", "dietitian") == "Dietitian"
    assert _resolve_expert_type("medical_expert", "Cardiologist") == "Cardiologist"


def test_resolve_expert_type_for_medical_expert_missing_raises_400():
    with pytest.raises(HTTPException) as exc_info:
        _resolve_expert_type("medical_expert", None)
    assert exc_info.value.status_code == 400
    assert "expert_type is required when role is medical_expert" in exc_info.value.detail


def test_resolve_expert_type_for_medical_expert_blank_raises_400():
    with pytest.raises(HTTPException) as exc_info:
        _resolve_expert_type("medical_expert", "   ")
    assert exc_info.value.status_code == 400
    assert "expert_type is required when role is medical_expert" in exc_info.value.detail


def test_resolve_expert_type_for_medical_expert_invalid_raises_400():
    with pytest.raises(HTTPException) as exc_info:
        _resolve_expert_type("medical_expert", "Neurologist")
    assert exc_info.value.status_code == 400
    assert "Invalid expert_type: 'Neurologist'" in exc_info.value.detail


def test_create_system_staff_missing_expert_type_raises_400_before_db():
    payload = {
        "name": "Dr. Missing Specialization",
        "email": "missing.specialization@heartlink.ph",
        "role": "Authorized Medical Expert",
    }
    super_admin_user = {"user_id": "test-super-admin-uuid", "role": "super_admin"}
    
    with pytest.raises(HTTPException) as exc_info:
        create_system_staff(payload, current_user=super_admin_user)
    assert exc_info.value.status_code == 400
    assert "expert_type is required when role is medical_expert" in exc_info.value.detail


def test_create_system_staff_blank_expert_type_raises_400_before_db():
    payload = {
        "name": "Dr. Blank Specialization",
        "email": "blank.specialization@heartlink.ph",
        "role": "Authorized Medical Expert",
        "expert_type": "   ",
    }
    super_admin_user = {"user_id": "test-super-admin-uuid", "role": "super_admin"}
    
    with pytest.raises(HTTPException) as exc_info:
        create_system_staff(payload, current_user=super_admin_user)
    assert exc_info.value.status_code == 400
    assert "expert_type is required when role is medical_expert" in exc_info.value.detail


def test_create_system_staff_invalid_expert_type_raises_400_before_db():
    payload = {
        "name": "Dr. Invalid Specialization",
        "email": "invalid.specialization@heartlink.ph",
        "role": "Authorized Medical Expert",
        "expert_type": "Neurologist",
    }
    super_admin_user = {"user_id": "test-super-admin-uuid", "role": "super_admin"}
    
    with pytest.raises(HTTPException) as exc_info:
        create_system_staff(payload, current_user=super_admin_user)
    assert exc_info.value.status_code == 400
    assert "Invalid expert_type: 'Neurologist'" in exc_info.value.detail
