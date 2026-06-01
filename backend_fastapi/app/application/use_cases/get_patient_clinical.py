from __future__ import annotations

from typing import Any

from ..errors import ApplicationError
from ..patient_profile_policy import assert_can_access_patient
from ..ports.patient_ports import PatientRepositoryPort


class GetPatientClinicalBundleUseCase:
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
    bundle = self._repository.find_clinical_bundle(patient_id)
    if bundle is None:
      raise ApplicationError("Patient not found", 404)
    return bundle
