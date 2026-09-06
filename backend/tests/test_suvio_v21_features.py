"""
Suvio V2.1 feature-set backend tests.
- Global timezone support in reminders/settings + immediate recurring enqueue
- Cron worker endpoint (public secret-authenticated) at /api/cron/reminders
- AI Personal Trainer session CRUD (POST, GET, DELETE)
- Plan status: premium lifetime for phone 9705709170
- OTP send endpoint dev-mode fallback
- Code-verified: schedule_phone_call timezone + processReminder retry
"""
import os
import time
import jwt
import pytest
import requests
from datetime import datetime, timezone
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://suvio-extended.preview.emergentagent.com').rstrip('/')
JWT_SECRET = 'suvio-dev-secret-please-change-in-prod'
CRON_SECRET = 'suvio-cron-secret-dev'
USER_ID = '7e36ab22-9875-4747-922d-912f7e5a820f'
USER_EMAIL = 'sushanth6313@gmail.com'
USER_PHONE = '+919705709170'
MONGO_URL = 'mongodb://localhost:27017'
DB_NAME = 'test_database'


def _make_token():
    return jwt.encode(
        {'id': USER_ID, 'email': USER_EMAIL, 'name': 'Sushanth', 'phone': USER_PHONE},
        JWT_SECRET,
        algorithm='HS256',
    )


@pytest.fixture(scope='session')
def token():
    return _make_token()


@pytest.fixture(scope='session')
def client(token):
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    s.cookies.set('suvio_token', token, domain='suvio-extended.preview.emergentagent.com')
    return s


@pytest.fixture(scope='session')
def db():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


# ---------------- Plan status ----------------
class TestPlanStatus:
    def test_plan_premium_lifetime(self, client):
        r = client.get(f'{BASE_URL}/api/plan/status')
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get('tier') == 'premium', d
        gates = d.get('gates') or d.get('features') or d
        # Check all gates true
        for k in ['waterReminderCalls', 'mealReminderCalls', 'workoutReminderCalls',
                  'aiWorkoutPlan', 'aiDietPlan', 'bodyAnalysis']:
            # gates may be nested under different structure - check anywhere in payload
            val = None
            if isinstance(gates, dict) and k in gates:
                val = gates[k]
            elif k in d:
                val = d[k]
            assert val is True, f"gate {k} not true; full={d}"
        # Task limit unlimited
        limit = d.get('taskReminderCallsLimit')
        if limit is None:
            limit = (d.get('usage') or {}).get('taskReminderCallsLimit')
        if limit is None:
            limit = (d.get('limits') or {}).get('taskReminderCallsPerMonth')
        assert limit == -1, f"expected -1 for task limit, got {limit}; full={d}"
        # Plan expires far future
        exp = d.get('planExpiresAt') or d.get('expiresAt')
        assert exp is not None, d
        year = int(str(exp)[:4])
        assert year >= 2099, f"expires year {year}"


