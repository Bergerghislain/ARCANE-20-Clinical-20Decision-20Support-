"""Tests de la logique pure anti-brute-force (domain/login_throttle)."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from backend_fastapi.app.domain.login_throttle import (
  AttemptState,
  is_locked,
  register_failure,
  seconds_until_unlock,
)

NOW = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)


def test_is_locked_false_when_no_state():
  assert is_locked(None, NOW) is False


def test_is_locked_true_when_locked_until_in_future():
  state = AttemptState(locked_until=NOW + timedelta(seconds=60))
  assert is_locked(state, NOW) is True


def test_is_locked_false_when_lock_expired():
  state = AttemptState(locked_until=NOW - timedelta(seconds=1))
  assert is_locked(state, NOW) is False


def test_register_failure_increments_until_threshold():
  s1 = register_failure(None, NOW, max_attempts=3, window_seconds=900, lock_seconds=900)
  assert s1.fail_count == 1 and s1.locked_until is None
  s2 = register_failure(s1, NOW, max_attempts=3, window_seconds=900, lock_seconds=900)
  assert s2.fail_count == 2 and s2.locked_until is None


def test_register_failure_locks_at_threshold():
  s2 = AttemptState(fail_count=2, last_attempt_at=NOW)
  s3 = register_failure(s2, NOW, max_attempts=3, window_seconds=900, lock_seconds=900)
  assert s3.locked_until == NOW + timedelta(seconds=900)
  assert s3.fail_count == 0  # nouveau cycle apres expiration du verrou


def test_register_failure_resets_counter_outside_window():
  old = AttemptState(fail_count=2, last_attempt_at=NOW - timedelta(seconds=1000))
  s = register_failure(old, NOW, max_attempts=3, window_seconds=900, lock_seconds=900)
  assert s.fail_count == 1  # le compteur est reparti de zero


def test_seconds_until_unlock():
  state = AttemptState(locked_until=NOW + timedelta(seconds=120))
  assert seconds_until_unlock(state, NOW) == 120
  assert seconds_until_unlock(None, NOW) == 0
