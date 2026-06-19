"""Tests unitaires du depot d'ecriture du dossier clinique (SqlPatientClinicalWriteRepository).

Aucune base reelle: on remplace fetch_one/execute par un faux moteur qui route
selon le SQL. Couvre create/update/delete de chaque section + les chemins d'erreur
(primary_cancer_not_found, specimen_not_found).
"""
from __future__ import annotations

from typing import Any

import pytest

import backend_fastapi.app.db as db_module
import backend_fastapi.app.infrastructure.repositories.patient_clinical_write as mod
from backend_fastapi.app.infrastructure.repositories.patient_clinical_write import (
  SqlPatientClinicalWriteRepository,
)


class FakeDb:
  """Faux moteur SQL: route selon des fragments de requete."""

  def __init__(
    self,
    *,
    row: dict[str, Any] | None = None,
    primary_exists: bool = True,
    specimen_exists: bool = True,
    deleted: int = 1,
    biomarkers: list[dict[str, Any]] | None = None,
  ) -> None:
    self.row = row
    self.primary_exists = primary_exists
    self.specimen_exists = specimen_exists
    self.deleted = deleted
    self.biomarkers = biomarkers or []
    self.executed: list[tuple[str, tuple]] = []

  def fetch_one(self, query: str, params: tuple = ()) -> dict[str, Any] | None:  # noqa: ANN001
    if "FROM primary_cancers WHERE id" in query:
      return {"ok": 1} if self.primary_exists else None
    if "FROM biological_specimens WHERE id" in query:
      return {"ok": 1} if self.specimen_exists else None
    return self.row

  def fetch_all(self, query: str, params: tuple = ()) -> list[dict[str, Any]]:  # noqa: ANN001
    return list(self.biomarkers)

  def execute(self, query: str, params: tuple = ()) -> int:  # noqa: ANN001
    self.executed.append((query, params))
    return self.deleted


@pytest.fixture
def repo() -> SqlPatientClinicalWriteRepository:
  return SqlPatientClinicalWriteRepository()


def _install(monkeypatch: pytest.MonkeyPatch, fake: FakeDb) -> None:
  monkeypatch.setattr(mod, "fetch_one", fake.fetch_one)
  monkeypatch.setattr(mod, "execute", fake.execute)
  # update_specimen importe fetch_all depuis backend_fastapi.app.db a l'execution.
  monkeypatch.setattr(db_module, "fetch_all", fake.fetch_all)


# --- Measures ---
def test_create_measure(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row={"id": 5, "measure_type": "WEIGHT", "measure_unit": "kg"}))
  out = repo.create_measure(1, {"measureType": "WEIGHT", "measureUnit": "kg", "measureValue": 70})
  assert out["id"] == 5
  assert out["measureType"] == "WEIGHT"


def test_update_measure_found(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row={"id": 9, "measure_type": "HEIGHT", "measure_unit": "cm"}))
  out = repo.update_measure(1, 9, {"measureType": "HEIGHT", "measureUnit": "cm"})
  assert out is not None and out["id"] == 9


def test_update_measure_missing_returns_none(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row=None))
  assert repo.update_measure(1, 9, {"measureType": "X", "measureUnit": "kg"}) is None


def test_delete_measure(monkeypatch, repo):
  fake = FakeDb(deleted=1)
  _install(monkeypatch, fake)
  assert repo.delete_measure(1, 9) is True
  fake.deleted = 0
  assert repo.delete_measure(1, 9) is False


# --- Medications ---
def test_create_and_update_medication(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row={"id": 3, "medication_name": "Aspirine"}))
  created = repo.create_medication(1, {"medicationName": "Aspirine"})
  assert created["id"] == 3 and created["medicationName"] == "Aspirine"
  updated = repo.update_medication(1, 3, {"medicationName": "Aspirine"})
  assert updated is not None and updated["id"] == 3


def test_update_medication_missing(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row=None))
  assert repo.update_medication(1, 3, {"medicationName": "X"}) is None


def test_delete_medication(monkeypatch, repo):
  _install(monkeypatch, FakeDb(deleted=1))
  assert repo.delete_medication(1, 3) is True


# --- Surgeries (avec primary_cancer) ---
def test_create_surgery_with_valid_primary_cancer(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row={"id": 7, "primary_cancer_id": 4, "surgery_type": "Lobectomy"}, primary_exists=True))
  out = repo.create_surgery(1, {"surgeryType": "Lobectomy", "primaryCancerId": 4})
  assert out["id"] == 7
  assert out["primaryCancerId"] == 4


def test_create_surgery_unknown_primary_cancer_raises(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row={"id": 7}, primary_exists=False))
  with pytest.raises(ValueError, match="primary_cancer_not_found"):
    repo.create_surgery(1, {"surgeryType": "Lobectomy", "primaryCancerId": 999})


def test_create_surgery_without_primary_cancer(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row={"id": 8, "surgery_type": "Biopsy"}))
  out = repo.create_surgery(1, {"surgeryType": "Biopsy"})
  assert out["id"] == 8
  assert "primaryCancerId" not in out


def test_update_surgery_missing(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row=None))
  assert repo.update_surgery(1, 7, {"surgeryType": "X"}) is None


def test_delete_surgery(monkeypatch, repo):
  _install(monkeypatch, FakeDb(deleted=1))
  assert repo.delete_surgery(1, 7) is True


