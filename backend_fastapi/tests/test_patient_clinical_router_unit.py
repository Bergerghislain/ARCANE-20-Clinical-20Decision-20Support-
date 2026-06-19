from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend_fastapi.app.application.errors import ApplicationError
from backend_fastapi.app.application.services.patient_clinical_service import PatientClinicalService
from backend_fastapi.app.deps import get_patient_clinical_service
from backend_fastapi.app.main import app


def _client_with_service(service: MagicMock) -> TestClient:
  from backend_fastapi.app import deps

  app.dependency_overrides[deps.get_current_user] = lambda: {"id": 1, "role": "admin"}
  app.dependency_overrides[get_patient_clinical_service] = lambda: service
  return TestClient(app)


@pytest.fixture
def service() -> MagicMock:
  svc = MagicMock(spec=PatientClinicalService)
  svc.create_measure.return_value = {"id": 1}
  svc.update_measure.return_value = {"id": 1}
  svc.delete_measure.return_value = None
  svc.create_medication.return_value = {"id": 2}
  svc.update_medication.return_value = {"id": 2}
  svc.delete_medication.return_value = None
  svc.create_surgery.return_value = {"id": 3}
  svc.update_surgery.return_value = {"id": 3}
  svc.delete_surgery.return_value = None
  svc.create_radiotherapy.return_value = {"id": 4}
  svc.update_radiotherapy.return_value = {"id": 4}
  svc.delete_radiotherapy.return_value = None
  svc.create_imaging_study.return_value = {"id": 5}
  svc.update_imaging_study.return_value = {"id": 5}
  svc.delete_imaging_study.return_value = None
  svc.create_tnm_event.return_value = {"id": 6}
  svc.update_tnm_event.return_value = {"id": 6}
  svc.delete_tnm_event.return_value = None
  svc.create_specimen.return_value = {"id": 7}
  svc.update_specimen.return_value = {"id": 7}
  svc.delete_specimen.return_value = None
  svc.create_biomarker.return_value = {"id": 8}
  svc.update_biomarker.return_value = {"id": 8}
  svc.delete_biomarker.return_value = None
  return svc


def test_router_measure_endpoints(service: MagicMock):
  with _client_with_service(service) as client:
    assert client.post(
      "/api/patients/1/clinical/measures",
      json={"measureType": "WEIGHT", "measureUnit": "kg", "measureValue": 70},
    ).status_code == 201
    assert client.put(
      "/api/patients/1/clinical/measures/1",
      json={"measureType": "WEIGHT", "measureUnit": "kg", "measureValue": 71},
    ).status_code == 200
    assert client.delete("/api/patients/1/clinical/measures/1").status_code == 204
  app.dependency_overrides.clear()


def test_router_medication_surgery_radiotherapy_imaging_endpoints(service: MagicMock):
  med = {"medicationName": "A", "dosage": "1", "frequency": "daily"}
  surgery = {"surgeryType": "Biopsie", "primaryCancerId": 1}
  radio = {"modality": "EBRT", "primaryCancerId": 1}
  imaging = {"studyType": "MRI", "primaryCancerId": 1}
  with _client_with_service(service) as client:
    assert client.post("/api/patients/1/clinical/medications", json=med).status_code == 201
    assert client.put("/api/patients/1/clinical/medications/2", json=med).status_code == 200
    assert client.delete("/api/patients/1/clinical/medications/2").status_code == 204
    assert client.post("/api/patients/1/clinical/surgeries", json=surgery).status_code == 201
    assert client.put("/api/patients/1/clinical/surgeries/3", json=surgery).status_code == 200
    assert client.delete("/api/patients/1/clinical/surgeries/3").status_code == 204
    assert client.post("/api/patients/1/clinical/radiotherapies", json=radio).status_code == 201
    assert client.put("/api/patients/1/clinical/radiotherapies/4", json=radio).status_code == 200
    assert client.delete("/api/patients/1/clinical/radiotherapies/4").status_code == 204
    assert client.post("/api/patients/1/clinical/imaging-studies", json=imaging).status_code == 201
    assert client.put("/api/patients/1/clinical/imaging-studies/5", json=imaging).status_code == 200
    assert client.delete("/api/patients/1/clinical/imaging-studies/5").status_code == 204
  app.dependency_overrides.clear()


def test_router_tnm_specimen_biomarker_endpoints(service: MagicMock):
  tnm = {"tnmVersion": "8", "tCategory": "T1", "nCategory": "N0", "mCategory": "M0"}
  specimen = {"specimenIdentifier": "S1", "specimenNature": "TUMORAL"}
  bio = {"biomarkerName": "PD-L1", "biomarkerValue": "10"}
  with _client_with_service(service) as client:
    assert client.post(
      "/api/patients/1/clinical/primary-cancers/1/tnm-events",
      json=tnm,
    ).status_code == 201
    assert client.put(
      "/api/patients/1/clinical/primary-cancers/1/tnm-events/6",
      json=tnm,
    ).status_code == 200
    assert client.delete(
      "/api/patients/1/clinical/primary-cancers/1/tnm-events/6",
    ).status_code == 204
    assert client.post("/api/patients/1/clinical/specimens", json=specimen).status_code == 201
    assert client.put("/api/patients/1/clinical/specimens/7", json=specimen).status_code == 200
    assert client.delete("/api/patients/1/clinical/specimens/7").status_code == 204
    assert client.post(
      "/api/patients/1/clinical/specimens/7/biomarkers",
      json=bio,
    ).status_code == 201
    assert client.put(
      "/api/patients/1/clinical/specimens/7/biomarkers/8",
      json=bio,
    ).status_code == 200
    assert client.delete(
      "/api/patients/1/clinical/specimens/7/biomarkers/8",
    ).status_code == 204
  app.dependency_overrides.clear()


