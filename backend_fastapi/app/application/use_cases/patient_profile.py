from __future__ import annotations

from typing import Any

from ..errors import ApplicationError
from ..patient_profile_policy import (
  CURRENT_PROFILE_SCHEMA_VERSION,
  assert_can_access_patient,
  migrate_profile_to_current,
  read_expected_profile_version,
  safe_int,
)
from ..ports.patient_ports import PatientRepositoryPort


class GetPatientProfileUseCase:
  def __init__(self, repository: PatientRepositoryPort) -> None:
    self._repository = repository

  def execute(self, patient_id: int, requester_id: int, requester_role: str) -> dict[str, Any]:
    patient = self._repository.find_patient(patient_id)
    if not patient:
      raise ApplicationError("Patient not found", 404)
    assert_can_access_patient(
      patient=patient,
      requester_id=requester_id,
      requester_role=requester_role,
    )
    record = self._repository.find_patient_profile(patient_id)
    if not record:
      return {
        "patient_id": patient_id,
        "source": "none",
        "profile": None,
        "profile_version": None,
        "stored_schema_version": None,
      }

    raw_profile = record.get("profile")
    if not isinstance(raw_profile, dict):
      return {
        "patient_id": patient_id,
        "source": "none",
        "profile": None,
        "profile_version": None,
        "stored_schema_version": None,
      }
    migrated_profile = migrate_profile_to_current(raw_profile, patient_id)
    profile_version = safe_int(record.get("profile_version"), default=0)
    migrated_profile["profileVersion"] = profile_version
    stored_schema_version = safe_int(record.get("schema_version"), default=1)
    return {
      "patient_id": patient_id,
      "source": "persisted",
      "profile": migrated_profile,
      "profile_version": profile_version,
      "stored_schema_version": stored_schema_version,
    }


class SavePatientProfileUseCase:
  def __init__(self, repository: PatientRepositoryPort) -> None:
    self._repository = repository

  def execute(
    self,
    patient_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    patient = self._repository.find_patient(patient_id)
    if not patient:
      raise ApplicationError("Patient not found", 404)
    assert_can_access_patient(
      patient=patient,
      requester_id=requester_id,
      requester_role=requester_role,
    )

    expected_version = read_expected_profile_version(payload)
    profile = dict(payload)
    profile.pop("profileVersion", None)
    migrated_profile = migrate_profile_to_current(profile, patient_id)
    save_result = self._repository.save_patient_profile(
      patient_id,
      migrated_profile,
      expected_version=expected_version,
    )
    if not save_result:
      raise ApplicationError("Failed to save patient profile", 500)
    if save_result.get("status") == "conflict":
      current_version = safe_int(save_result.get("current_version"), default=0)
      if expected_version is None:
        raise ApplicationError(
          (
            "Profile version is required to update an existing profile. "
            f"Current version is {current_version}. Reload the profile and retry."
          ),
          409,
        )
      raise ApplicationError(
        (
          "Profile version conflict detected. "
          f"Expected {expected_version}, current {current_version}. Reload before saving."
        ),
        409,
      )

    saved_profile = save_result.get("profile")
    if not isinstance(saved_profile, dict):
      raise ApplicationError("Failed to save patient profile", 500)
    saved_profile["profileVersion"] = safe_int(save_result.get("profile_version"), default=0)

    return {
      "patient_id": patient_id,
      "source": "persisted",
      "profile": saved_profile,
      "profile_version": safe_int(save_result.get("profile_version"), default=0),
      "stored_schema_version": safe_int(
        save_result.get("schema_version"),
        default=CURRENT_PROFILE_SCHEMA_VERSION,
      ),
    }
