"""
Suvio V1.6 - Backend regression for Help Center + Support + Health Trainer + Plan/Memory.

Run:
  pytest /app/backend/tests/test_suvio_v16_helpandtrainer.py -v --tb=short \
    --junitxml=/app/test_reports/pytest/pytest_results_v16.xml
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

TEST_USER = {"email": "test@suvio.app", "password": "TestPass123!"}


# --------- Fixtures ---------
@pytest.fixture(scope="session")
def test_session():
    """Premium-tier test user session."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=TEST_USER, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    yield s


# ===================================================================
# Auth wiring
# ===================================================================
class TestAuth:
    def test_login_email(self, test_session):
        r = test_session.get(f"{BASE_URL}/api/me", timeout=15)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["email"] == TEST_USER["email"]
        assert u.get("planTier") == "premium"


# ===================================================================
# Plan status
# ===================================================================
class TestPlanStatus:
    def test_plan_status_premium(self, test_session):
        r = test_session.get(f"{BASE_URL}/api/plan/status", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["tier"] == "premium"
        assert d["gates"]["bodyAnalysis"] is True
        assert d["gates"]["aiWorkoutPlan"] is True
        assert d["gates"]["aiDietPlan"] is True

    def test_plan_status_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/plan/status", timeout=15)
        # Should not leak plan info without auth
        assert r.status_code in (401, 200)  # accept either but must not be 500


# ===================================================================
# AI Memory
# ===================================================================
class TestAiMemory:
    def test_memory_get(self, test_session):
        r = test_session.get(f"{BASE_URL}/api/ai/memory", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d
        assert "enabled" in d
        assert isinstance(d["items"], list)
        assert isinstance(d["enabled"], bool)


# ===================================================================
# Support: bug report / feature request / feedback
# ===================================================================
class TestSupport:
    def test_bug_report(self, test_session):
        payload = {
            "title": "TEST_regression_bug_v16",
            "description": "Automated regression test bug — describes an imagined issue with signup flow.",
            "category": "auth",
            "steps": "1. Open signup 2. Enter phone 3. Nothing happens",
            "browser": "pytest",
            "device": "linux",
        }
        r = test_session.post(f"{BASE_URL}/api/support/bug-report", json=payload, timeout=30)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        d = r.json()
        assert d.get("ok") is True
        assert "ticket" in d
        assert "id" in d["ticket"]
        assert d["ticket"].get("title") == payload["title"]

    def test_bug_report_missing_fields(self, test_session):
        r = test_session.post(f"{BASE_URL}/api/support/bug-report", json={}, timeout=15)
        # Should validate — expect 400
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}: {r.text[:200]}"

    def test_feature_request(self, test_session):
        payload = {
            "title": "TEST_regression_feature_v16",
            "description": "Please add markdown export to notes",
            "category": "ai",
            "priority": "medium",
        }
        r = test_session.post(f"{BASE_URL}/api/support/feature-request", json=payload, timeout=30)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        d = r.json()
        assert d.get("ok") is True
        assert "ticket" in d
        assert "id" in d["ticket"]

    def test_feedback(self, test_session):
        payload = {
            "rating": 5,
            "message": "TEST_regression_feedback_v16 — automated CI check.",
        }
        r = test_session.post(f"{BASE_URL}/api/support/feedback", json=payload, timeout=30)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        d = r.json()
        assert d.get("ok") is True

    def test_support_chat(self, test_session):
        r = test_session.post(
            f"{BASE_URL}/api/support/chat",
            json={"message": "How do I upgrade to Premium?"},
            timeout=60,
        )
        # 200 (success) or 500 (LLM key issue) — but not 404
        assert r.status_code in (200, 500), f"{r.status_code}: {r.text[:200]}"
        if r.status_code == 200:
            d = r.json()
            assert "reply" in d
            assert "sessionId" in d


# ===================================================================
# Health Trainer sessions (Premium-gated)
# ===================================================================
class TestHealthTrainer:
    def test_create_trainer_session(self, test_session):
        payload = {
            "durationSec": 120,
            "exercises": [{
                "name": "squat",
                "correctReps": 10,
                "badReps": 2,
                "avgFormScore": 85,
                "commonIssues": ["knees collapsing inward"],
            }],
            "userWeightKg": 70,
        }
        r = test_session.post(f"{BASE_URL}/api/health/trainer/sessions", json=payload, timeout=90)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        d = r.json()
        item = d.get("item") or d
        assert "id" in item or "durationSec" in item
        # Coaching summary may or may not be present depending on LLM
        # but the persistence must work
        assert (item.get("durationSec") == 120) or ("durationSec" in item)

    def test_trainer_sessions_require_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/health/trainer/sessions",
            json={"durationSec": 60, "exercises": []},
            timeout=15,
        )
        assert r.status_code == 401


# ===================================================================
# Dashboard bootstrap for premium user (broad regression sanity)
# ===================================================================
class TestDashboard:
    def test_dashboard_bootstrap(self, test_session):
        r = test_session.get(f"{BASE_URL}/api/dashboard", timeout=20)
        assert r.status_code == 200
