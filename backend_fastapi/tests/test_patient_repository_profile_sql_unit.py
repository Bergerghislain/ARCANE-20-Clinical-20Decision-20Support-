from __future__ import annotations

from backend_fastapi.app.infrastructure.repositories.patient_repository import (
  SqlPatientRepository,
)


def test_find_patient_profile_prefers_dedicated_table(monkeypatch):
  def fake_fetch_one(query: str, params: tuple = ()):  # noqa: ANN001
    if "FROM patient_profiles" in query:
      return {
        "profile_data": {"patientId": "7", "diagnosis": "dedie", "schemaVersion": 1},
        "profile_version": 4,
        "schema_version": 2,
      }
    raise AssertionError("legacy health_info ne doit pas etre interroge si table remplie")

  monkeypatch.setattr(
    "backend_fastapi.app.infrastructure.repositories.patient_repository._patient_profiles_table_exists",
    lambda: True,
  )
  monkeypatch.setattr(
    "backend_fastapi.app.infrastructure.repositories.patient_repository.fetch_one",
    fake_fetch_one,
  )
  out = SqlPatientRepository().find_patient_profile(7)
  assert out is not None
  assert out["profile_version"] == 4
  assert out["schema_version"] == 2
  assert out["profile"]["diagnosis"] == "dedie"


def test_find_patient_profile_falls_back_to_health_info(monkeypatch):
  queries: list[str] = []

  def fake_fetch_one(query: str, params: tuple = ()):  # noqa: ANN001
    queries.append(query)
    if "FROM patient_profiles" in query:
      return None
    if "health_info" in query and "patients" in query:
      return {
        "health_info": {
          "manual_profile": {"patientId": "2", "schemaVersion": 1, "diagnosis": "legacy"},
          "manual_profile_version": 1,
          "manual_profile_schema_version": 1,
        },
      }
    return None

  monkeypatch.setattr(
    "backend_fastapi.app.infrastructure.repositories.patient_repository._patient_profiles_table_exists",
    lambda: True,
  )
  monkeypatch.setattr(
    "backend_fastapi.app.infrastructure.repositories.patient_repository.fetch_one",
    fake_fetch_one,
  )
  out = SqlPatientRepository().find_patient_profile(2)
  assert out is not None
  assert out["profile_version"] == 1
  assert out["profile"]["diagnosis"] == "legacy"
