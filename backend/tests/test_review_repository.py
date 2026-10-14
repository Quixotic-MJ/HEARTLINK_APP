"""HL-053: review rounds and expert sections in the case review repository."""
import uuid

from app.db.repositories.case_review import SupabaseCaseReviewRepository


class FakeQuery:
    def __init__(self, db, table):
        self.db, self.table = db, table
        self.filters, self.op, self.payload, self.on_conflict = [], "select", None, None

    def select(self, *a, **k):
        return self

    def eq(self, col, val):
        self.filters.append((col, val))
        return self

    def order(self, *a, **k):
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def upsert(self, payload, on_conflict=None):
        self.op, self.payload, self.on_conflict = "upsert", payload, on_conflict
        return self

    def _match(self, row):
        return all(row.get(c) == v for c, v in self.filters)

    def execute(self):
        rows = self.db.setdefault(self.table, [])
        self.db.setdefault("_calls", []).append(self)
        if self.op == "insert":
            row = {"id": str(uuid.uuid4()), **self.payload}
            rows.append(row)
            data = [row]
        elif self.op == "upsert":
            keys = self.on_conflict.split(",")
            existing = next((r for r in rows if all(r.get(k) == self.payload.get(k) for k in keys)), None)
            if existing:
                existing.update(self.payload)
                data = [existing]
            else:
                row = {"id": str(uuid.uuid4()), **self.payload}
                rows.append(row)
                data = [row]
        elif self.op == "update":
            data = [r for r in rows if self._match(r)]
            for r in data:
                r.update(self.payload)
        else:
            data = [dict(r) for r in rows if self._match(r)]
        return type("Res", (), {"data": data})()


class FakeClient:
    def __init__(self):
        self.db = {}

    def table(self, name):
        return FakeQuery(self.db, name)


def make_repo():
    client = FakeClient()
    return SupabaseCaseReviewRepository(client), client.db


def test_review_case_round_trip():
    repo, _ = make_repo()
    created = repo.create_review_case({"patient_id": "p1", "case_code": "7F3A", "lane": "urgent",
                                       "reason": "BP 182/121", "status": "open"})
    assert repo.get_review_case(created["id"])["case_code"] == "7F3A"
    assert repo.get_open_case_for_patient("p1")["id"] == created["id"]
    assert repo.get_review_case("not-a-uuid") is None

    repo.update_review_case(created["id"], {"status": "complete"})
    assert repo.get_open_case_for_patient("p1") is None
    assert repo.list_reviewed_patient_ids() == ["p1"]


def test_sections_are_one_per_round_and_section():
    repo, db = make_repo()
    case = repo.create_review_case({"patient_id": "p1", "case_code": "7F3A", "lane": "sample",
                                    "reason": "Weekly sample", "status": "open"})

    repo.save_section(case["id"], "cardiology", {"expert_tier": "Moderate", "is_clinical": False})
    repo.save_section(case["id"], "cardiology", {"expert_tier": "Critical", "is_clinical": False})
    repo.save_section(case["id"], "nutrition", {"item_verdicts": [], "is_clinical": True})

    sections = db["expert_evaluations"]
    assert len(sections) == 2
    assert next(s for s in sections if s["section"] == "cardiology")["expert_tier"] == "Critical"
    upserts = [c for c in db["_calls"] if c.op == "upsert"]
    assert all(c.on_conflict == "review_case_id,section" for c in upserts)


def test_list_sections_filters_clinical_and_archived():
    repo, db = make_repo()
    db["expert_evaluations"] = [
        {"id": "a", "review_case_id": "c1", "section": "cardiology", "is_clinical": True, "status": "submitted"},
        {"id": "b", "review_case_id": "c2", "section": "cardiology", "is_clinical": False, "status": "submitted"},
        {"id": "c", "review_case_id": "c3", "section": "cardiology", "is_clinical": True, "status": "archived"},
        {"id": "d", "review_case_id": "c1", "section": "nutrition", "is_clinical": True, "status": "submitted"},
    ]
    assert {s["id"] for s in repo.list_sections(section="cardiology")} == {"a", "b"}
    assert {s["id"] for s in repo.list_sections(section="cardiology", clinical_only=True)} == {"a"}
    assert {s["id"] for s in repo.list_sections(section="cardiology", include_archived=True)} == {"a", "b", "c"}
    assert {s["id"] for s in repo.list_sections(review_case_id="c1")} == {"a", "d"}


def test_hidden_recommendation_is_not_duplicated():
    repo, db = make_repo()
    item = str(uuid.uuid4())
    repo.hide_recommendation("p1", "recipe", item, "c1")
    repo.hide_recommendation("p1", "recipe", item, "c2")
    assert len(db["patient_hidden_recommendations"]) == 1
    assert [h["item_id"] for h in repo.list_hidden_recommendations("p1")] == [item]
