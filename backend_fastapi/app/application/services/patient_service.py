from __future__ import annotations

import json
import time
from datetime import date, datetime
from typing import Any

from ..errors import ApplicationError
from ..patient_profile_policy import (
  assert_can_access_patient,
  is_admin_role,
  read_optional_int,
)
from ..ports.patient_ports import PatientRepositoryPort
from ..use_cases.patient_profile import GetPatientProfileUseCase, SavePatientProfileUseCase


class PatientService:
  def __init__(self, repository: PatientRepositoryPort) -> None:
    self._repository = repository
    self._get_patient_profile_uc = GetPatientProfileUseCase(repository)
    self._save_patient_profile_uc = SavePatientProfileUseCase(repository)

  def list_patients(
    self,
    requester_id: int,
    requester_role: str,
    limit: int | None = None,
    offset: int = 0,
  ) -> list[dict[str, Any]]:
    if is_admin_role(requester_role):
      return self._repository.list_patients(limit=limit, offset=offset)
    return self._repository.list_patients_by_clinician(
      clinician_id=requester_id,
      limit=limit,
      offset=offset,
    )

  def get_patient(
    self,
    patient_id: int,
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    row = self._repository.find_patient(patient_id)
    if not row:
      raise ApplicationError("Patient not found", 404)
    assert_can_access_patient(
      patient=row,
      requester_id=requester_id,
      requester_role=requester_role,
    )
    return row

  def add_patient(self, payload: dict[str, Any], user_id: int, user_role: str) -> dict[str, Any]:
    ipp_raw = payload.get("ipp")
    ipp = ipp_raw.strip() if isinstance(ipp_raw, str) and ipp_raw.strip() else None
    if ipp is None:
      ipp = f"ARC-{user_id}-{int(time.time() * 1000)}"

    assigned_clinician_id = self._resolve_assigned_clinician_id_for_creation(
      payload=payload,
      requester_id=user_id,
      requester_role=user_role,
    )
    birth_year, birth_month, birth_day = _parse_birth_parts(payload)
    birth_date, birth_date_precision = _compose_partial_date(
      birth_year,
      birth_month,
      birth_day,
    )
    health_info_payload = payload.get("health_info")
    if health_info_payload is None:
      health_info_payload = payload.get("healthInfo")
    health_info_json = json.dumps(health_info_payload) if health_info_payload is not None else None

    patient_id = self._repository.create_patient(
      {
        "name": payload.get("name"),
        "ipp": ipp,
        "birth_date_year": birth_year,
        "birth_date_month": birth_month,
        "birth_date_day": birth_day,
        "birth_date": birth_date,
        "birth_date_precision": birth_date_precision,
        "sex": _normalize_sex(payload.get("sex") or payload.get("gender")),
        "condition": payload.get("condition"),
        "status": _normalize_status_create(payload.get("status")),
        "health_info": health_info_json,
        "assigned_clinician_id": assigned_clinician_id,
        "created_by": user_id,
        "updated_by": user_id,
      }
    )
    if patient_id is None:
      raise ApplicationError("Failed to create patient", 500)
    return {"id": patient_id}

  def update_patient(
    self,
    patient_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    existing = self._repository.find_patient(patient_id)
    if not existing:
      raise ApplicationError("Patient not found", 404)
    assert_can_access_patient(
      patient=existing,
      requester_id=requester_id,
      requester_role=requester_role,
    )

    updates: dict[str, Any] = {}
    if "name" in payload:
      updates["name"] = payload.get("name")
    if "ipp" in payload:
      ipp_raw = payload.get("ipp")
      updates["ipp"] = ipp_raw.strip() if isinstance(ipp_raw, str) and ipp_raw.strip() else None
    if "condition" in payload:
      updates["condition"] = payload.get("condition")
    if "status" in payload:
      updates["status"] = _normalize_status_update(payload.get("status"))

    if "health_info" in payload or "healthInfo" in payload:
      health_info_payload = payload.get("health_info")
      if health_info_payload is None:
        health_info_payload = payload.get("healthInfo")
      updates["health_info"] = (
        json.dumps(health_info_payload) if health_info_payload is not None else None
      )

    if (
      "birthDate" in payload
      or "birth_date_year" in payload
      or "birth_date_month" in payload
      or "birth_date_day" in payload
      or "age" in payload
    ):
      birth_year, birth_month, birth_day = _parse_birth_parts(payload)
      birth_date, birth_date_precision = _compose_partial_date(
        birth_year,
        birth_month,
        birth_day,
      )
      updates["birth_date_year"] = birth_year
      updates["birth_date_month"] = birth_month
      updates["birth_date_day"] = birth_day
      updates["birth_date"] = birth_date
      updates["birth_date_precision"] = birth_date_precision

    if "gender" in payload or "sex" in payload:
      updates["sex"] = _normalize_sex(payload.get("sex") or payload.get("gender"))

    if "assigned_clinician_id" in payload or "assignedClinicianId" in payload:
      raise ApplicationError(
        "Use the admin reassignment endpoint to change assigned clinician",
        400,
      )

    if not updates:
      raise ApplicationError("No fields to update", 400)

    updates["updated_by"] = requester_id
    updated = self._repository.update_patient(patient_id, updates)
    if not updated:
      raise ApplicationError("Failed to update patient", 500)
    return updated

  def import_patient_json(
    self,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    if not payload or not payload.get("ipp"):
      raise ApplicationError("Missing ipp in payload", 400)
    ipp_raw = payload.get("ipp")
    ipp = str(ipp_raw).strip() if ipp_raw is not None else ""
    if not ipp:
      raise ApplicationError("Missing ipp in payload", 400)

    existing = self._repository.find_patient_by_ipp(ipp)
    assigned_clinician_id: int | None = None
    if existing:
      assert_can_access_patient(
        patient=existing,
        requester_id=requester_id,
        requester_role=requester_role,
      )
      if is_admin_role(requester_role):
        requested_assignee = _extract_assigned_clinician_id_from_payload(payload)
        if requested_assignee is not None:
          if not self._repository.is_clinician(requested_assignee):
            raise ApplicationError("Assigned clinician must be a clinician account", 400)
          assigned_clinician_id = requested_assignee
    else:
      assigned_clinician_id = self._resolve_assigned_clinician_id_for_creation(
        payload=payload,
        requester_id=requester_id,
        requester_role=requester_role,
      )

    try:
      patient_id = self._repository.import_patient_payload(
        payload,
        assigned_clinician_id=assigned_clinician_id,
      )
    except Exception as exc:
      raise ApplicationError(f"Failed to import patient: {exc}", 500)
    return {"id": patient_id}

  def get_patient_profile(
    self,
    patient_id: int,
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    return self._get_patient_profile_uc.execute(patient_id, requester_id, requester_role)

  def save_patient_profile(
    self,
    patient_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    return self._save_patient_profile_uc.execute(
      patient_id,
      payload,
      requester_id,
      requester_role,
    )

  def reassign_patient(
    self,
    patient_id: int,
    new_clinician_id: int,
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    if not is_admin_role(requester_role):
      raise ApplicationError("Only admins can reassign patients", 403)

    patient = self._repository.find_patient(patient_id)
    if not patient:
      raise ApplicationError("Patient not found", 404)

    if not self._repository.is_clinician(new_clinician_id):
      raise ApplicationError("Assigned clinician must be a clinician account", 400)

    current_assignee = read_optional_int(patient.get("assigned_clinician_id"))
    if current_assignee == new_clinician_id:
      return patient

    updated = self._repository.reassign_patient(
      patient_id=patient_id,
      clinician_id=new_clinician_id,
      updated_by=requester_id,
    )
    if not updated:
      raise ApplicationError("Failed to reassign patient", 500)
    return updated

  def _resolve_assigned_clinician_id_for_creation(
    self,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> int:
    if not is_admin_role(requester_role):
      return requester_id

    requested_assignee = _extract_assigned_clinician_id_from_payload(payload)
    # Regle metier demandee:
    # - creation sans assignee explicite => patient assigne au createur (admin ou clinicien)
    # - assignee explicite (payload) => doit etre un compte clinicien
    if requested_assignee is None:
      return requester_id

    if is_admin_role(requester_role) and requested_assignee == requester_id:
      return requested_assignee

    if not self._repository.is_clinician(requested_assignee):
      raise ApplicationError("Assigned clinician must be a clinician account", 400)
    return requested_assignee


def _normalize_sex(value: Any) -> str | None:
  if not isinstance(value, str):
    return None
  normalized = value.strip().upper()
  return normalized if normalized in ("MALE", "FEMALE", "OTHER", "UNKNOWN") else None


def _normalize_status_create(value: Any) -> str:
  if not isinstance(value, str) or not value.strip():
    return "pending"
  normalized = value.strip().lower()
  return normalized if normalized in ("pending", "active", "completed") else "pending"


def _normalize_status_update(value: Any) -> str | None:
  if not isinstance(value, str) or not value.strip():
    return None
  normalized = value.strip().lower()
  return normalized if normalized in ("pending", "active", "completed") else None


def _parse_birth_parts(payload: dict[str, Any]) -> tuple[int | None, int | None, int | None]:
  year = payload.get("birth_date_year")
  month = payload.get("birth_date_month")
  day = payload.get("birth_date_day")
  if isinstance(year, int) or isinstance(month, int) or isinstance(day, int):
    return (
      int(year) if isinstance(year, int) else None,
      int(month) if isinstance(month, int) else None,
      int(day) if isinstance(day, int) else None,
    )

  birth_date = payload.get("birthDate")
  if isinstance(birth_date, str) and birth_date.strip():
    try:
      parsed = datetime.fromisoformat(birth_date.strip().replace("Z", "+00:00"))
      return parsed.year, parsed.month, parsed.day
    except ValueError:
      return None, None, None

  age = payload.get("age")
  if isinstance(age, int):
    return datetime.now().year - age, None, None
  if isinstance(age, float):
    return datetime.now().year - int(age), None, None
  return None, None, None


def _compose_partial_date(
  year: int | None,
  month: int | None,
  day: int | None,
) -> tuple[str | None, str | None]:
  if year is None:
    return None, None

  precision = "year"
  normalized_month = 1
  normalized_day = 1
  if month is not None:
    normalized_month = month
    precision = "month"
  if day is not None:
    normalized_day = day
    precision = "day"

  try:
    return date(year, normalized_month, normalized_day).isoformat(), precision
  except ValueError:
    raise ApplicationError("Invalid birth date components", 400)


def _extract_assigned_clinician_id_from_payload(payload: dict[str, Any]) -> int | None:
  raw = payload.get("assigned_clinician_id")
  if raw is None:
    raw = payload.get("assignedClinicianId")
  return read_optional_int(raw)

