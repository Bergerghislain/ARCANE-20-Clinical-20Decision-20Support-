from __future__ import annotations

from unittest.mock import patch

import pytest

from backend_fastapi.app.infrastructure.repositories import patient_clinical_write as mod


def test_entity_out_includes_primary_cancer_id():
  row = {"id": 5, "primary_cancer_id": 9, "measure_type": "WEIGHT"}
  out = mod._entity_out(row, lambda r: {"measureType": r["measure_type"]}, include_primary_cancer=True)
  assert out["primaryCancerId"] == 9


def test_resolve_primary_cancer_id_raises_when_missing():
  with patch.object(mod, "fetch_one", return_value=None):
    with pytest.raises(ValueError, match="primary_cancer_not_found"):
      mod._resolve_primary_cancer_id(1, 99)


@patch.object(mod, "fetch_one")
def test_update_surgery_returns_none_when_missing(fetch_one_mock):
  fetch_one_mock.return_value = None
  repo = mod.SqlPatientClinicalWriteRepository()
  with patch.object(mod, "_resolve_primary_cancer_id", return_value=1):
    assert repo.update_surgery(1, 99, {"surgeryType": "X", "primaryCancerId": 1}) is None


@patch.object(mod, "fetch_one")
def test_update_radiotherapy_and_imaging(fetch_one_mock):
  fetch_one_mock.side_effect = [
    {"id": 1, "primary_cancer_id": 2, "modality": "EBRT"},
    {"id": 2, "primary_cancer_id": 2, "study_type": "MRI"},
  ]
  repo = mod.SqlPatientClinicalWriteRepository()
  with patch.object(mod, "_resolve_primary_cancer_id", return_value=2):
    radio = repo.update_radiotherapy(1, 1, {"modality": "EBRT", "primaryCancerId": 2})
    imaging = repo.update_imaging_study(1, 2, {"studyType": "MRI", "primaryCancerId": 2})
  assert radio is not None
  assert imaging is not None


@patch.object(mod, "execute", return_value=1)
@patch.object(mod, "fetch_one", return_value=None)
def test_delete_helpers_return_boolean(fetch_one_mock, execute_mock):
  repo = mod.SqlPatientClinicalWriteRepository()
  with patch.object(mod, "_primary_cancer_belongs_to_patient", return_value=True):
    assert repo.delete_radiotherapy(1, 1) is True
    assert repo.delete_imaging_study(1, 1) is True
    assert repo.delete_tnm_event(1, 1, 1) is True
  assert repo.delete_medication(1, 1) is True
