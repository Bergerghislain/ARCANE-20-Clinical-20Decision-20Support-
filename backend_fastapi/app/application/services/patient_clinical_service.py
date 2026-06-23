"""CRUD sectionnel du dossier clinique (mesures, traitements, cancer, prelevements)."""
from __future__ import annotations

import logging
from typing import Any

from ..errors import ApplicationError
from ..patient_profile_policy import assert_can_access_patient
from ..ports.argos_ports import ActivityLogPort
from ..ports.patient_ports import PatientRepositoryPort
from ...infrastructure.repositories.patient_clinical_write import SqlPatientClinicalWriteRepository

_audit_logger = logging.getLogger("arcane.audit")


class PatientClinicalService:
  def __init__(
    self,
    patient_repository: PatientRepositoryPort,
    write_repository: SqlPatientClinicalWriteRepository | None = None,
    activity_log: ActivityLogPort | None = None,
  ) -> None:
    self._patients = patient_repository
    self._write = write_repository or SqlPatientClinicalWriteRepository()
    self._activity_log = activity_log

  def _ensure_patient_access(
    self,
    patient_id: int,
    requester_id: int,
    requester_role: str,
  ) -> None:
    row = self._patients.find_patient(patient_id)
    if not row:
      raise ApplicationError("Patient not found", 404)
    assert_can_access_patient(
      patient=row,
      requester_id=requester_id,
      requester_role=requester_role,
    )
    # Point de passage unique des ecritures cliniques: on trace l'acces en
    # modification au dossier (qui / quel patient). Best-effort: une panne
    # d'audit ne doit jamais bloquer le soin.
    if self._activity_log is not None:
      try:
        self._activity_log.write(
          user_id=requester_id,
          action_type="patient_clinical_modified",
          resource_type="patient",
          resource_id=patient_id,
          details={"role": requester_role},
          ip_address=None,
          user_agent=None,
        )
      except Exception:  # noqa: BLE001 - l'audit ne doit pas casser la requete
        _audit_logger.warning("audit write failed for patient_clinical_modified", exc_info=True)

  @staticmethod
  def _map_write_error(error: ValueError) -> ApplicationError:
    code = str(error)
    if code == "primary_cancer_not_found":
      return ApplicationError("Primary cancer not found for this patient", 404)
    if code == "specimen_not_found":
      return ApplicationError("Biological specimen not found for this patient", 404)
    return ApplicationError("Invalid clinical payload", 400)

  def create_measure(
    self,
    patient_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    return self._write.create_measure(patient_id, payload)

  def update_measure(
    self,
    patient_id: int,
    measure_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    row = self._write.update_measure(patient_id, measure_id, payload)
    if not row:
      raise ApplicationError("Measure not found", 404)
    return row

  def delete_measure(
    self,
    patient_id: int,
    measure_id: int,
    requester_id: int,
    requester_role: str,
  ) -> None:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    if not self._write.delete_measure(patient_id, measure_id):
      raise ApplicationError("Measure not found", 404)

  def create_medication(
    self,
    patient_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    return self._write.create_medication(patient_id, payload)

  def update_medication(
    self,
    patient_id: int,
    medication_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    row = self._write.update_medication(patient_id, medication_id, payload)
    if not row:
      raise ApplicationError("Medication not found", 404)
    return row

  def delete_medication(
    self,
    patient_id: int,
    medication_id: int,
    requester_id: int,
    requester_role: str,
  ) -> None:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    if not self._write.delete_medication(patient_id, medication_id):
      raise ApplicationError("Medication not found", 404)

  def create_surgery(
    self,
    patient_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    try:
      return self._write.create_surgery(patient_id, payload)
    except ValueError as error:
      raise self._map_write_error(error) from error

  def update_surgery(
    self,
    patient_id: int,
    surgery_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    try:
      row = self._write.update_surgery(patient_id, surgery_id, payload)
    except ValueError as error:
      raise self._map_write_error(error) from error
    if not row:
      raise ApplicationError("Surgery not found", 404)
    return row

  def delete_surgery(
    self,
    patient_id: int,
    surgery_id: int,
    requester_id: int,
    requester_role: str,
  ) -> None:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    if not self._write.delete_surgery(patient_id, surgery_id):
      raise ApplicationError("Surgery not found", 404)

  def create_radiotherapy(
    self,
    patient_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    try:
      return self._write.create_radiotherapy(patient_id, payload)
    except ValueError as error:
      raise self._map_write_error(error) from error

  def update_radiotherapy(
    self,
    patient_id: int,
    radiotherapy_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    try:
      row = self._write.update_radiotherapy(patient_id, radiotherapy_id, payload)
    except ValueError as error:
      raise self._map_write_error(error) from error
    if not row:
      raise ApplicationError("Radiotherapy not found", 404)
    return row

  def delete_radiotherapy(
    self,
    patient_id: int,
    radiotherapy_id: int,
    requester_id: int,
    requester_role: str,
  ) -> None:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    if not self._write.delete_radiotherapy(patient_id, radiotherapy_id):
      raise ApplicationError("Radiotherapy not found", 404)

  def create_imaging_study(
    self,
    patient_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    try:
      return self._write.create_imaging_study(patient_id, payload)
    except ValueError as error:
      raise self._map_write_error(error) from error

  def update_imaging_study(
    self,
    patient_id: int,
    imaging_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    try:
      row = self._write.update_imaging_study(patient_id, imaging_id, payload)
    except ValueError as error:
      raise self._map_write_error(error) from error
    if not row:
      raise ApplicationError("Imaging study not found", 404)
    return row

  def delete_imaging_study(
    self,
    patient_id: int,
    imaging_id: int,
    requester_id: int,
    requester_role: str,
  ) -> None:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    if not self._write.delete_imaging_study(patient_id, imaging_id):
      raise ApplicationError("Imaging study not found", 404)

  def create_tnm_event(
    self,
    patient_id: int,
    primary_cancer_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    try:
      return self._write.create_tnm_event(patient_id, primary_cancer_id, payload)
    except ValueError as error:
      raise self._map_write_error(error) from error

  def update_tnm_event(
    self,
    patient_id: int,
    primary_cancer_id: int,
    tnm_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    try:
      row = self._write.update_tnm_event(patient_id, primary_cancer_id, tnm_id, payload)
    except ValueError as error:
      raise self._map_write_error(error) from error
    if not row:
      raise ApplicationError("TNM event not found", 404)
    return row

  def delete_tnm_event(
    self,
    patient_id: int,
    primary_cancer_id: int,
    tnm_id: int,
    requester_id: int,
    requester_role: str,
  ) -> None:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    try:
      deleted = self._write.delete_tnm_event(patient_id, primary_cancer_id, tnm_id)
    except ValueError as error:
      raise self._map_write_error(error) from error
    if not deleted:
      raise ApplicationError("TNM event not found", 404)

  def create_specimen(
    self,
    patient_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    return self._write.create_specimen(patient_id, payload)

  def update_specimen(
    self,
    patient_id: int,
    specimen_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    row = self._write.update_specimen(patient_id, specimen_id, payload)
    if not row:
      raise ApplicationError("Biological specimen not found", 404)
    return row

  def delete_specimen(
    self,
    patient_id: int,
    specimen_id: int,
    requester_id: int,
    requester_role: str,
  ) -> None:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    if not self._write.delete_specimen(patient_id, specimen_id):
      raise ApplicationError("Biological specimen not found", 404)

  def create_biomarker(
    self,
    patient_id: int,
    specimen_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    try:
      return self._write.create_biomarker(patient_id, specimen_id, payload)
    except ValueError as error:
      raise self._map_write_error(error) from error

  def update_biomarker(
    self,
    patient_id: int,
    specimen_id: int,
    biomarker_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    try:
      row = self._write.update_biomarker(patient_id, specimen_id, biomarker_id, payload)
    except ValueError as error:
      raise self._map_write_error(error) from error
    if not row:
      raise ApplicationError("Biomarker not found", 404)
    return row

  def delete_biomarker(
    self,
    patient_id: int,
    specimen_id: int,
    biomarker_id: int,
    requester_id: int,
    requester_role: str,
  ) -> None:
    self._ensure_patient_access(patient_id, requester_id, requester_role)
    try:
      deleted = self._write.delete_biomarker(patient_id, specimen_id, biomarker_id)
    except ValueError as error:
      raise self._map_write_error(error) from error
    if not deleted:
      raise ApplicationError("Biomarker not found", 404)
