"""Tests des routeurs clinique + ARGOS et du controle d'acces (RBAC).

- Couvre les endpoints (services mockes, pas de base reelle).
- Verifie le RBAC: roles autorises/refuses au niveau route (require_role) et l'absence
  d'en-tete Authorization (401).
"""
from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend_fastapi.app import deps
from backend_fastapi.app.application.errors import ApplicationError
from backend_fastapi.app.main import app


CLINICAL_WRITE_METHODS = [
  "create_measure", "update_measure",
  "create_medication", "update_medication",
  "create_surgery", "update_surgery",
  "create_radiotherapy", "update_radiotherapy",
  "create_imaging_study", "update_imaging_study",
  "create_tnm_event", "update_tnm_event",
  "create_specimen", "update_specimen",
  "create_biomarker", "update_biomarker",
]
CLINICAL_DELETE_METHODS = [
  "delete_measure", "delete_medication", "delete_surgery", "delete_radiotherapy",
  "delete_imaging_study", "delete_tnm_event", "delete_specimen", "delete_biomarker",
]


def _clinical_service_mock() -> MagicMock:
  service = MagicMock()
  for name in CLINICAL_WRITE_METHODS:
    getattr(service, name).return_value = {"id": 1, "ok": True}
  for name in CLINICAL_DELETE_METHODS:
    getattr(service, name).return_value = None
  return service


def _argos_service_mock() -> MagicMock:
  service = MagicMock()
  discussion = {
    "id": 1, "patient_id": 1, "clinician_id": 10, "title": "t", "context": None,
    "status": "active", "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
  }
  message = {
    "id": 1, "discussion_id": 1, "message_type": "user_query", "content": "hello",
    "sections": None, "created_at": "2026-01-01T00:00:00Z", "created_by": 10,
  }
  service.create_discussion.return_value = discussion
  service.list_discussions.return_value = [discussion]
  service.get_discussion.return_value = discussion
  service.list_messages.return_value = [message]
  service.add_message.return_value = message
  return service


@pytest.fixture
def clinical_service() -> MagicMock:
  return _clinical_service_mock()


@pytest.fixture
def argos_service() -> MagicMock:
  return _argos_service_mock()


def _override_user(role: str, user_id: int = 10) -> None:
  app.dependency_overrides[deps.get_current_user] = lambda: {"id": user_id, "role": role}


@pytest.fixture(autouse=True)
def _cleanup():
  yield
  app.dependency_overrides.clear()


# --- Endpoints clinique (role clinician) ---
# (methode HTTP, URL, body, methode du service)
CLINICAL_REQUESTS: list[tuple[str, str, dict[str, Any] | None, str]] = [
  ("post", "/api/patients/1/clinical/measures", {"measureType": "WEIGHT", "measureUnit": "kg"}, "create_measure"),
  ("put", "/api/patients/1/clinical/measures/2", {"measureType": "WEIGHT", "measureUnit": "kg"}, "update_measure"),
  ("delete", "/api/patients/1/clinical/measures/2", None, "delete_measure"),
  ("post", "/api/patients/1/clinical/medications", {"medicationName": "Aspirine"}, "create_medication"),
  ("put", "/api/patients/1/clinical/medications/2", {"medicationName": "Aspirine"}, "update_medication"),
  ("delete", "/api/patients/1/clinical/medications/2", None, "delete_medication"),
  ("post", "/api/patients/1/clinical/surgeries", {"surgeryType": "Lobectomy"}, "create_surgery"),
  ("put", "/api/patients/1/clinical/surgeries/2", {"surgeryType": "Lobectomy"}, "update_surgery"),
  ("delete", "/api/patients/1/clinical/surgeries/2", None, "delete_surgery"),
  ("post", "/api/patients/1/clinical/radiotherapies", {"modality": "EBRT"}, "create_radiotherapy"),
  ("put", "/api/patients/1/clinical/radiotherapies/2", {"modality": "EBRT"}, "update_radiotherapy"),
  ("delete", "/api/patients/1/clinical/radiotherapies/2", None, "delete_radiotherapy"),
  ("post", "/api/patients/1/clinical/imaging-studies", {"studyType": "CT"}, "create_imaging_study"),
  ("put", "/api/patients/1/clinical/imaging-studies/2", {"studyType": "CT"}, "update_imaging_study"),
  ("delete", "/api/patients/1/clinical/imaging-studies/2", None, "delete_imaging_study"),
  ("post", "/api/patients/1/clinical/primary-cancers/3/tnm-events", {"tCategory": "T1"}, "create_tnm_event"),
  ("put", "/api/patients/1/clinical/primary-cancers/3/tnm-events/4", {"tCategory": "T1"}, "update_tnm_event"),
  ("delete", "/api/patients/1/clinical/primary-cancers/3/tnm-events/4", None, "delete_tnm_event"),
  ("post", "/api/patients/1/clinical/specimens", {"specimenIdentifier": "S1"}, "create_specimen"),
  ("put", "/api/patients/1/clinical/specimens/2", {"specimenIdentifier": "S1"}, "update_specimen"),
  ("delete", "/api/patients/1/clinical/specimens/2", None, "delete_specimen"),
  ("post", "/api/patients/1/clinical/specimens/2/biomarkers", {"biomarkerName": "EGFR"}, "create_biomarker"),
  ("put", "/api/patients/1/clinical/specimens/2/biomarkers/5", {"biomarkerName": "EGFR"}, "update_biomarker"),
  ("delete", "/api/patients/1/clinical/specimens/2/biomarkers/5", None, "delete_biomarker"),
]


