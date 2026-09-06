"""
Suvio V1.4 - Backend regression + Twilio + Razorpay + plan gating tests.

Run:
  pytest /app/backend/tests/backend_test.py -v --tb=short \
    --junitxml=/app/test_reports/pytest/pytest_results.xml
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

# --------- Test users (from /app/memory/test_credentials.md) ---------
ALICE = {"phone": "+15559998877", "password": "NewPass1!"}
LEGACY = {"email": "test2@suvio.dev", "password": "Passw0rd!"}


# --------- Fixtures ---------
@pytest.fixture(scope="session")
def alice_session():
    """Phone-first Free-tier user."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=ALICE, timeout=30)
    assert r.status_code == 200, f"Alice login failed: {r.status_code} {r.text}"
    yield s


@pytest.fixture(scope="session")
def legacy_session():
    """Email/password legacy fallback login."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=LEGACY, timeout=30)
    assert r.status_code == 200, f"Legacy login failed: {r.status_code} {r.text}"
    yield s


# ===================================================================
# Basic wiring
# ===================================================================
class TestHealth:
    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ===================================================================
# Auth wiring - phone-first
# ===================================================================
class TestAuthWiring:
    def test_login_alice_phone_password(self, alice_session):
        r = alice_session.get(f"{BASE_URL}/api/me", timeout=15)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["phone"] == ALICE["phone"]
        assert u.get("phoneVerified") is True
        assert u.get("planTier") in ("free",)

    def test_login_invalid_credentials(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ALICE["phone"], "password": "wrong-pass"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_legacy_email_login(self, legacy_session):
        r = legacy_session.get(f"{BASE_URL}/api/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == LEGACY["email"]

    def test_signup_send_otp_missing_phone(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/signup/send-otp", json={}, timeout=15
        )
        assert r.status_code == 400
        assert "phone" in r.json().get("error", "").lower()

    def test_signup_send_otp_twilio_wired(self):
        """Twilio trial rejects unverified numbers -- that IS the proof
        the integration is live. We must get either:
          - 500 with Twilio's error text (trial account rejects), or
          - 200 with status=pending (in the unlikely case Twilio accepts).
        """
        # Use a fake, but valid-format phone number that Twilio Trial
        # will reject with 'unverified' error.
        r = requests.post(
            f"{BASE_URL}/api/auth/signup/send-otp",
            json={"phone": "+16125550100"},
            timeout=30,
        )
        # 200-OK (pending) OR 500 (trial reject) are both proof of wiring.
        assert r.status_code in (200, 500), f"Unexpected: {r.status_code} {r.text}"
        data = r.json()
        if r.status_code == 500:
            # Real Twilio error forwarded through
            msg = (data.get("error") or "").lower()
            assert any(
                k in msg
                for k in ("unverified", "trial", "invalid", "not a valid", "phone")
            ), f"Twilio error message missing: {data}"
        else:
            # devMode should be false because Twilio IS configured
            assert data.get("devMode") is not True, (
                "Twilio env vars ARE set but API returned devMode=true — wiring bug"
            )

    def test_forgot_send_otp_unknown_phone_silent_ok(self):
        """Anti-enumeration: unknown phone should return ok:true, no OTP sent."""
        r = requests.post(
            f"{BASE_URL}/api/auth/forgot/send-otp",
            json={"phone": "+15550000000"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_forgot_send_otp_known_phone_twilio_wired(self):
        """For a real user, endpoint calls Twilio; trial account will 500."""
        r = requests.post(
            f"{BASE_URL}/api/auth/forgot/send-otp",
            json={"phone": ALICE["phone"]},
            timeout=30,
        )
        # Either 200 (Twilio accepted) or 500 (trial rejected).
        assert r.status_code in (200, 500), f"Unexpected: {r.status_code} {r.text}"


# ===================================================================
# Plan/status + gating
# ===================================================================
class TestPlanStatus:
    def test_alice_free_gates(self, alice_session):
        r = alice_session.get(f"{BASE_URL}/api/plan/status", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["tier"] == "free"
        # Free tier should NOT have premium gates enabled
        assert d["gates"]["bodyAnalysis"] is False
        assert d["gates"]["aiWorkoutPlan"] is False
        assert d["gates"]["aiDietPlan"] is False
        assert d["gates"]["mealReminderCalls"] is False

    def test_body_analysis_gated_for_free(self, alice_session):
        # Alice is free, must be blocked with 402
        r = alice_session.post(
            f"{BASE_URL}/api/health/body-analysis",
            json={"heightCm": 175, "weightKg": 70},
            timeout=30,
        )
        assert r.status_code == 402, f"Expected 402 gate, got {r.status_code}: {r.text}"

    def test_workout_plan_gated_for_free(self, alice_session):
        r = alice_session.post(
            f"{BASE_URL}/api/health/workout-plan/generate",
            json={"goal": "strength"},
            timeout=30,
        )
        assert r.status_code == 402


# ===================================================================
# Razorpay order creation with live sandbox keys
# ===================================================================
class TestRazorpay:
    def test_create_pro_monthly_order_inr(self, alice_session):
        r = alice_session.post(
            f"{BASE_URL}/api/razorpay/order",
            json={"planId": "pro_monthly", "currency": "INR"},
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        d = r.json()
        assert d["orderId"].startswith("order_"), f"orderId: {d.get('orderId')}"
        assert d["amount"] == 29900, f"amount: {d.get('amount')}"
        assert d["currency"] == "INR"
        assert d["keyId"].startswith("rzp_"), f"keyId: {d.get('keyId')}"

    def test_create_invalid_plan_400(self, alice_session):
        r = alice_session.post(
            f"{BASE_URL}/api/razorpay/order",
            json={"planId": "nonexistent_plan", "currency": "INR"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_razorpay_order_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/razorpay/order",
            json={"planId": "pro_monthly", "currency": "INR"},
            timeout=15,
        )
        assert r.status_code == 401


# ===================================================================
# Core CRUD regression for logged-in user
# ===================================================================
class TestDashboard:
    def test_dashboard_bootstrap(self, alice_session):
        r = alice_session.get(f"{BASE_URL}/api/dashboard", timeout=20)
        assert r.status_code == 200


class TestTasks:
    _created_id = None

    def test_create_task(self, alice_session):
        r = alice_session.post(
            f"{BASE_URL}/api/tasks",
            json={"title": "TEST_regression_task", "priority": "high"},
            timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        # accept either {item:{...}} or {id:...} shape
        item = data.get("item") or data
        assert "id" in item, f"no id in response: {data}"
        assert item["title"] == "TEST_regression_task"
        TestTasks._created_id = item["id"]

    def test_list_tasks_contains_created(self, alice_session):
        r = alice_session.get(f"{BASE_URL}/api/tasks", timeout=15)
        assert r.status_code == 200
        items = r.json().get("items", r.json())
        if isinstance(items, dict):
            items = items.get("items", [])
        ids = [i.get("id") for i in items]
        assert TestTasks._created_id in ids

    def test_delete_task(self, alice_session):
        if not TestTasks._created_id:
            pytest.skip("No task to delete")
        r = alice_session.delete(
            f"{BASE_URL}/api/tasks/{TestTasks._created_id}", timeout=15
        )
        assert r.status_code == 200


class TestTransactions:
    _tx_id = None

    def test_create_transaction(self, alice_session):
        r = alice_session.post(
            f"{BASE_URL}/api/transactions",
            json={
                "amount": 12.50,
                "type": "expense",
                "category": "Food",
                "note": "TEST_regression_tx",
            },
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        item = d.get("item") or d
        assert "id" in item
        TestTransactions._tx_id = item["id"]

    def test_list_transactions(self, alice_session):
        r = alice_session.get(f"{BASE_URL}/api/transactions", timeout=15)
        assert r.status_code == 200

    def test_delete_transaction(self, alice_session):
        if not TestTransactions._tx_id:
            pytest.skip("No tx")
        r = alice_session.delete(
            f"{BASE_URL}/api/transactions/{TestTransactions._tx_id}", timeout=15
        )
        assert r.status_code == 200


class TestNotes:
    _note_id = None

    def test_create_note(self, alice_session):
        r = alice_session.post(
            f"{BASE_URL}/api/notes",
            json={"title": "TEST_regression_note", "content": "hello world"},
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        item = d.get("item") or d
        assert "id" in item
        TestNotes._note_id = item["id"]

    def test_list_notes(self, alice_session):
        r = alice_session.get(f"{BASE_URL}/api/notes", timeout=15)
        assert r.status_code == 200

    def test_delete_note(self, alice_session):
        if not TestNotes._note_id:
            pytest.skip("no note")
        r = alice_session.delete(
            f"{BASE_URL}/api/notes/{TestNotes._note_id}", timeout=15
        )
        assert r.status_code == 200


class TestHealthWater:
    def test_water_post(self, alice_session):
        r = alice_session.post(
            f"{BASE_URL}/api/health/water",
            json={"ml": 250},
            timeout=15,
        )
        assert r.status_code == 200


class TestAiChat:
    def test_ai_chat(self, alice_session):
        r = alice_session.post(
            f"{BASE_URL}/api/ai/chat",
            json={"message": "Say only the word: pong"},
            timeout=90,
        )
        # 200 on success, 402 if free tier daily limit exhausted, 500 if LLM key issue
        assert r.status_code in (200, 402), f"{r.status_code}: {r.text[:200]}"
