"""Tests unitaires des depots ARGOS (SqlArgosRepository, SqlActivityLogRepository).

On remplace DbUnitOfWork par un faux contexte transactionnel et fetch_one/fetch_all/
execute par des doubles, afin de couvrir la logique sans base reelle.
"""
from __future__ import annotations

from typing import Any

import pytest

import backend_fastapi.app.infrastructure.repositories.argos_repository as mod
from backend_fastapi.app.infrastructure.repositories.argos_repository import (
  SqlActivityLogRepository,
  SqlArgosRepository,
)


class FakeCursor:
  def __init__(self, row: dict[str, Any] | None) -> None:
    self._row = row
    self.calls: list[tuple[str, tuple]] = []

  def execute(self, query: str, params: tuple = ()) -> None:  # noqa: ANN001
    self.calls.append((query, params))

  def fetchone(self) -> dict[str, Any] | None:
    return self._row


class FakeUoW:
  def __init__(self, row: dict[str, Any] | None, *, cursor_none: bool = False) -> None:
    self.cursor = None if cursor_none else FakeCursor(row)
    self.committed = False

  def __enter__(self) -> "FakeUoW":
    return self

  def __exit__(self, *args: Any) -> bool:
    return False

  def commit(self) -> None:
    self.committed = True


@pytest.fixture
def repo() -> SqlArgosRepository:
  return SqlArgosRepository()


def _patch_uow(monkeypatch: pytest.MonkeyPatch, uow: FakeUoW) -> None:
  monkeypatch.setattr(mod, "DbUnitOfWork", lambda: uow)


def test_patient_exists_true(monkeypatch, repo):
  monkeypatch.setattr(mod, "fetch_one", lambda q, p=(): {"id_patient": 1})
  assert repo.patient_exists(1) is True


def test_patient_exists_false(monkeypatch, repo):
  monkeypatch.setattr(mod, "fetch_one", lambda q, p=(): None)
  assert repo.patient_exists(99) is False


def test_create_discussion_commits(monkeypatch, repo):
  uow = FakeUoW({"id": 10, "title": "Cas rare"})
  _patch_uow(monkeypatch, uow)
  out = repo.create_discussion(patient_id=1, clinician_id=2, title="Cas rare", context="ctx")
  assert out == {"id": 10, "title": "Cas rare"}
  assert uow.committed is True


def test_create_discussion_default_title(monkeypatch, repo):
  uow = FakeUoW({"id": 11})
  _patch_uow(monkeypatch, uow)
  repo.create_discussion(patient_id=1, clinician_id=2, title=None, context=None)
  # le titre par defaut "New Conversation" est passe en parametre de l'INSERT
  insert_call = uow.cursor.calls[0]
  assert "New Conversation" in insert_call[1]


def test_create_discussion_no_row_returns_none(monkeypatch, repo):
  uow = FakeUoW(None)
  _patch_uow(monkeypatch, uow)
  assert repo.create_discussion(patient_id=1, clinician_id=2, title="x", context=None) is None
  assert uow.committed is False


def test_create_discussion_cursor_none_raises(monkeypatch, repo):
  uow = FakeUoW(None, cursor_none=True)
  _patch_uow(monkeypatch, uow)
  with pytest.raises(RuntimeError, match="Transaction cursor not initialized"):
    repo.create_discussion(patient_id=1, clinician_id=2, title="x", context=None)


def test_list_discussions_with_patient(monkeypatch, repo):
  captured: dict[str, Any] = {}

  def fake_fetch_all(q, p=()):  # noqa: ANN001
    captured["query"] = q
    captured["params"] = p
    return [{"id": 1}]

  monkeypatch.setattr(mod, "fetch_all", fake_fetch_all)
  out = repo.list_discussions(clinician_id=2, patient_id=5)
  assert out == [{"id": 1}]
  assert captured["params"] == (2, 5)
  assert "patient_id" in captured["query"]


def test_list_discussions_without_patient(monkeypatch, repo):
  captured: dict[str, Any] = {}

  def fake_fetch_all(q, p=()):  # noqa: ANN001
    captured["params"] = p
    return []

  monkeypatch.setattr(mod, "fetch_all", fake_fetch_all)
  assert repo.list_discussions(clinician_id=2) == []
  assert captured["params"] == (2,)


def test_find_discussion(monkeypatch, repo):
  monkeypatch.setattr(mod, "fetch_one", lambda q, p=(): {"id": 7, "clinician_id": 2})
  out = repo.find_discussion(7, 2)
  assert out is not None and out["id"] == 7


def test_list_messages(monkeypatch, repo):
  monkeypatch.setattr(mod, "fetch_all", lambda q, p=(): [{"id": 1}, {"id": 2}])
  assert len(repo.list_messages(7)) == 2


def test_create_message_commits_and_touches_discussion(monkeypatch, repo):
  uow = FakeUoW({"id": 100, "content": "hello"})
  _patch_uow(monkeypatch, uow)
  out = repo.create_message(
    discussion_id=7,
    message_type="user",
    content="hello",
    sections={"clinicalSynthesis": "s"},
    created_by=2,
  )
  assert out == {"id": 100, "content": "hello"}
  assert uow.committed is True
  # 1er execute = INSERT message, 2e execute = UPDATE discussions.updated_at
  assert len(uow.cursor.calls) == 2
  assert "UPDATE argos_discussions" in uow.cursor.calls[1][0]


def test_create_message_no_row_returns_none(monkeypatch, repo):
  uow = FakeUoW(None)
  _patch_uow(monkeypatch, uow)
  assert (
    repo.create_message(
      discussion_id=7, message_type="user", content="x", sections=None, created_by=2
    )
    is None
  )
  assert uow.committed is False


def test_create_message_cursor_none_raises(monkeypatch, repo):
  uow = FakeUoW(None, cursor_none=True)
  _patch_uow(monkeypatch, uow)
  with pytest.raises(RuntimeError):
    repo.create_message(
      discussion_id=7, message_type="user", content="x", sections=None, created_by=2
    )


def test_activity_log_write(monkeypatch):
  calls: list[tuple[str, tuple]] = []
  monkeypatch.setattr(mod, "execute", lambda q, p=(): calls.append((q, p)) or 1)
  SqlActivityLogRepository().write(
    user_id=2,
    action_type="CREATE",
    resource_type="argos_discussion",
    resource_id=10,
    details={"k": "v"},
    ip_address="127.0.0.1",
    user_agent="pytest",
  )
  assert len(calls) == 1
  assert "INSERT INTO activity_logs" in calls[0][0]
  assert calls[0][1][0] == 2
