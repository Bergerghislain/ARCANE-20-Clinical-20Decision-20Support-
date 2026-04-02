from __future__ import annotations

import json
import time
from datetime import UTC, date, datetime
from typing import Any

from ..errors import ApplicationError
from ..ports.patient_ports import PatientRepositoryPort

CURRENT_PROFILE_SCHEMA_VERSION = 2
SUPPORTED_PROFILE_SCHEMA_VERSIONS = {1, 2}


class PatientService:
  def __init__(self, repository: PatientRepositoryPort):
    self._repository = repository

  def list_patients(
    self,
    requester_id: int,
    requester_role: str,
    limit: int | None = None,
    offset: int = 0,
  ) -> list[dict[str, Any]]:
    if _is_admin_role(requester_role):
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
    _assert_can_access_patient(
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
    _assert_can_access_patient(
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
      _assert_can_access_patient(
        patient=existing,
        requester_id=requester_id,
        requester_role=requester_role,
      )
      if _is_admin_role(requester_role):
        requested_assignee = _extract_assigned_clinician_id_from_payload(payload)
        if requested_assignee is not None:
          if not self._repository.is_active_clinician(requested_assignee):
            raise ApplicationError("Assigned clinician must be an active clinician", 400)
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
    patient = self._repository.find_patient(patient_id)
    if not patient:
      raise ApplicationError("Patient not found", 404)
    _assert_can_access_patient(
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
    migrated_profile = _migrate_profile_to_current(raw_profile, patient_id)
    profile_version = _safe_int(record.get("profile_version"), default=0)
    migrated_profile["profileVersion"] = profile_version
    stored_schema_version = _safe_int(record.get("schema_version"), default=1)
    return {
      "patient_id": patient_id,
      "source": "persisted",
      "profile": migrated_profile,
      "profile_version": profile_version,
      "stored_schema_version": stored_schema_version,
    }

  def save_patient_profile(
    self,
    patient_id: int,
    payload: dict[str, Any],
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    patient = self._repository.find_patient(patient_id)
    if not patient:
      raise ApplicationError("Patient not found", 404)
    _assert_can_access_patient(
      patient=patient,
      requester_id=requester_id,
      requester_role=requester_role,
    )

    expected_version = _read_expected_profile_version(payload)
    profile = dict(payload)
    profile.pop("profileVersion", None)
    migrated_profile = _migrate_profile_to_current(profile, patient_id)
    save_result = self._repository.save_patient_profile(
      patient_id,
      migrated_profile,
      expected_version=expected_version,
    )
    if not save_result:
      raise ApplicationError("Failed to save patient profile", 500)
    if save_result.get("status") == "conflict":
      current_version = _safe_int(save_result.get("current_version"), default=0)
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
    saved_profile["profileVersion"] = _safe_int(save_result.get("profile_version"), default=0)

    return {
      "patient_id": patient_id,
      "source": "persisted",
      "profile": saved_profile,
      "profile_version": _safe_int(save_result.get("profile_version"), default=0),
      "stored_schema_version": _safe_int(
        save_result.get("schema_version"),
        default=CURRENT_PROFILE_SCHEMA_VERSION,
      ),
    }

  def reassign_patient(
    self,
    patient_id: int,
    new_clinician_id: int,
    requester_id: int,
    requester_role: str,
  ) -> dict[str, Any]:
    if not _is_admin_role(requester_role):
      raise ApplicationError("Only admins can reassign patients", 403)

    patient = self._repository.find_patient(patient_id)
    if not patient:
      raise ApplicationError("Patient not found", 404)

    if not self._repository.is_active_clinician(new_clinician_id):
      raise ApplicationError("Assigned clinician must be an active clinician", 400)

    current_assignee = _read_optional_int(patient.get("assigned_clinician_id"))
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
    if not _is_admin_role(requester_role):
      return requester_id

    requested_assignee = _extract_assigned_clinician_id_from_payload(payload)
    if requested_assignee is None:
      requested_assignee = self._repository.get_default_active_clinician_id()
      if requested_assignee is None:
        raise ApplicationError(
          (
            "No active clinician found. "
            "Create or activate at least one clinician before adding a patient."
          ),
          400,
        )

    if not self._repository.is_active_clinician(requested_assignee):
      raise ApplicationError("Assigned clinician must be an active clinician", 400)
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


def _safe_int(value: Any, default: int = 0) -> int:
  if isinstance(value, int):
    return int(value)
  if isinstance(value, str):
    try:
      return int(value)
    except ValueError:
      return default
  return default


def _read_expected_profile_version(payload: dict[str, Any]) -> int | None:
  version_value = payload.get("profileVersion")
  if version_value is None:
    return None
  version = _safe_int(version_value, default=-1)
  if version < 0:
    raise ApplicationError("Invalid profileVersion", 400)
  return version


def _now_utc_iso() -> str:
  return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _migrate_profile_to_current(profile: dict[str, Any], patient_id: int) -> dict[str, Any]:
  migrated = dict(profile)
  raw_schema = migrated.get("schemaVersion")
  schema_version = _safe_int(raw_schema, default=1)
  if schema_version not in SUPPORTED_PROFILE_SCHEMA_VERSIONS:
    raise ApplicationError(
      (
        "Unsupported schemaVersion. "
        f"Supported values are {sorted(SUPPORTED_PROFILE_SCHEMA_VERSIONS)}."
      ),
      400,
    )

  migrated["patientId"] = str(patient_id)
  if schema_version == 1:
    # Migration v1 -> v2:
    # - on preserve le payload clinique
    # - on enrichit avec reportMeta pour tracer la generation/compatibilite
    migrated["schemaVersion"] = CURRENT_PROFILE_SCHEMA_VERSION
    report_meta = migrated.get("reportMeta")
    if not isinstance(report_meta, dict):
      migrated["reportMeta"] = {
        "generator": "argos-profile-migrator-v2",
        "generatedAt": _now_utc_iso(),
      }
  else:
    migrated["schemaVersion"] = CURRENT_PROFILE_SCHEMA_VERSION
    report_meta = migrated.get("reportMeta")
    if not isinstance(report_meta, dict):
      report_meta = {}
    report_meta.setdefault("generator", "argos-profile-v2")
    report_meta.setdefault("generatedAt", _now_utc_iso())
    migrated["reportMeta"] = report_meta

  return migrated


def _is_admin_role(role: str) -> bool:
  return role.strip().lower() == "admin"


def _read_optional_int(value: Any) -> int | None:
  if isinstance(value, int):
    return value
  if isinstance(value, str):
    try:
      return int(value)
    except ValueError:
      return None
  return None


def _extract_assigned_clinician_id_from_payload(payload: dict[str, Any]) -> int | None:
  raw = payload.get("assigned_clinician_id")
  if raw is None:
    raw = payload.get("assignedClinicianId")
  return _read_optional_int(raw)


def _assert_can_access_patient(
  *,
  patient: dict[str, Any],
  requester_id: int,
  requester_role: str,
) -> None:
  if _is_admin_role(requester_role):
    return

  assigned_clinician_id = _read_optional_int(patient.get("assigned_clinician_id"))
  if assigned_clinician_id is None:
    raise ApplicationError("Patient has no assigned clinician", 500)

  if assigned_clinician_id != requester_id:
    raise ApplicationError("Access denied for this patient", 403)