@pytest.mark.parametrize("method,url,body,_attr", CLINICAL_REQUESTS)
def test_clinical_endpoints_ok_for_clinician(clinical_service, method, url, body, _attr):
  app.dependency_overrides[deps.get_patient_clinical_service] = lambda: clinical_service
  _override_user("clinician")
  with TestClient(app) as client:
    resp = getattr(client, method)(url, json=body) if body is not None else getattr(client, method)(url)
  assert resp.status_code in (200, 201, 204), resp.text


@pytest.mark.parametrize("method,url,body,attr", CLINICAL_REQUESTS)
def test_clinical_endpoints_map_application_error(clinical_service, method, url, body, attr):
  getattr(clinical_service, attr).side_effect = ApplicationError("Boom", 404)
  app.dependency_overrides[deps.get_patient_clinical_service] = lambda: clinical_service
  _override_user("clinician")
  with TestClient(app) as client:
    resp = getattr(client, method)(url, json=body) if body is not None else getattr(client, method)(url)
  assert resp.status_code == 404, resp.text


def test_clinical_endpoints_ok_for_admin(clinical_service):
  app.dependency_overrides[deps.get_patient_clinical_service] = lambda: clinical_service
  _override_user("admin")
  with TestClient(app) as client:
    resp = client.post(
      "/api/patients/1/clinical/measures",
      json={"measureType": "WEIGHT", "measureUnit": "kg"},
    )
  assert resp.status_code == 201


def test_clinical_endpoint_maps_application_error(clinical_service):
  clinical_service.create_measure.side_effect = ApplicationError("Patient not found", 404)
  app.dependency_overrides[deps.get_patient_clinical_service] = lambda: clinical_service
  _override_user("clinician")
  with TestClient(app) as client:
    resp = client.post(
      "/api/patients/1/clinical/measures",
      json={"measureType": "WEIGHT", "measureUnit": "kg"},
    )
  assert resp.status_code == 404
  assert resp.json()["detail"] == "Patient not found"


# --- RBAC: roles refuses ---
def test_clinical_endpoint_forbidden_for_researcher(clinical_service):
  app.dependency_overrides[deps.get_patient_clinical_service] = lambda: clinical_service
  _override_user("researcher")
  with TestClient(app) as client:
    resp = client.post(
      "/api/patients/1/clinical/measures",
      json={"measureType": "WEIGHT", "measureUnit": "kg"},
    )
  assert resp.status_code == 403
  clinical_service.create_measure.assert_not_called()


def test_clinical_endpoint_unauthenticated_returns_401():
  # Pas d'override de get_current_user: l'absence d'en-tete Authorization -> 401.
  with TestClient(app) as client:
    resp = client.post(
      "/api/patients/1/clinical/measures",
      json={"measureType": "WEIGHT", "measureUnit": "kg"},
    )
  assert resp.status_code == 401


# --- Endpoints ARGOS (role clinician strict) ---
def test_argos_endpoints_ok_for_clinician(argos_service):
  app.dependency_overrides[deps.get_argos_service] = lambda: argos_service
  _override_user("clinician")
  with TestClient(app) as client:
    assert client.post("/api/argos/discussions", json={"patient_id": 1, "title": "t"}).status_code == 201
    assert client.get("/api/argos/discussions").status_code == 200
    assert client.get("/api/argos/discussions?patient_id=1").status_code == 200
    assert client.get("/api/argos/discussions/1").status_code == 200
    assert client.get("/api/argos/discussions/1/messages").status_code == 200
    assert client.post(
      "/api/argos/discussions/1/messages",
      json={"message_type": "user_query", "content": "hello"},
    ).status_code == 201


def test_argos_forbidden_for_admin(argos_service):
  # ARGOS exige le role clinician strict: un admin doit etre refuse (403).
  app.dependency_overrides[deps.get_argos_service] = lambda: argos_service
  _override_user("admin")
  with TestClient(app) as client:
    resp = client.get("/api/argos/discussions")
  assert resp.status_code == 403
  argos_service.list_discussions.assert_not_called()


ARGOS_REQUESTS: list[tuple[str, str, dict[str, Any] | None, str]] = [
  ("post", "/api/argos/discussions", {"patient_id": 1, "title": "t"}, "create_discussion"),
  ("get", "/api/argos/discussions", None, "list_discussions"),
  ("get", "/api/argos/discussions/1", None, "get_discussion"),
  ("get", "/api/argos/discussions/1/messages", None, "list_messages"),
  ("post", "/api/argos/discussions/1/messages", {"message_type": "user_query", "content": "x"}, "add_message"),
]


@pytest.mark.parametrize("method,url,body,attr", ARGOS_REQUESTS)
def test_argos_endpoints_map_application_error(argos_service, method, url, body, attr):
  getattr(argos_service, attr).side_effect = ApplicationError("Boom", 404)
  app.dependency_overrides[deps.get_argos_service] = lambda: argos_service
  _override_user("clinician")
  with TestClient(app) as client:
    resp = getattr(client, method)(url, json=body) if body is not None else getattr(client, method)(url)
  assert resp.status_code == 404, resp.text
