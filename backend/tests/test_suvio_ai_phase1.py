"""
Backend tests for Suvio AI Phase 1 upgrades.
Covers: auth login, /api/ai/chat/stream (SSE), /api/ai/history (GET/PATCH/DELETE),
auth guard, /api/support/status.
"""
import os
import json as jsonlib
import time
import re
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://suvio-qa-final.preview.emergentagent.com').rstrip('/')
TEST_PHONE = '+15551234567'
TEST_PASSWORD = 'Test1234!'


# ---------- fixtures ----------
@pytest.fixture(scope='session')
def api():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


@pytest.fixture(scope='session')
def auth_session():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    r = s.post(f'{BASE_URL}/api/auth/login', json={'phone': TEST_PHONE, 'password': TEST_PASSWORD})
    assert r.status_code == 200, f'Login failed: {r.status_code} - {r.text}'
    assert 'suvio_token' in s.cookies, 'suvio_token cookie was not set'
    return s


@pytest.fixture(scope='session')
def created_session_id(auth_session):
    """Create at least one AI session to ensure history has data."""
    sid, text, done = _stream_chat(auth_session, 'Hello Suvio!', session_id=None)
    assert sid, 'Failed to obtain sessionId from stream'
    assert done, 'Stream did not finish'
    # Give MongoDB a moment to persist the insertMany from the stream finalizer
    time.sleep(0.5)
    return sid


# ---------- helpers ----------
def _stream_chat(sess, message, session_id=None, timeout=90):
    """POST /api/ai/chat/stream and parse SSE. Returns (sessionId, assembled_text, saw_done)."""
    body = {'message': message}
    if session_id:
        body['sessionId'] = session_id
    r = sess.post(f'{BASE_URL}/api/ai/chat/stream', json=body, stream=True, timeout=timeout)
    assert r.status_code == 200, f'stream failed: {r.status_code} - {r.text[:300]}'
    assert 'text/event-stream' in r.headers.get('content-type', ''), f'wrong content-type: {r.headers}'
    sid = None
    assembled = ''
    saw_done = False
    saw_error = None
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
            try:
                dj = jsonlib.loads(data) if data else {}
            except Exception:
                dj = {}
            if event == 'sid':
                sid = dj.get('sessionId')
            elif event == 'delta':
                assembled += dj.get('text', '')
            elif event == 'done':
                saw_done = True
            elif event == 'error':
                saw_error = dj.get('error')
        if saw_done or saw_error:
            break
    r.close()
    if saw_error:
        pytest.fail(f'stream returned error: {saw_error}')
    return sid, assembled, saw_done


def _stream_chat_sid(sess, message, session_id=None):
    sid, _, _ = _stream_chat(sess, message, session_id=session_id)
    return sid


# override single-return helper alias so fixture works
_stream_chat.__name__ = '_stream_chat'


# ---------- Health endpoint ----------
class TestSupportStatus:
    def test_status_all_systems(self, api):
        r = api.get(f'{BASE_URL}/api/support/status')
        assert r.status_code == 200
        data = r.json()
        assert data['overall'] == 'all_systems_normal', data
        assert data['checks']['aiAssistant'] == 'operational', data


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self, api):
        r = api.post(f'{BASE_URL}/api/auth/login', json={'phone': TEST_PHONE, 'password': TEST_PASSWORD})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j['user']['phone'] == TEST_PHONE
        assert 'suvio_token' in r.cookies

    def test_login_invalid(self, api):
        r = api.post(f'{BASE_URL}/api/auth/login', json={'phone': TEST_PHONE, 'password': 'wrong'})
        assert r.status_code in (401, 400)

    def test_ai_stream_requires_auth(self, api):
        unauth = requests.Session()
        r = unauth.post(f'{BASE_URL}/api/ai/chat/stream', json={'message': 'hi'})
        assert r.status_code == 401, f'Expected 401, got {r.status_code}: {r.text[:200]}'


