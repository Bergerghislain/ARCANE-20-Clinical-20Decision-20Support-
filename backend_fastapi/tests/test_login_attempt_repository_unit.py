"""Tests du depot SqlLoginAttemptRepository (sans base reelle)."""
from __future__ import annotations

from datetime import UTC, datetime

import backend_fastapi.app.infrastructure.repositories.login_attempt_repository as mod
from backend_fastapi.app.domain.login_throttle import AttemptState
from backend_fastapi.app.infrastructure.repositories.login_attempt_repository import (
  SqlLoginAttemptRepository,
)


def test_get_state_none_when_no_row(monkeypatch):
  monkeypatch.setattr(mod, "fetch_one", lambda q, p=(): None)
  assert SqlLoginAttemptRepository().get_state("admin") is None


def test_get_state_maps_row(monkeypatch):
  now = datetime.now(UTC)
  monkeypatch.setattr(
    mod, "fetch_one",
    lambda q, p=(): {"fail_count": 2, "locked_until": None, "last_attempt_at": now},
  )
  state = SqlLoginAttemptRepository().get_state("admin")
  assert state is not None
  assert state.fail_count == 2
  assert state.last_attempt_at == now


def test_save_state_upserts(monkeypatch):
  calls = []
  monkeypatch.setattr(mod, "execute", lambda q, p=(): calls.append((q, p)) or 1)
  SqlLoginAttemptRepository().save_state("admin", AttemptState(fail_count=2))
  assert "INSERT INTO login_attempts" in calls[0][0]
  assert "ON CONFLICT" in calls[0][0]
  assert calls[0][1][0] == "admin"


def test_reset_deletes(monkeypatch):
  calls = []
  monkeypatch.setattr(mod, "execute", lambda q, p=(): calls.append((q, p)) or 1)
  SqlLoginAttemptRepository().reset("admin")
  assert "DELETE FROM login_attempts" in calls[0][0]
  assert calls[0][1] == ("admin",)
