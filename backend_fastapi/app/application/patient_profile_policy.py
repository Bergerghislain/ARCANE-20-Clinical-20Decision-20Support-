"""Regles metier et migration de profil patient (sans acces base)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from .errors import ApplicationError

CURRENT_PROFILE_SCHEMA_VERSION = 2
SUPPORTED_PROFILE_SCHEMA_VERSIONS = {1, 2}


def is_admin_role(role: str) -> bool:
  return role.strip().lower() == "admin"


def safe_int(value: Any, default: int = 0) -> int:
  if isinstance(value, int):
    return int(value)
  if isinstance(value, str):
    try:
      return int(value)
    except ValueError:
      return default
  return default


def read_optional_int(value: Any) -> int | None:
  if isinstance(value, int):
    return value
  if isinstance(value, str):
    try:
      return int(value)
    except ValueError:
      return None
  return None


def read_expected_profile_version(payload: dict[str, Any]) -> int | None:
  version_value = payload.get("profileVersion")
  if version_value is None:
    return None
  version = safe_int(version_value, default=-1)
  if version < 0:
    raise ApplicationError("Invalid profileVersion", 400)
  return version


def now_utc_iso() -> str:
  return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def migrate_profile_to_current(profile: dict[str, Any], patient_id: int) -> dict[str, Any]:
  migrated = dict(profile)
  raw_schema = migrated.get("schemaVersion")
  schema_version = safe_int(raw_schema, default=1)
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
    migrated["schemaVersion"] = CURRENT_PROFILE_SCHEMA_VERSION
    report_meta = migrated.get("reportMeta")
    if not isinstance(report_meta, dict):
      migrated["reportMeta"] = {
        "generator": "argos-profile-migrator-v2",
        "generatedAt": now_utc_iso(),
      }
  else:
    migrated["schemaVersion"] = CURRENT_PROFILE_SCHEMA_VERSION
    report_meta = migrated.get("reportMeta")
    if not isinstance(report_meta, dict):
      report_meta = {}
    report_meta.setdefault("generator", "argos-profile-v2")
    report_meta.setdefault("generatedAt", now_utc_iso())
    migrated["reportMeta"] = report_meta

  return migrated


def assert_can_access_patient(
  *,
  patient: dict[str, Any],
  requester_id: int,
  requester_role: str,
) -> None:
  if is_admin_role(requester_role):
    return

  assigned_clinician_id = read_optional_int(patient.get("assigned_clinician_id"))
  if assigned_clinician_id is None:
    raise ApplicationError("Patient has no assigned clinician", 500)

  if assigned_clinician_id != requester_id:
    raise ApplicationError("Access denied for this patient", 403)
