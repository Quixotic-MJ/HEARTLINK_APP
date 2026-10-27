"""HL-088: the Nearby Clinics directory sends only checked, real fields."""
import json
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROWS = [
    {"id": "1", "osm_id": "way/1", "name": "Vicente Sotto Memorial Medical Center", "kind": "er_hospital", "has_er": True,
     "address": "B. Rodriguez Street, Cebu City", "latitude": "10.3078", "longitude": "123.8917",
     "phone": "+63 32 000 0000", "phone_verified": True, "source": "osm", "doctor": None},
    # A number found on the map but not checked yet: no Call
    {"id": "2", "osm_id": "way/2", "name": "VisayasMed Hospital", "kind": "er_hospital", "has_er": True,
     "latitude": 10.3065, "longitude": 123.8951, "phone": "+6332 2531901", "phone_verified": False, "source": "osm"},
    {"id": "3", "osm_id": "node/3", "name": "Pardo Health Center", "kind": "health_center", "has_er": None,
     "latitude": 10.279, "longitude": 123.856, "phone": None, "phone_verified": False, "source": "osm"},
    # Leftovers that must never be shown: no kind (old hand-made row), no location
    {"id": "4", "name": "Chong Hua Hospital Heart Institute", "doctor": "Dr. Maria Santos, MD, FACC",
     "latitude": 10.31, "longitude": 123.89, "phone": "1234567890"},
    {"id": "5", "osm_id": "node/5", "name": "Somewhere", "kind": "clinic", "latitude": None, "longitude": 123.9},
]


class Content:
    def __init__(self, rows):
        self.rows = rows

    def list_clinics(self):
        return self.rows


@pytest.fixture
def api(monkeypatch):
    from app.main import app
    monkeypatch.setattr("app.services.clinics.get_content_repo", lambda: Content(ROWS))
    return TestClient(app)


def test_only_real_checked_fields_go_out(api):
    clinics = api.get("/api/clinics").json()
    assert [c["name"] for c in clinics] == ["Vicente Sotto Memorial Medical Center", "VisayasMed Hospital", "Pardo Health Center"]
    assert all("doctor" not in c for c in clinics)
    vsmmc, visayasmed, pardo = clinics
    assert vsmmc["phone"] == "+63 32 000 0000" and vsmmc["has_er"] is True and vsmmc["latitude"] == 10.3078
    assert visayasmed["phone"] is None  # found on the map, not checked yet
    assert pardo["has_er"] is None and pardo["address"] is None


def test_an_empty_or_failing_table_gives_an_empty_list(monkeypatch):
    from app.main import app
    monkeypatch.setattr("app.services.clinics.get_content_repo", lambda: Content([]))
    assert TestClient(app).get("/api/clinics").json() == []


def test_the_repository_has_no_invented_fallback():
    source = Path("app/db/repositories/content.py").read_text(encoding="utf-8")
    for invented in ("Maria Santos", "Juan Dela Cruz", "Anna Reyes"):
        assert invented not in source
    assert "clinics" not in json.loads(Path("app/db/seed_content.json").read_text(encoding="utf-8"))


def test_the_directory_migration_is_cebu_city_only_and_has_no_doctors():
    sql = Path("supabase/migrations/040_clinic_directory.sql").read_text(encoding="utf-8")
    rows = re.findall(r"\('(?:node|way|relation)/\d+', '((?:[^']|'')*)', '(\w+)', (true|false|NULL), .*?, ([\d.]+), ([\d.]+), ", sql)
    assert len(rows) == 36
    kinds = [r[1] for r in rows]
    assert kinds.count("er_hospital") == 10 and kinds.count("health_center") == 7
    for name, kind, has_er, lat, lng in rows:
        assert 10.26 <= float(lat) <= 10.42 and 123.84 <= float(lng) <= 123.97, name  # Cebu City
        assert (kind == "er_hospital") == (has_er == "true"), name
    # Every number from the map goes in unchecked, so Call stays hidden until the team checks it
    assert "v.phone, false, 'osm'" in sql
    for left_out in ("Dog and Cat", "Skin", "Chiropractic", "Acupuncture", "Birthing", "Dialysis", "Maternity"):
        assert left_out not in sql, left_out
