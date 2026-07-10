from __future__ import annotations

import datetime as _dt

import pytest

from backend_fastapi.app.application.errors import ApplicationError
from backend_fastapi.app.application.services.argos_service import ArgosService


class _Repo:
  def __init__(self):
    self._patients: set[int] = {1}
    self._discussions: dict[int, dict] = {}
    self._messages: dict[int, list[dict]] = {}
    self._next_discussion_id = 10
    self._next_message_id = 100

  def patient_exists(self, patient_id: int) -> bool:
    return patient_id in self._patients

  def create_discussion(self, *, patient_id: int, clinician_id: int, title, context):  # noqa: ANN001
    did = self._next_discussion_id
    self._next_discussion_id += 1
    row = {
      "id": did,
      "patient_id": patient_id,
      "clinician_id": clinician_id,
      "title": title,
      "context": context,
      "status": "active",
      "created_at": _dt.datetime(2026, 1, 1, 0, 0, 0),
      "updated_at": _dt.datetime(2026, 1, 1, 0, 0, 0),
    }
    self._discussions[did] = row
    self._messages[did] = []
    return row

  def list_discussions(self, *, clinician_id: int, patient_id: int | None = None):
    rows = [d for d in self._discussions.values() if int(d["clinician_id"]) == clinician_id]
    if patient_id is not None:
      rows = [d for d in rows if int(d["patient_id"]) == patient_id]
    return rows

  def find_discussion(self, *, discussion_id: int, clinician_id: int):
    row = self._discussions.get(discussion_id)
    if not row or int(row["clinician_id"]) != clinician_id:
      return None
    return row

  def update_discussion(self, *, discussion_id: int, clinician_id: int, title: str):
    row = self.find_discussion(discussion_id=discussion_id, clinician_id=clinician_id)
    if not row:
      return None
    row = {**row, "title": title, "updated_at": _dt.datetime(2026, 1, 2, 0, 0, 0)}
    self._discussions[discussion_id] = row
    return row

  def list_messages(self, *, discussion_id: int):
    return list(self._messages.get(discussion_id) or [])

  def create_message(
    self,
    *,
    discussion_id: int,
    message_type: str,
    content: str,
    sections,
    created_by,  # noqa: ANN001
  ):
    mid = self._next_message_id
    self._next_message_id += 1
    row = {
      "id": mid,
      "discussion_id": discussion_id,
      "message_type": message_type,
      "content": content,
      "created_at": _dt.datetime(2026, 1, 1, 0, 0, 0),
      "created_by": created_by,
      # sections shape fields (optional)
      "clinical_summary": None,
      "hypotheses_options": None,
      "arguments": None,
      "next_steps": None,
      "traceability": None,
    }
    self._messages.setdefault(discussion_id, []).append(row)
    return row


class _ActivityLog:
  def __init__(self):
    self.events: list[dict] = []

  def write(self, **payload):  # noqa: ANN003
    self.events.append(payload)


def test_create_discussion_rejects_unknown_patient():
  service = ArgosService(_Repo(), _ActivityLog())
  with pytest.raises(ApplicationError) as exc:
    service.create_discussion(payload={"patient_id": 999}, clinician_id=1, ip_address=None, user_agent=None)
  assert exc.value.status_code == 404


def test_create_discussion_writes_activity_log_and_returns_mapped_shape():
  repo = _Repo()
  log = _ActivityLog()
  service = ArgosService(repo, log)
  out = service.create_discussion(
    payload={"patient_id": 1, "title": "T", "context": "C"},
    clinician_id=7,
    ip_address="127.0.0.1",
    user_agent="pytest",
  )
  assert out["patient_id"] == 1
  assert out["clinician_id"] == 7
  assert out["title"] == "T"
  assert log.events and log.events[0]["action_type"] == "argos_discussion_created"


def test_get_discussion_404_when_not_owned_by_user():
  repo = _Repo()
  service = ArgosService(repo, _ActivityLog())
  created = service.create_discussion(payload={"patient_id": 1}, clinician_id=1, ip_address=None, user_agent=None)
  with pytest.raises(ApplicationError) as exc:
    service.get_discussion(discussion_id=int(created["id"]), clinician_id=2)
  assert exc.value.status_code == 404


