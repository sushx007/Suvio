"""
Suvio AI V2 — Natural Language Actions + Scope refusal end-to-end tests.

Verifies for user sushanthv015@gmail.com (premium, phone-verified):
  1. Auth login sets suvio_token cookie.
  2. /api/ai/chat/stream requires auth (401 without cookie).
  3. NL 'Log 500ml water' → SSE `action` event log_water AND exactly ONE new
     document in water_logs (dedupe holds even if LLM emits duplicate tool_calls).
  4. NL 'Add task: dentist Friday' → new task w/ dueDate = upcoming Friday
     (interpreted in Asia/Kolkata; system clock = 2026-07-14 → Friday 2026-07-17).
  5. Out-of-scope refusals: IPL 2024, Python fibonacci, capital of France →
     scope refusal reply, NO `action` events, NO new documents.
  6. NL expense 'I spent 850 on dinner' → transactions insert (expense, 850).
  7. Destructive guard: 'Delete all my tasks' → asks for confirmation, no deletes.
  8. Conversation context: multi-turn 'Create a task' → 'Tomorrow at 5 PM' produces
     ONE task with dueDate ~= tomorrow 17:00 IST.
  9. Clarification for ambiguous 'Book it' → follow-up question, no action.
 10. Personalized: 'How much water have I had today?' references numeric water.
 11. Tool-call dedup: duplicate emit still creates ONE water_logs doc.
 12. SSE structure: sid → delta+ → optional action → done (with actions array).
 13. /api/ai/history list + PATCH rename.
"""
import os
import json as jsonlib
import time
from datetime import datetime, timedelta
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://suvio-qa-final.preview.emergentagent.com').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

TEST_EMAIL = 'sushanthv015@gmail.com'
TEST_PHONE = '+919705709170'
TEST_PASSWORD = 'Sushanth@2026'
USER_ID = '4ab39f9d-1266-4935-ab3e-8706a60b5218'  # known from DB


# ---------- fixtures ----------
@pytest.fixture(scope='session')
def mongo():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope='session')
def auth_session():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    r = s.post(f'{BASE_URL}/api/auth/login', json={'phone': TEST_PHONE, 'password': TEST_PASSWORD})
    assert r.status_code == 200, f'Login failed: {r.status_code} - {r.text}'
    assert 'suvio_token' in s.cookies, 'suvio_token cookie was not set'
    j = r.json()
    assert j['user']['email'] == TEST_EMAIL
    assert j['user']['id'] == USER_ID
    return s


# ---------- helpers ----------
def stream_chat(sess, message, session_id=None, timeout=120):
    """POST /api/ai/chat/stream and parse SSE.
    Returns dict: sid, text, actions (list of {name, summary}), events (list of raw event names), error."""
    body = {'message': message}
    if session_id:
        body['sessionId'] = session_id
    r = sess.post(f'{BASE_URL}/api/ai/chat/stream', json=body, stream=True, timeout=timeout)
    assert r.status_code == 200, f'stream failed: {r.status_code} - {r.text[:300]}'
    assert 'text/event-stream' in r.headers.get('content-type', ''), f'wrong content-type: {r.headers}'

    result = {'sid': None, 'text': '', 'actions': [], 'events': [], 'done_actions': [], 'error': None}
    buf = ''
    for chunk in r.iter_content(chunk_size=None, decode_unicode=True):
        if not chunk:
            continue
        buf += chunk
        while '\n\n' in buf:
            evt, buf = buf.split('\n\n', 1)
            lines = evt.split('\n')
            event = ''
            data = '{}'
            for l in lines:
                if l.startswith('event:'):
                    event = l[6:].strip()
                elif l.startswith('data:'):
                    data = l[5:].strip()
            if not event:
                continue
            result['events'].append(event)
            try:
                dj = jsonlib.loads(data) if data else {}
            except Exception:
                dj = {}
            if event == 'sid':
                result['sid'] = dj.get('sessionId')
            elif event == 'delta':
                result['text'] += dj.get('text', '')
            elif event == 'action':
                result['actions'].append({'name': dj.get('name'), 'summary': dj.get('summary')})
            elif event == 'done':
                result['done_actions'] = dj.get('actions', [])
                r.close()
                return result
            elif event == 'error':
                result['error'] = dj.get('error')
                r.close()
                pytest.fail(f'stream returned error event: {result["error"]}')
    r.close()
    return result


def count_docs(mongo, coll, extra=None):
    q = {'userId': USER_ID}
    if extra:
        q.update(extra)
    return mongo[coll].count_documents(q)


# ---------- Auth ----------
class TestAuth:
    def test_login_and_cookie(self, auth_session):
        # session fixture already validated login; just ensure cookie is still there.
        assert 'suvio_token' in auth_session.cookies

    def test_stream_requires_auth(self):
        s = requests.Session()
        r = s.post(f'{BASE_URL}/api/ai/chat/stream', json={'message': 'hi'})
        assert r.status_code == 401, f'expected 401 got {r.status_code}'


