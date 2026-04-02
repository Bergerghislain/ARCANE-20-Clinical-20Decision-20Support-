from __future__ import annotations

from typing import Any, Protocol


class PatientRepositoryPort(Protocol):
  def list_patients(
    self,
    limit: int | None = None,
    offset: int = 0,
  ) -> list[dict[str, Any]]:
    ...

  def list_patients_by_clinician(
    self,
    clinician_id: int,
    limit: int | None = None,
    offset: int = 0,
  ) -> list[dict[str, Any]]:
    ...

  def find_patient(self, patient_id: int) -> dict[str, Any] | None:
    ...

  def find_patient_by_ipp(self, ipp: str) -> dict[str, Any] | None:
    ...

  def is_active_clinician(self, clinician_id: int) -> bool:
    ...

  def get_default_active_clinician_id(self) -> int | None:
    ...

  def create_patient(self, payload: dict[str, Any]) -> int | None:
    ...

  def update_patient(self, patient_id: int, updates: dict[str, Any]) -> dict[str, Any] | None:
    ...

  def reassign_patient(
    self,
    patient_id: int,
    clinician_id: int,
    updated_by: int | None = None,
  ) -> dict[str, Any] | None:
    ...

  def import_patient_payload(self, payload: dict[str, Any], assigned_clinician_id: int | None = None) -> int:
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

