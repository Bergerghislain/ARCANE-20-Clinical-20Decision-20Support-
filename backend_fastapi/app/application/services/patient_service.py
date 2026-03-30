from __future__ import annotations

import json
import time
from datetime import datetime
from typing import Any

from ..errors import ApplicationError
from ..ports.patient_ports import PatientRepositoryPort


class PatientService:
  def __init__(self, repository: PatientRepositoryPort):
    self._repository = repository

  def list_patients(self) -> list[dict[str, Any]]:
    return self._repository.list_patients()

  def get_patient(self, patient_id: int) -> dict[str, Any]:
    row = self._repository.find_patient(patient_id)
    if not row:
      raise ApplicationError("Patient not found", 404)
    return row

  def add_patient(self, payload: dict[str, Any], user_id: int) -> dict[str, Any]:
    ipp_raw = payload.get("ipp")
    ipp = ipp_raw.strip() if isinstance(ipp_raw, str) and ipp_raw.strip() else None
    if ipp is None:
      ipp = f"ARC-{user_id}-{int(time.time() * 1000)}"

    birth_year, birth_month, birth_day = _parse_birth_parts(payload)
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
        "sex": _normalize_sex(payload.get("sex") or payload.get("gender")),
        "condition": payload.get("condition"),
        "status": _normalize_status_create(payload.get("status")),
        "health_info": health_info_json,
        "created_by": user_id,
        "updated_by": user_id,
      }
    )
    if patient_id is None:
      raise ApplicationError("Failed to create patient", 500)
    return {"id": patient_id}

  def update_patient(self, patient_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    existing = self._repository.find_patient(patient_id)
    if not existing:
      raise ApplicationError("Patient not found", 404)

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
      updates["birth_date_year"] = birth_year
      updates["birth_date_month"] = birth_month
      updates["birth_date_day"] = birth_day

    if "gender" in payload or "sex" in payload:
      updates["sex"] = _normalize_sex(payload.get("sex") or payload.get("gender"))

    if not updates:
      raise ApplicationError("No fields to update", 400)

    updated = self._repository.update_patient(patient_id, updates)
    if not updated:
      raise ApplicationError("Failed to update patient", 500)
    return updated

  def import_patient_json(self, payload: dict[str, Any]) -> dict[str, Any]:
    if not payload or not payload.get("ipp"):
      raise ApplicationError("Missing ipp in payload", 400)
    try:
      patient_id = self._repository.import_patient_payload(payload)
    except Exception as exc:
      raise ApplicationError(f"Failed to import patient: {exc}", 500)
    return {"id": patient_id}

  def get_patient_profile(self, patient_id: int) -> dict[str, Any]:
    patient = self._repository.find_patient(patient_id)
    if not patient:
      raise ApplicationError("Patient not found", 404)
    profile = self._repository.find_patient_profile(patient_id)
    return {
      "patient_id": patient_id,
      "source": "persisted" if profile else "none",
      "profile": profile,
    }

  def save_patient_profile(self, patient_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    patient = self._repository.find_patient(patient_id)
    if not patient:
      raise ApplicationError("Patient not found", 404)

    profile = dict(payload)
    profile["patientId"] = str(patient_id)
    saved = self._repository.save_patient_profile(patient_id, profile)
    if not saved:
      raise ApplicationError("Failed to save patient profile", 500)

    return {
      "patient_id": patient_id,
      "source": "persisted",
      "profile": saved,
    }


def _normalize_sex(value: Any) -> str | None:
  if not isinstance(value, str):
    return None
  normalized = value.strip().upper()
  return normalized if normalized in ("MALE", "FEMALE", "OTHER") else None


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