# ---------------- Reminder settings + timezone ----------------
class TestReminderSettings:
    def test_get_settings_has_timezone_and_phone(self, client):
        r = client.get(f'{BASE_URL}/api/reminders/settings')
        assert r.status_code == 200, r.text
        d = r.json()
        assert 'settings' in d
        assert 'timezone' in d['settings']
        assert d.get('phone') == USER_PHONE
        assert d.get('phoneVerified') is True

    def test_put_settings_timezone_ny_meals_workout(self, client, db):
        # Clear existing queue for user to make assertion clean
        db.reminder_queue.delete_many({'userId': USER_ID})
        payload = {
            'taskFollowup': {'enabled': True, 'hoursBefore': 2, 'retryOnOverdue': True},
            'water': {'enabled': False, 'frequencyMinutes': 60, 'startHour': 9, 'endHour': 21,
                      'days': ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], 'paused': False},
            'meals': {'enabled': True, 'breakfast': '08:00', 'lunch': '13:00',
                      'dinner': '20:00', 'snacks': [], 'paused': False},
            'workout': {'enabled': True, 'days': ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
                        'time': '18:00', 'minutesBefore': 10, 'paused': False},
            'vacationMode': False,
            'timezone': 'America/New_York',
        }
        r = client.put(f'{BASE_URL}/api/reminders/settings', json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get('ok') is True
        assert d['settings']['timezone'] == 'America/New_York'
        # Give the immediate scheduleRecurringForUser time to complete
        time.sleep(1.5)
        # Verify meal reminders in queue with NY-local scheduledFor
        meals = list(db.reminder_queue.find({'userId': USER_ID, 'type': 'meal'}))
        assert len(meals) >= 1, f"expected meal reminders enqueued; found {len(meals)}"
        # For each meal reminder, verify UTC time matches NY breakfast/lunch/dinner
        import zoneinfo
        ny = zoneinfo.ZoneInfo('America/New_York')
        expected_hours = {'breakfast': 8, 'lunch': 13, 'dinner': 20}
        for m in meals:
            key = m.get('purposeKey', '')
            meal_name = key.split('_')[1].split(':')[0] if 'meal_' in key else None
            if meal_name in expected_hours:
                sched = m['scheduledFor']
                if sched.tzinfo is None:
                    sched = sched.replace(tzinfo=timezone.utc)
                ny_local = sched.astimezone(ny)
                assert ny_local.hour == expected_hours[meal_name], (
                    f"{meal_name} @ {ny_local} expected hour {expected_hours[meal_name]}"
                )
        # Verify workout reminders too
        workouts = list(db.reminder_queue.find({'userId': USER_ID, 'type': 'workout'}))
        assert len(workouts) >= 1, "expected workout reminders enqueued"


# ---------------- Cron worker ----------------
class TestCronWorker:
    def test_cron_no_auth_401(self):
        r = requests.post(f'{BASE_URL}/api/cron/reminders')
        assert r.status_code == 401, r.text

    def test_cron_wrong_secret_401(self):
        r = requests.post(f'{BASE_URL}/api/cron/reminders',
                          headers={'Authorization': 'Bearer wrong'})
        assert r.status_code == 401, r.text

    def test_cron_correct_secret_200_public(self):
        # No cookie/session; only Bearer secret
        r = requests.post(f'{BASE_URL}/api/cron/reminders',
                          headers={'Authorization': f'Bearer {CRON_SECRET}'})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get('ok') is True
        assert 'processed' in d
        assert 'scheduled' in d
        assert isinstance(d['processed'], int)
        assert isinstance(d['scheduled'], int)


# ---------------- AI Personal Trainer session ----------------
class TestTrainerSessions:
    session_id = None

    def test_create_session(self, client, db):
        payload = {
            'durationSec': 600,
            'userWeightKg': 72,
            'exercises': [
                {'name': 'pushup', 'correctReps': 20, 'badReps': 2, 'avgFormScore': 85,
                 'commonIssues': ['elbows flaring']},
                {'name': 'squat', 'correctReps': 25, 'badReps': 1, 'avgFormScore': 90,
                 'commonIssues': []},
            ],
            'notes': 'TEST_v21 session',
        }
        r = client.post(f'{BASE_URL}/api/health/trainer/sessions', json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        item = d['item']
        assert 'id' in item
        assert item['totalCorrectReps'] == 45
        assert item['formScore'] > 0
        assert item['estimatedKcal'] > 0
        assert len(item['exercises']) == 2
        TestTrainerSessions.session_id = item['id']
        # Verify persisted
        doc = db.trainer_sessions.find_one({'id': item['id']})
        assert doc is not None

    def test_get_sessions_includes_created(self, client):
        r = client.get(f'{BASE_URL}/api/health/trainer/sessions')
        assert r.status_code == 200, r.text
        d = r.json()
        ids = [s['id'] for s in d.get('items', [])]
        assert TestTrainerSessions.session_id in ids

    def test_delete_bogus_404(self, client):
        r = client.delete(f'{BASE_URL}/api/health/trainer/sessions/does-not-exist-123')
        assert r.status_code == 404, r.text

    def test_delete_session(self, client, db):
        sid = TestTrainerSessions.session_id
        assert sid, 'session_id must be set by earlier test'
        # Get baseline count
        r0 = client.get(f'{BASE_URL}/api/health/trainer/sessions')
        c0 = len(r0.json().get('items', []))
        r = client.delete(f'{BASE_URL}/api/health/trainer/sessions/{sid}')
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get('ok') is True
        assert d.get('deleted') == sid
        # Verify count decremented
        r1 = client.get(f'{BASE_URL}/api/health/trainer/sessions')
        c1 = len(r1.json().get('items', []))
        assert c1 == c0 - 1
        # Verify DB
        assert db.trainer_sessions.find_one({'id': sid}) is None


# ---------------- OTP ----------------
class TestOtpSend:
    def test_otp_send_dev_mode(self, client):
        r = client.post(f'{BASE_URL}/api/auth/phone/send', json={'phone': USER_PHONE})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get('ok') is True
        # devMode should be truthy since TWILIO env not configured in dev
        assert 'devMode' in d or 'status' in d


# ---------------- Non-premium plan gate (code path verification) ----------------
class TestNonPremiumGate:
    """We do not have a non-premium user seeded. Verify by creating one via signup,
    then testing PUT /api/reminders/settings rejects premium features."""

    def test_meals_workout_rejected_for_free_user(self, db):
        # Seed a temp free user directly in DB
        import uuid as _uuid
        tmp_id = str(_uuid.uuid4())
        db.users.insert_one({
            'id': tmp_id, 'email': f'TEST_free_{tmp_id[:8]}@example.com',
            'name': 'TEST Free', 'phone': '+911111111111', 'phoneVerified': True,
            'planTier': 'free', 'createdAt': datetime.utcnow(),
        })
        try:
            tok = jwt.encode({'id': tmp_id, 'email': f'TEST_free@example.com',
                              'name': 'TEST Free', 'phone': '+911111111111'},
                             JWT_SECRET, algorithm='HS256')
            s = requests.Session()
            s.headers.update({'Content-Type': 'application/json'})
            s.cookies.set('suvio_token', tok, domain='suvio-extended.preview.emergentagent.com')
            # meals enabled → expect 402
            r = s.put(f'{BASE_URL}/api/reminders/settings',
                      json={'meals': {'enabled': True, 'breakfast': '08:00'},
                            'timezone': 'Asia/Kolkata'})
            assert r.status_code == 402, r.text
            # workout enabled → 402
            r2 = s.put(f'{BASE_URL}/api/reminders/settings',
                       json={'workout': {'enabled': True, 'time': '18:00', 'days': ['Mon']},
                             'timezone': 'Asia/Kolkata'})
            assert r2.status_code == 402, r2.text
            # water enabled → 402 (requires Pro+)
            r3 = s.put(f'{BASE_URL}/api/reminders/settings',
                       json={'water': {'enabled': True, 'frequencyMinutes': 60,
                                       'startHour': 9, 'endHour': 21,
                                       'days': ['Mon'], 'paused': False},
                             'timezone': 'Asia/Kolkata'})
            assert r3.status_code == 402, r3.text
        finally:
            db.users.delete_one({'id': tmp_id})


# ---------------- Static code verifications (tools.js tz + retry) ----------------
class TestCodeVerifications:
    def test_tools_js_uses_user_tz(self):
        with open('/app/frontend/lib/tools.js') as f:
            src = f.read()
        assert "u.reminderSettings?.timezone || u.preferences?.timezone" in src
        assert '{ timeZone: userTz' in src or 'timeZone: userTz' in src
        assert 'schedule_phone_call' in src

    def test_scheduler_retry_max_3(self):
        with open('/app/frontend/lib/scheduler.js') as f:
            src = f.read()
        assert 'MAX_ATTEMPTS = 3' in src
        assert 'nextRetryAt' in src
        # Retry keeps status pending until MAX_ATTEMPTS
        assert "shouldRetry ? 'pending' : 'failed'" in src

    def test_workout_page_has_ai_trainer_section(self):
        with open('/app/frontend/app/dashboard/health/workout/page.js') as f:
            src = f.read()
        assert 'ai-trainer-section' in src