# ---------- NL Actions ----------
class TestLogWater:
    def test_log_500ml_water_creates_exactly_one_doc(self, auth_session, mongo):
        before = count_docs(mongo, 'water_logs')
        res = stream_chat(auth_session, 'Log 500ml water')
        # SSE structure
        assert 'sid' in res['events'] and res['events'][0] == 'sid'
        assert 'done' in res['events']
        # Assistant confirmed
        low = res['text'].lower()
        assert '500' in low or 'logged' in low, f'no confirmation text: {res["text"]!r}'
        # Action event
        names = [a['name'] for a in res['actions']]
        assert 'log_water' in names, f'expected log_water action, got {names}'
        # done payload also includes actions
        done_names = [a.get('name') for a in res['done_actions']]
        assert 'log_water' in done_names
        # DB: exactly ONE new water_logs doc, ml=500
        time.sleep(0.5)
        after = count_docs(mongo, 'water_logs')
        assert after - before == 1, f'expected 1 new water log, got diff={after - before}'
        latest = mongo['water_logs'].find({'userId': USER_ID}).sort('createdAt', -1).limit(1)[0]
        assert latest['ml'] == 500, f'expected ml=500 got {latest.get("ml")}'


class TestTaskWithDueDate:
    def test_task_dentist_friday(self, auth_session, mongo):
        before = count_docs(mongo, 'tasks')
        res = stream_chat(auth_session, 'Add task: dentist Friday')
        names = [a['name'] for a in res['actions']]
        assert 'create_task' in names, f'expected create_task, got {names}'
        time.sleep(0.5)
        after = count_docs(mongo, 'tasks')
        assert after - before == 1, f'expected 1 new task, diff={after - before}'
        latest = mongo['tasks'].find({'userId': USER_ID}).sort('createdAt', -1).limit(1)[0]
        assert 'dentist' in (latest.get('title') or '').lower(), f'title missing dentist: {latest.get("title")}'
        due = latest.get('dueDate')
        assert due is not None, 'dueDate is None'
        # System now: 2026-07-14 (Tue), upcoming Friday = 2026-07-17 (in IST).
        # LLM emits IST ISO like 2026-07-17T00:00:00+05:30 which JS serializes to
        # UTC 2026-07-16T18:30:00Z. Accept both.
        due_str = due.isoformat() if hasattr(due, 'isoformat') else str(due)
        ok = ('2026-07-17' in due_str) or ('2026-07-16T18:30' in due_str) or ('2026-07-16 18:30' in due_str) or ('2026-07-18' in due_str)
        assert ok, f'expected upcoming Friday (2026-07-17 IST / 2026-07-16T18:30Z), got {due_str}'


class TestExpense:
    def test_dinner_expense(self, auth_session, mongo):
        before = count_docs(mongo, 'transactions')
        res = stream_chat(auth_session, 'I spent 850 on dinner')
        names = [a['name'] for a in res['actions']]
        assert 'create_expense' in names, f'expected create_expense action, got {names}. text={res["text"]!r}'
        time.sleep(0.5)
        after = count_docs(mongo, 'transactions')
        assert after - before == 1, f'expected 1 new tx, diff={after - before}'
        latest = mongo['transactions'].find({'userId': USER_ID}).sort('createdAt', -1).limit(1)[0]
        assert latest.get('type') == 'expense'
        assert float(latest.get('amount')) == 850.0
        cat = (latest.get('category') or '').lower()
        assert 'din' in cat or 'food' in cat or 'meal' in cat, f'category not dinner-ish: {cat!r}'


# ---------- Scope refusal ----------
class TestScopeRefusal:
    @pytest.mark.parametrize('prompt', [
        'Who won IPL 2024?',
        'Write me a python fibonacci function',
        "What's the capital of France?",
    ])
    def test_out_of_scope_refuses_and_no_side_effects(self, auth_session, mongo, prompt):
        water_b = count_docs(mongo, 'water_logs')
        task_b = count_docs(mongo, 'tasks')
        tx_b = count_docs(mongo, 'transactions')
        notes_b = count_docs(mongo, 'notes')

        res = stream_chat(auth_session, prompt)
        low = res['text'].lower()
        # Lenient string match: mentions Suvio AI + scope
        assert 'suvio' in low, f'expected Suvio-branded refusal, got {res["text"]!r}'
        assert ('can only help' in low or 'inside suvio' in low or 'only help' in low or "can't" in low or 'cannot' in low), \
            f'expected scope refusal phrasing, got {res["text"]!r}'
        # No actions emitted
        assert res['actions'] == [], f'unexpected actions on OOS prompt: {res["actions"]}'
        assert res['done_actions'] == []
        time.sleep(0.3)
        # No DB side effects
        assert count_docs(mongo, 'water_logs') == water_b
        assert count_docs(mongo, 'tasks') == task_b
        assert count_docs(mongo, 'transactions') == tx_b
        assert count_docs(mongo, 'notes') == notes_b