# ---------- Streaming / SSE ----------
class TestAiStream:
    def test_stream_returns_sid_and_deltas(self, auth_session):
        sid, text, done = _stream_chat(auth_session, 'Reply with the single word: hello')
        assert sid, 'no sessionId event received'
        assert len(text) > 0, 'no delta text received'
        assert done, 'no done event received'

    def test_stream_reuses_session(self, auth_session, created_session_id):
        sid2, text2, done2 = _stream_chat(auth_session, 'What did I just say?', session_id=created_session_id)
        assert sid2 == created_session_id, f'expected same sid {created_session_id}, got {sid2}'
        assert done2

    def test_stream_missing_message(self, auth_session):
        r = auth_session.post(f'{BASE_URL}/api/ai/chat/stream', json={})
        assert r.status_code == 400


# ---------- History ----------
class TestAiHistory:
    def test_list_sessions_shape(self, auth_session, created_session_id):
        r = auth_session.get(f'{BASE_URL}/api/ai/history')
        assert r.status_code == 200
        data = r.json()
        assert 'sessions' in data
        assert isinstance(data['sessions'], list)
        assert len(data['sessions']) >= 1
        found = next((s for s in data['sessions'] if s['_id'] == created_session_id), None)
        assert found is not None, f'created session {created_session_id} not in list'
        assert 'first' in found
        assert 'title' in found  # may be None

    def test_get_session_items(self, auth_session, created_session_id):
        r = auth_session.get(f'{BASE_URL}/api/ai/history?sessionId={created_session_id}')
        assert r.status_code == 200
        data = r.json()
        assert 'items' in data and isinstance(data['items'], list)
        assert 'title' in data
        assert len(data['items']) >= 2  # user + assistant
        assert data['items'][0]['role'] == 'user'
        assert data['items'][1]['role'] == 'assistant'
        # Ensure _id was excluded (MongoDB projection)
        assert '_id' not in data['items'][0]

    def test_rename_session_and_verify(self, auth_session, created_session_id):
        new_title = 'TEST_renamed_convo'
        r = auth_session.patch(f'{BASE_URL}/api/ai/history',
                               json={'sessionId': created_session_id, 'title': new_title})
        assert r.status_code == 200, r.text
        assert r.json()['title'] == new_title
        # Verify via GET
        r2 = auth_session.get(f'{BASE_URL}/api/ai/history?sessionId={created_session_id}')
        assert r2.json()['title'] == new_title
        # Verify list also reflects
        r3 = auth_session.get(f'{BASE_URL}/api/ai/history')
        found = next((s for s in r3.json()['sessions'] if s['_id'] == created_session_id), None)
        assert found and found['title'] == new_title

    def test_rename_empty_title_fails(self, auth_session, created_session_id):
        r = auth_session.patch(f'{BASE_URL}/api/ai/history',
                               json={'sessionId': created_session_id, 'title': '   '})
        assert r.status_code == 400

    def test_delete_session_removes_data(self, auth_session):
        # Create a fresh session to delete
        sid, _, _ = _stream_chat(auth_session, 'This will be deleted')
        assert sid
        r = auth_session.delete(f'{BASE_URL}/api/ai/history?sessionId={sid}')
        assert r.status_code == 200
        # Ensure items empty on subsequent GET
        r2 = auth_session.get(f'{BASE_URL}/api/ai/history?sessionId={sid}')
        assert r2.status_code == 200
        assert r2.json()['items'] == []
        # Ensure not in list
        r3 = auth_session.get(f'{BASE_URL}/api/ai/history')
        assert not any(s['_id'] == sid for s in r3.json()['sessions'])


# ---------- Intent behaviour (lenient) ----------
class TestAiIntent:
    def test_expense_offer(self, auth_session):
        _, text, _ = _stream_chat(auth_session, 'I spent Rs 500 on lunch today')
        low = text.lower()
        assert ('expense' in low or 'log' in low), f'expected expense/log offer in reply: {text!r}'

    def test_clarification_question(self, auth_session):
        _, text, _ = _stream_chat(auth_session, 'add a task')
        assert '?' in text, f'expected a follow-up question, got: {text!r}'

    def test_destructive_confirm(self, auth_session):
        _, text, _ = _stream_chat(auth_session, 'delete all my tasks')
        low = text.lower()
        assert 'confirm' in low or '?' in text or 'sure' in low, f'expected confirmation prompt: {text!r}'
