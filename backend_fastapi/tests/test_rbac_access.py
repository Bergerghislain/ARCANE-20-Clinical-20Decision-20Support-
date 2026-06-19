from __future__ import annotations

import pytest

from backend_fastapi.tests.integration_helpers import auth_headers, client, login, patient_id_by_ipp


@pytest.mark.integration
def test_clinician_cannot_read_other_clinician_patient_detail():
  martin_token = login("martin@hospital.com")
  leclerc_patient = patient_id_by_ipp("PAT003")

  resp = client.get(
    f"/api/patients/{leclerc_patient}",
    headers=auth_headers(martin_token),
  )
  assert resp.status_code == 403


@pytest.mark.integration
def test_clinician_cannot_assign_patient():
  martin_token = login("martin@hospital.com")
  patient_id = patient_id_by_ipp("PAT001")
  leclerc_id = client.get("/api/admin/users?status=ACTIF", headers=auth_headers(login("admin@arcane.com")))
  assert leclerc_id.status_code == 200

  resp = client.post(
    f"/api/patients/{patient_id}/assign",
    headers=auth_headers(martin_token),
    json={"clinician_id": 2},
  )
  assert resp.status_code == 403


@pytest.mark.integration
def test_clinician_cannot_access_admin_users():
  token = login("martin@hospital.com")
  resp = client.get("/api/admin/users?status=EN_ATTENTE", headers=auth_headers(token))
  assert resp.status_code == 403


@pytest.mark.integration
def test_researcher_cannot_access_patients_list():
  token = login("jane@research.com")
  resp = client.get("/api/patients", headers=auth_headers(token))
  assert resp.status_code == 403


@pytest.mark.integration
def test_researcher_cannot_call_ai_argos():
  token = login("jane@research.com")
  resp = client.post(
    "/api/ai/argos/respond",
    headers=auth_headers(token),
    json={"user_message": "test"},
  )
  assert resp.status_code == 403


@pytest.mark.integration
def test_admin_can_access_admin_routes_and_all_patients():
  admin_token = login("admin@arcane.com")
  patients = client.get("/api/patients", headers=auth_headers(admin_token))
  assert patients.status_code == 200
  assert len(patients.json()) >= 2

  admin_users = client.get("/api/admin/users?status=ACTIF", headers=auth_headers(admin_token))
  assert admin_users.status_code == 200


@pytest.mark.integration
def test_clinician_sees_only_assigned_patients_in_list():
  martin_token = login("martin@hospital.com")
  resp = client.get("/api/patients", headers=auth_headers(martin_token))
  assert resp.status_code == 200
  ipp_values = {row.get("ipp") for row in resp.json()}
  assert "PAT001" in ipp_values or "PAT002" in ipp_values
  assert "PAT003" not in ipp_values