@pytest.mark.parametrize(
  ("method", "path", "attr", "payload"),
  [
    (
      "post",
      "/api/patients/1/clinical/measures",
      "create_measure",
      {"measureType": "WEIGHT", "measureUnit": "kg", "measureValue": 70},
    ),
    (
      "put",
      "/api/patients/1/clinical/measures/1",
      "update_measure",
      {"measureType": "WEIGHT", "measureUnit": "kg", "measureValue": 70},
    ),
    ("delete", "/api/patients/1/clinical/measures/1", "delete_measure", None),
    (
      "post",
      "/api/patients/1/clinical/medications",
      "create_medication",
      {"medicationName": "A", "dosage": "1", "frequency": "daily"},
    ),
    (
      "put",
      "/api/patients/1/clinical/medications/2",
      "update_medication",
      {"medicationName": "A", "dosage": "1", "frequency": "daily"},
    ),
    ("delete", "/api/patients/1/clinical/medications/2", "delete_medication", None),
    (
      "post",
      "/api/patients/1/clinical/surgeries",
      "create_surgery",
      {"surgeryType": "Biopsie", "primaryCancerId": 1},
    ),
    (
      "put",
      "/api/patients/1/clinical/surgeries/3",
      "update_surgery",
      {"surgeryType": "Biopsie", "primaryCancerId": 1},
    ),
    ("delete", "/api/patients/1/clinical/surgeries/3", "delete_surgery", None),
    (
      "post",
      "/api/patients/1/clinical/radiotherapies",
      "create_radiotherapy",
      {"modality": "EBRT", "primaryCancerId": 1},
    ),
    (
      "put",
      "/api/patients/1/clinical/radiotherapies/4",
      "update_radiotherapy",
      {"modality": "EBRT", "primaryCancerId": 1},
    ),
    ("delete", "/api/patients/1/clinical/radiotherapies/4", "delete_radiotherapy", None),
    (
      "post",
      "/api/patients/1/clinical/imaging-studies",
      "create_imaging_study",
      {"studyType": "MRI", "primaryCancerId": 1},
    ),
    (
      "put",
      "/api/patients/1/clinical/imaging-studies/5",
      "update_imaging_study",
      {"studyType": "MRI", "primaryCancerId": 1},
    ),
    ("delete", "/api/patients/1/clinical/imaging-studies/5", "delete_imaging_study", None),
    (
      "post",
      "/api/patients/1/clinical/primary-cancers/1/tnm-events",
      "create_tnm_event",
      {"tnmVersion": "8", "tCategory": "T1", "nCategory": "N0", "mCategory": "M0"},
    ),
    (
      "put",
      "/api/patients/1/clinical/primary-cancers/1/tnm-events/6",
      "update_tnm_event",
      {"tnmVersion": "8", "tCategory": "T1", "nCategory": "N0", "mCategory": "M0"},
    ),
    (
      "delete",
      "/api/patients/1/clinical/primary-cancers/1/tnm-events/6",
      "delete_tnm_event",
      None,
    ),
    (
      "post",
      "/api/patients/1/clinical/specimens",
      "create_specimen",
      {"specimenIdentifier": "S1", "specimenNature": "TUMORAL"},
    ),
    (
      "put",
      "/api/patients/1/clinical/specimens/7",
      "update_specimen",
      {"specimenIdentifier": "S1", "specimenNature": "TUMORAL"},
    ),
    ("delete", "/api/patients/1/clinical/specimens/7", "delete_specimen", None),
    (
      "post",
      "/api/patients/1/clinical/specimens/7/biomarkers",
      "create_biomarker",
      {"biomarkerName": "PD-L1", "biomarkerValue": "10"},
    ),
    (
      "put",
      "/api/patients/1/clinical/specimens/7/biomarkers/8",
      "update_biomarker",
      {"biomarkerName": "PD-L1", "biomarkerValue": "10"},
    ),
    (
      "delete",
      "/api/patients/1/clinical/specimens/7/biomarkers/8",
      "delete_biomarker",
      None,
    ),
  ],
)
def test_router_maps_service_errors_for_all_endpoints(
  service: MagicMock,
  method: str,
  path: str,
  attr: str,
  payload: dict[str, object] | None,
):
  for name in [
    "create_measure",
    "update_measure",
    "delete_measure",
    "create_medication",
    "update_medication",
    "delete_medication",
    "create_surgery",
    "update_surgery",
    "delete_surgery",
    "create_radiotherapy",
    "update_radiotherapy",
    "delete_radiotherapy",
    "create_imaging_study",
    "update_imaging_study",
    "delete_imaging_study",
    "create_tnm_event",
    "update_tnm_event",
    "delete_tnm_event",
    "create_specimen",
    "update_specimen",
    "delete_specimen",
    "create_biomarker",
    "update_biomarker",
    "delete_biomarker",
  ]:
    getattr(service, name).side_effect = None
  getattr(service, attr).side_effect = ApplicationError("fail", 404)

  with _client_with_service(service) as client:
    if method == "post":
      resp = client.post(path, json=payload)
    elif method == "put":
      resp = client.put(path, json=payload)
    else:
      resp = client.delete(path)
    assert resp.status_code == 404
  app.dependency_overrides.clear()