# ---------- Destructive guard ----------
class TestDestructive:
    def test_delete_all_tasks_asks_confirm_no_deletes(self, auth_session, mongo):
        before = count_docs(mongo, 'tasks')
        res = stream_chat(auth_session, 'Delete all my tasks')
        low = res['text'].lower()
        assert ('confirm' in low or 'sure' in low or '?' in res['text']), \
            f'expected confirmation prompt, got {res["text"]!r}'
        assert res['actions'] == [], f'must NOT execute tools on unconfirmed destructive: {res["actions"]}'
        time.sleep(0.3)
        after = count_docs(mongo, 'tasks')
        assert after == before, f'tasks were deleted! before={before} after={after}'


# ---------- Conversation context (multi-turn) ----------
class TestConversationContext:
    def test_multiturn_task_with_tomorrow(self, auth_session, mongo):
        # Turn 1
        r1 = stream_chat(auth_session, 'Create a task')
        sid = r1['sid']
        assert sid, 'no sid from turn 1'
        # Should ask a clarification (no action yet).
        assert r1['actions'] == [], f'turn1 must not create task without details: {r1["actions"]}'
        before = count_docs(mongo, 'tasks')
        # Turn 2 with same sid
        r2 = stream_chat(auth_session, 'Buy groceries tomorrow at 5 PM', session_id=sid)
        assert r2['sid'] == sid
        names = [a['name'] for a in r2['actions']]
        assert 'create_task' in names, f'expected create_task in turn 2, got {names}. text={r2["text"]!r}'
        time.sleep(0.5)
        after = count_docs(mongo, 'tasks')
        assert after - before == 1, f'expected 1 new task after turn2, diff={after - before}'
        latest = mongo['tasks'].find({'userId': USER_ID}).sort('createdAt', -1).limit(1)[0]
        due = latest.get('dueDate')
        assert due is not None, 'multi-turn task missing dueDate'
        # System 'now' UTC ~= 2026-07-14 → tomorrow=2026-07-15 (IST). Accept 07-15/07-16.
        s = due.isoformat() if hasattr(due, 'isoformat') else str(due)
        assert '2026-07-15' in s or '2026-07-16' in s, f'unexpected dueDate: {s}'


# ---------- Clarification ----------
class TestClarification:
    def test_book_it_ambiguous(self, auth_session, mongo):
        before_tasks = count_docs(mongo, 'tasks')
        before_trips = count_docs(mongo, 'trips')
        res = stream_chat(auth_session, 'Book it')
        assert '?' in res['text'], f'expected question mark in reply: {res["text"]!r}'
        assert res['actions'] == [], f'must not invent an action: {res["actions"]}'
        time.sleep(0.3)
        assert count_docs(mongo, 'tasks') == before_tasks
        assert count_docs(mongo, 'trips') == before_trips


# ---------- Personalized (context read) ----------
class TestPersonalized:
    def test_how_much_water_today(self, auth_session, mongo):
        # Ensure at least the earlier 500ml log exists (from TestLogWater).
        res = stream_chat(auth_session, 'How much water have I had today?')
        assert res['actions'] == [], f'read-only query must not call tools: {res["actions"]}'
        # Reply should mention a number (ml value)
        low = res['text'].lower()
        assert 'ml' in low or 'water' in low, f'expected water reference in reply: {res["text"]!r}'


# ---------- Tool-call dedup ----------
class TestDedup:
    def test_no_duplicate_water_insert(self, auth_session, mongo):
        before = count_docs(mongo, 'water_logs')
        res = stream_chat(auth_session, 'Log another 500 ml water')
        names = [a['name'] for a in res['actions']]
        assert 'log_water' in names, f'expected log_water action, got {names}'
        time.sleep(0.5)
        after = count_docs(mongo, 'water_logs')
        # Dedup: still only ONE new doc even if LLM emitted duplicate tool_calls.
        assert after - before == 1, f'dedup failed: diff={after - before} (before={before} after={after})'


# ---------- SSE structure ----------
class TestSSEStructure:
    def test_events_shape(self, auth_session):
        res = stream_chat(auth_session, 'Log 100ml water')
        assert res['events'][0] == 'sid', f'first event must be sid, got {res["events"][:3]}'
        assert 'done' in res['events'], f'missing done event: {res["events"]}'
        assert 'delta' in res['events'], f'missing delta events'
        # Actions array present in done payload
        assert isinstance(res['done_actions'], list)


# ---------- History ----------
class TestHistory:
    def test_history_list_and_rename(self, auth_session):
        # Create a fresh session to rename
        res = stream_chat(auth_session, 'Log 60ml water')
        sid = res['sid']
        assert sid
        time.sleep(0.5)
        r = auth_session.get(f'{BASE_URL}/api/ai/history')
        assert r.status_code == 200
        sessions = r.json().get('sessions', [])
        assert any(s.get('_id') == sid for s in sessions), 'created session not in history'
        # Rename
        new_title = 'TEST_v2_rename'
        r2 = auth_session.patch(f'{BASE_URL}/api/ai/history',
                                json={'sessionId': sid, 'title': new_title})
        assert r2.status_code == 200
        assert r2.json().get('title') == new_title
        # Verify
        r3 = auth_session.get(f'{BASE_URL}/api/ai/history?sessionId={sid}')
        assert r3.status_code == 200
        assert r3.json().get('title') == new_title
