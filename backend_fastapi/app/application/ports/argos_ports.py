from __future__ import annotations

from typing import Any, Protocol


class ArgosRepositoryPort(Protocol):
  def patient_exists(self, patient_id: int) -> bool:
    ...

  def create_discussion(
    self,
    *,
    patient_id: int,
    clinician_id: int,
    title: str | None,
    context: str | None,
  ) -> dict[str, Any] | None:
    ...

  def list_discussions(self, clinician_id: int, patient_id: int | None = None) -> list[dict[str, Any]]:
    ...

  def find_discussion(self, discussion_id: int, clinician_id: int) -> dict[str, Any] | None:
    ...

  def list_messages(self, discussion_id: int) -> list[dict[str, Any]]:
    ...

  def create_message(
    self,
    *,
    discussion_id: int,
    message_type: str,
    content: str,
    sections: dict[str, Any] | None,
    created_by: int | None,
  ) -> dict[str, Any] | None:
    ...


class ActivityLogPort(Protocol):
  def write(
    self,
    *,
    user_id: int,
    action_type: str,
    resource_type: str,
    resource_id: int,
    details: dict[str, Any] | None,
    ip_address: str | None,
    user_agent: str | None,
  ) -> None:
    ...

