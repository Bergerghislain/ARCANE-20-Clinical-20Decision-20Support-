from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from backend_fastapi.app.application.errors import ApplicationError
from backend_fastapi.app.application.services.patient_clinical_service import (
  PatientClinicalService,
)


@pytest.fixture
def patient_repo() -> MagicMock:
  repo = MagicMock()
  repo.find_patient.return_value = {
    "id_patient": 1,
    "assigned_clinician_id": 10,
  }
  return repo


@pytest.fixture
def write_repo() -> MagicMock:
  return MagicMock()


@pytest.fixture
def service(patient_repo: MagicMock, write_repo: MagicMock) -> PatientClinicalService:
  return PatientClinicalService(patient_repo, write_repo)


def test_create_measure_delegates(service: PatientClinicalService, write_repo: MagicMock) -> None:
  write_repo.create_measure.return_value = {"id": 5, "measureType": "WEIGHT", "measureUnit": "kg"}
  payload = {"measureType": "WEIGHT", "measureUnit": "kg", "measureValue": 70}

  result = service.create_measure(1, payload, requester_id=10, requester_role="clinician")

  write_repo.create_measure.assert_called_once_with(1, payload)
  assert result["id"] == 5


def test_create_measure_denied_for_other_clinician(
  service: PatientClinicalService,
  patient_repo: MagicMock,
  write_repo: MagicMock,
) -> None:
  patient_repo.find_patient.return_value = {
    "id_patient": 1,
    "assigned_clinician_id": 99,
  }

  with pytest.raises(ApplicationError) as exc:
    service.create_measure(
      1,
      {"measureType": "WEIGHT", "measureUnit": "kg"},
      requester_id=10,
      requester_role="clinician",
    )

  assert exc.value.status_code == 403
  write_repo.create_measure.assert_not_called()


def test_create_surgery_maps_unknown_primary_cancer(
  service: PatientClinicalService,
  write_repo: MagicMock,
) -> None:
  write_repo.create_surgery.side_effect = ValueError("primary_cancer_not_found")

  with pytest.raises(ApplicationError) as exc:
    service.create_surgery(
      1,
      {"surgeryType": "Lobectomy", "primaryCancerId": 999},
      requester_id=10,
      requester_role="clinician",
    )

  assert exc.value.status_code == 404
