"""Tests d'integration unitaire du verrouillage de compte dans AuthService.login."""
from __future__ import annotations

from types import SimpleNamespace

import pytest

from backend_fastapi.app.application.errors import ApplicationError
from backend_fastapi.app.application.services.auth_service import AuthService
from backend_fastapi.app.domain.login_throttle import AttemptState


class FakeUsers:
  def __init__(self, user):
    self._user = user

  def find_by_identifier(self, identifier):  # noqa: ANN001
    return self._user


class FakePasswords:
  def __init__(self, ok: bool):
    self._ok = ok

  def verify(self, plain, hashed):  # noqa: ANN001
    return self._ok


class FakeTokens:
  def create_access(self, user_id, role):  # noqa: ANN001
    return "access"

  def create_refresh(self, user_id):  # noqa: ANN001
    return "refresh"


class FakeAttempts:
  def __init__(self):
    self.store: dict[str, AttemptState] = {}
    self.reset_calls: list[str] = []

  def get_state(self, identifier):  # noqa: ANN001
    return self.store.get(identifier)

  def save_state(self, identifier, state):  # noqa: ANN001
    self.store[identifier] = state

  def reset(self, identifier):  # noqa: ANN001
    self.reset_calls.append(identifier)
    self.store.pop(identifier, None)


def _user():
  return SimpleNamespace(id=1, role="clinician", is_active=True, password_hash="$2b$xx")


def _service(*, password_ok: bool, attempts: FakeAttempts):
  return AuthService(
    FakeUsers(_user()),
    FakePasswords(password_ok),
    FakeTokens(),
    attempts,
    max_attempts=3,
    window_seconds=1000,
    lock_seconds=1000,
  )


def test_lock_after_threshold_then_429_on_next_attempt():
  attempts = FakeAttempts()
  svc = _service(password_ok=False, attempts=attempts)

  # 3 echecs de mot de passe -> chacun 401 ; le 3e pose le verrou.
  for _ in range(3):
    with pytest.raises(ApplicationError) as exc:
      svc.login("admin", "wrong")
    assert exc.value.status_code == 401

  # 4e tentative: compte verrouille -> 429, sans verifier le mot de passe.
  with pytest.raises(ApplicationError) as exc:
    svc.login("admin", "wrong")
  assert exc.value.status_code == 429


def test_locked_account_rejects_even_correct_password():
  attempts = FakeAttempts()
  # On force un verrou actif.
  from datetime import UTC, datetime, timedelta

  attempts.store["admin"] = AttemptState(locked_until=datetime.now(UTC) + timedelta(seconds=500))
  svc = _service(password_ok=True, attempts=attempts)
  with pytest.raises(ApplicationError) as exc:
    svc.login("admin", "correct")
  assert exc.value.status_code == 429


def test_successful_login_resets_counter():
  attempts = FakeAttempts()
  svc = _service(password_ok=True, attempts=attempts)
  out = svc.login("Admin", "correct")
  assert out["token"] == "access"
  # la cle est normalisee (strip + lower)
  assert "admin" in attempts.reset_calls


def test_unknown_identifier_counts_as_failure():
  attempts = FakeAttempts()
  svc = AuthService(
    FakeUsers(None),  # identifiant inconnu
    FakePasswords(False),
    FakeTokens(),
    attempts,
    max_attempts=3,
    window_seconds=1000,
    lock_seconds=1000,
  )
  with pytest.raises(ApplicationError) as exc:
    svc.login("ghost", "x")
  assert exc.value.status_code == 401
  assert attempts.store["ghost"].fail_count == 1


def test_no_throttle_when_port_absent():
  # Retrocompatibilite: sans depot de tentatives, aucun verrouillage.
  svc = AuthService(FakeUsers(_user()), FakePasswords(False), FakeTokens())
  for _ in range(10):
    with pytest.raises(ApplicationError) as exc:
      svc.login("admin", "wrong")
    assert exc.value.status_code == 401  # toujours 401, jamais 429