def test_add_message_sets_created_by_none_for_argos_response():
  repo = _Repo()
  log = _ActivityLog()
  service = ArgosService(repo, log)
  disc = service.create_discussion(payload={"patient_id": 1}, clinician_id=5, ip_address=None, user_agent=None)
  msg = service.add_message(
    discussion_id=int(disc["id"]),
    payload={"message_type": "argos_response", "content": "hello", "sections": None},
    clinician_id=5,
    ip_address=None,
    user_agent=None,
  )
  assert msg["created_by"] is None
  assert log.events[-1]["action_type"] == "argos_message_created"


def test_list_discussions_filters_by_patient_id():
  repo = _Repo()
  repo._patients.add(2)
  service = ArgosService(repo, _ActivityLog())
  service.create_discussion(payload={"patient_id": 1, "title": "A"}, clinician_id=2, ip_address=None, user_agent=None)
  service.create_discussion(payload={"patient_id": 2, "title": "B"}, clinician_id=2, ip_address=None, user_agent=None)
  all_rows = service.list_discussions(clinician_id=2)
  assert len(all_rows) == 2
  filtered = service.list_discussions(clinician_id=2, patient_id=2)
  assert len(filtered) == 1
  assert filtered[0]["patient_id"] == 2


def test_list_messages_requires_discussion_ownership():
  repo = _Repo()
  service = ArgosService(repo, _ActivityLog())
  disc = service.create_discussion(payload={"patient_id": 1}, clinician_id=9, ip_address=None, user_agent=None)
  with pytest.raises(ApplicationError) as exc:
    service.list_messages(discussion_id=int(disc["id"]), clinician_id=8)
  assert exc.value.status_code == 404


def test_add_message_requires_discussion_ownership():
  repo = _Repo()
  service = ArgosService(repo, _ActivityLog())
  disc = service.create_discussion(payload={"patient_id": 1}, clinician_id=9, ip_address=None, user_agent=None)
  with pytest.raises(ApplicationError) as exc:
    service.add_message(
      discussion_id=int(disc["id"]),
      payload={"message_type": "user", "content": "x", "sections": None},
      clinician_id=8,
      ip_address=None,
      user_agent=None,
    )
  assert exc.value.status_code == 404


def test_get_discussion_returns_mapped_row():
  repo = _Repo()
  service = ArgosService(repo, _ActivityLog())
  created = service.create_discussion(
    payload={"patient_id": 1, "title": "T1", "context": "ctx"},
    clinician_id=4,
    ip_address=None,
    user_agent=None,
  )
  got = service.get_discussion(discussion_id=int(created["id"]), clinician_id=4)
  assert got["title"] == "T1"
  assert got["context"] == "ctx"


def test_update_discussion_renames_and_logs_activity():
  repo = _Repo()
  log = _ActivityLog()
  service = ArgosService(repo, log)
  created = service.create_discussion(
    payload={"patient_id": 1, "title": "New Conversation"},
    clinician_id=3,
    ip_address=None,
    user_agent=None,
  )
  updated = service.update_discussion(
    discussion_id=int(created["id"]),
    payload={"title": "Douleur thoracique"},
    clinician_id=3,
    ip_address="127.0.0.1",
    user_agent="pytest",
  )
  assert updated["title"] == "Douleur thoracique"
  assert log.events[-1]["action_type"] == "argos_discussion_updated"


def test_update_discussion_404_when_not_owned():
  repo = _Repo()
  service = ArgosService(repo, _ActivityLog())
  created = service.create_discussion(
    payload={"patient_id": 1},
    clinician_id=1,
    ip_address=None,
    user_agent=None,
  )
  with pytest.raises(ApplicationError) as exc:
    service.update_discussion(
      discussion_id=int(created["id"]),
      payload={"title": "Titre"},
      clinician_id=2,
      ip_address=None,
      user_agent=None,
    )
  assert exc.value.status_code == 404

