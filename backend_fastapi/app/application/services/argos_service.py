from __future__ import annotations

from typing import Any

from ..errors import ApplicationError
from ..ports.argos_ports import ActivityLogPort, ArgosRepositoryPort


class ArgosService:
  def __init__(self, repository: ArgosRepositoryPort, activity_log: ActivityLogPort):
    self._repository = repository
    self._activity_log = activity_log

  def create_discussion(
    self,
    *,
    payload: dict[str, Any],
    clinician_id: int,
    ip_address: str | None,
    user_agent: str | None,
  ) -> dict[str, Any]:
    patient_id = int(payload["patient_id"])
    if not self._repository.patient_exists(patient_id):
      raise ApplicationError("Patient not found", 404)

    row = self._repository.create_discussion(
      patient_id=patient_id,
      clinician_id=clinician_id,
      title=payload.get("title"),
      context=payload.get("context"),
    )
    if not row:
      raise ApplicationError("Failed to create discussion", 500)

    discussion = _row_to_discussion(row)
    self._activity_log.write(
      user_id=clinician_id,
      action_type="argos_discussion_created",
      resource_type="argos_discussion",
      resource_id=discussion["id"],
      details={"patient_id": discussion["patient_id"]},
      ip_address=ip_address,
      user_agent=user_agent,
    )
    return discussion

  def list_discussions(self, clinician_id: int, patient_id: int | None = None) -> list[dict[str, Any]]:
    rows = self._repository.list_discussions(clinician_id=clinician_id, patient_id=patient_id)
    return [_row_to_discussion(row) for row in rows]

  def get_discussion(self, discussion_id: int, clinician_id: int) -> dict[str, Any]:
    row = self._repository.find_discussion(discussion_id=discussion_id, clinician_id=clinician_id)
    if not row:
      raise ApplicationError("Discussion not found", 404)
    return _row_to_discussion(row)

  def list_messages(self, discussion_id: int, clinician_id: int) -> list[dict[str, Any]]:
    discussion = self._repository.find_discussion(discussion_id=discussion_id, clinician_id=clinician_id)
    if not discussion:
      raise ApplicationError("Discussion not found", 404)

    rows = self._repository.list_messages(discussion_id=discussion_id)
    return [_row_to_message(row) for row in rows]

  def add_message(
    self,
    *,
    discussion_id: int,
    payload: dict[str, Any],
    clinician_id: int,
    ip_address: str | None,
    user_agent: str | None,
  ) -> dict[str, Any]:
    discussion = self._repository.find_discussion(discussion_id=discussion_id, clinician_id=clinician_id)
    if not discussion:
      raise ApplicationError("Discussion not found", 404)

    message_type = str(payload["message_type"])
    created_by = clinician_id if message_type != "argos_response" else None
    row = self._repository.create_message(
      discussion_id=discussion_id,
      message_type=message_type,
      content=str(payload["content"]),
      sections=payload.get("sections"),
      created_by=created_by,
    )
    if not row:
      raise ApplicationError("Failed to create message", 500)

    message = _row_to_message(row)
    self._activity_log.write(
      user_id=clinician_id,
      action_type="argos_message_created",
      resource_type="argos_message",
      resource_id=message["id"],
      details={"discussion_id": discussion_id, "message_type": message_type},
      ip_address=ip_address,
      user_agent=user_agent,
    )
    return message


def _row_to_discussion(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "id": int(row["id"]),
    "patient_id": int(row["patient_id"]),
    "clinician_id": int(row["clinician_id"]),
    "title": row.get("title"),
    "context": row.get("context"),
    "status": row.get("status") or "active",
    "created_at": row["created_at"].isoformat() if row.get("created_at") else "",
    "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else "",
  }


def _row_to_sections(row: dict[str, Any]) -> dict[str, Any] | None:
  if not any(
    [
      row.get("clinical_summary"),
      row.get("hypotheses_options"),
      row.get("arguments"),
      row.get("next_steps"),
      row.get("traceability"),
    ]
  ):
    return None

  hypotheses_raw = row.get("hypotheses_options") or []
  arguments_raw = row.get("arguments") or []
  next_steps_raw = row.get("next_steps") or []
  return {
    "clinicalSynthesis": row.get("clinical_summary"),
    "hypotheses": list(hypotheses_raw),
    "arguments": list(arguments_raw),
    "nextSteps": list(next_steps_raw),
    "traceability": row.get("traceability"),
  }


def _row_to_message(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "id": int(row["id"]),
    "discussion_id": int(row["discussion_id"]),
    "message_type": str(row["message_type"]),
    "content": str(row["content"]),
    "sections": _row_to_sections(row),
    "created_at": row["created_at"].isoformat() if row.get("created_at") else "",
    "created_by": int(row["created_by"]) if row.get("created_by") is not None else None,
  }

