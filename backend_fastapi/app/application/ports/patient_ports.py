from __future__ import annotations

from typing import Any, Protocol


class PatientRepositoryPort(Protocol):
  def list_patients(self) -> list[dict[str, Any]]:
    ...

  def find_patient(self, patient_id: int) -> dict[str, Any] | None:
    ...

  def create_patient(self, payload: dict[str, Any]) -> int | None:
    ...

  def update_patient(self, patient_id: int, updates: dict[str, Any]) -> dict[str, Any] | None:
    ...

  def import_patient_payload(self, payload: dict[str, Any]) -> int:
    ...

  def find_patient_profile(self, patient_id: int) -> dict[str, Any] | None:
    ...

  def save_patient_profile(
    self,
    patient_id: int,
    profile: dict[str, Any],
    expected_version: int | None = None,
  ) -> dict[str, Any] | None:
    ...