# --- Radiotherapy ---
def test_create_and_update_radiotherapy(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row={"id": 11, "modality": "EBRT"}))
  created = repo.create_radiotherapy(1, {"modality": "EBRT"})
  assert created["id"] == 11
  updated = repo.update_radiotherapy(1, 11, {"modality": "EBRT"})
  assert updated is not None and updated["id"] == 11


def test_delete_radiotherapy(monkeypatch, repo):
  _install(monkeypatch, FakeDb(deleted=0))
  assert repo.delete_radiotherapy(1, 11) is False


# --- Imaging ---
def test_create_update_delete_imaging(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row={"id": 21, "study_type": "CT"}))
  assert repo.create_imaging_study(1, {"studyType": "CT"})["id"] == 21
  assert repo.update_imaging_study(1, 21, {"studyType": "CT"})["id"] == 21
  _install(monkeypatch, FakeDb(row=None))
  assert repo.update_imaging_study(1, 21, {"studyType": "CT"}) is None


# --- TNM ---
def test_create_tnm_event_valid(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row={"id": 31, "t_category": "T1"}, primary_exists=True))
  out = repo.create_tnm_event(1, 4, {"tCategory": "T1"})
  assert out["id"] == 31


def test_create_tnm_event_unknown_cancer(monkeypatch, repo):
  _install(monkeypatch, FakeDb(primary_exists=False))
  with pytest.raises(ValueError, match="primary_cancer_not_found"):
    repo.create_tnm_event(1, 999, {"tCategory": "T1"})


def test_update_tnm_event_unknown_cancer(monkeypatch, repo):
  _install(monkeypatch, FakeDb(primary_exists=False))
  with pytest.raises(ValueError, match="primary_cancer_not_found"):
    repo.update_tnm_event(1, 999, 31, {"tCategory": "T2"})


def test_update_tnm_event_missing_row(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row=None, primary_exists=True))
  assert repo.update_tnm_event(1, 4, 31, {"tCategory": "T2"}) is None


def test_delete_tnm_event(monkeypatch, repo):
  _install(monkeypatch, FakeDb(deleted=1, primary_exists=True))
  assert repo.delete_tnm_event(1, 4, 31) is True


def test_delete_tnm_event_unknown_cancer(monkeypatch, repo):
  _install(monkeypatch, FakeDb(primary_exists=False))
  with pytest.raises(ValueError, match="primary_cancer_not_found"):
    repo.delete_tnm_event(1, 999, 31)


# --- Specimens + biomarkers ---
def test_create_specimen(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row={"id": 41, "specimen_identifier": "S1"}))
  out = repo.create_specimen(1, {"specimenIdentifier": "S1", "imaging": {"k": "v"}})
  assert out["id"] == 41


def test_update_specimen_found_loads_biomarkers(monkeypatch, repo):
  fake = FakeDb(
    row={"id": 41, "specimen_identifier": "S1"},
    biomarkers=[{"id": 1, "biomarker_name": "EGFR"}],
  )
  _install(monkeypatch, fake)
  out = repo.update_specimen(1, 41, {"specimenIdentifier": "S1"})
  assert out is not None and out["id"] == 41
  assert out["biomarker"][0]["biomarkerName"] == "EGFR"


def test_update_specimen_missing(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row=None))
  assert repo.update_specimen(1, 41, {"specimenIdentifier": "S1"}) is None


def test_delete_specimen(monkeypatch, repo):
  _install(monkeypatch, FakeDb(deleted=1))
  assert repo.delete_specimen(1, 41) is True


def test_create_biomarker_valid(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row={"id": 51, "biomarker_name": "EGFR"}, specimen_exists=True))
  out = repo.create_biomarker(1, 41, {"biomarkerName": "EGFR"})
  assert out["id"] == 51


def test_create_biomarker_specimen_missing(monkeypatch, repo):
  _install(monkeypatch, FakeDb(specimen_exists=False))
  with pytest.raises(ValueError, match="specimen_not_found"):
    repo.create_biomarker(1, 41, {"biomarkerName": "EGFR"})


def test_update_biomarker_valid(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row={"id": 51, "biomarker_name": "KRAS"}, specimen_exists=True))
  out = repo.update_biomarker(1, 41, 51, {"biomarkerName": "KRAS"})
  assert out is not None and out["id"] == 51


def test_update_biomarker_specimen_missing(monkeypatch, repo):
  _install(monkeypatch, FakeDb(specimen_exists=False))
  with pytest.raises(ValueError, match="specimen_not_found"):
    repo.update_biomarker(1, 41, 51, {"biomarkerName": "KRAS"})


def test_update_biomarker_missing_row(monkeypatch, repo):
  _install(monkeypatch, FakeDb(row=None, specimen_exists=True))
  assert repo.update_biomarker(1, 41, 51, {"biomarkerName": "KRAS"}) is None


def test_delete_biomarker_valid(monkeypatch, repo):
  _install(monkeypatch, FakeDb(deleted=1, specimen_exists=True))
  assert repo.delete_biomarker(1, 41, 51) is True


def test_delete_biomarker_specimen_missing(monkeypatch, repo):
  _install(monkeypatch, FakeDb(specimen_exists=False))
  with pytest.raises(ValueError, match="specimen_not_found"):
    repo.delete_biomarker(1, 41, 51)
