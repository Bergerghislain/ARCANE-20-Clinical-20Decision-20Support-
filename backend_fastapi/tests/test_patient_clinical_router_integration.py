from __future__ import annotations

import pytest

from backend_fastapi.tests.integration_helpers import auth_headers, client, login, patient_id_by_ipp


@pytest.mark.integration
def test_patient_clinical_router_measure_crud_via_http():
  token = login("martin@hospital.com")
  headers = auth_headers(token)
  patient_id = patient_id_by_ipp("PAT001")

  create = client.post(
    f"/api/patients/{patient_id}/clinical/measures",
    headers=headers,
    json={
      "measureType": "HEIGHT",
      "measureUnit": "cm",
      "measureValue": 175,
      "measureDateYear": 2025,
      "measureDateMonth": 1,
    },
  )
  assert create.status_code == 201, create.text
  measure_id = int(create.json()["id"])

  update = client.put(
    f"/api/patients/{patient_id}/clinical/measures/{measure_id}",
    headers=headers,
    json={
      "measureType": "HEIGHT",
      "measureUnit": "cm",
      "measureValue": 176,
      "measureDateYear": 2025,
      "measureDateMonth": 2,
    },
  )
  assert update.status_code == 200

  delete = client.delete(
    f"/api/patients/{patient_id}/clinical/measures/{measure_id}",
    headers=headers,
  )
  assert delete.status_code == 204


@pytest.mark.integration
def test_patient_clinical_router_denies_other_clinician():
  martin_token = login("martin@hospital.com")
  leclerc_patient = patient_id_by_ipp("PAT003")

  resp = client.post(
    f"/api/patients/{leclerc_patient}/clinical/measures",
    headers=auth_headers(martin_token),
    json={"measureType": "WEIGHT", "measureUnit": "kg", "measureValue": 80},
  )
  assert resp.status_code == 403


@pytest.mark.integration
def test_patient_clinical_router_admin_can_write_any_patient():
  admin_token = login("admin@arcane.com")
  patient_id = patient_id_by_ipp("PAT003")

  resp = client.post(
    f"/api/patients/{patient_id}/clinical/measures",
    headers=auth_headers(admin_token),
    json={"measureType": "WEIGHT", "measureUnit": "kg", "measureValue": 65},
  )
  assert resp.status_code == 201
  measure_id = int(resp.json()["id"])
  client.delete(
    f"/api/patients/{patient_id}/clinical/measures/{measure_id}",
    headers=auth_headers(admin_token),
  )


@pytest.mark.integration
def test_patient_clinical_router_medication_and_surgery_crud():
  token = login("admin@arcane.com")
  headers = auth_headers(token)
  patient_id = patient_id_by_ipp("PAT001")

  med = client.post(
    f"/api/patients/{patient_id}/clinical/medications",
    headers=headers,
    json={"medicationName": "TestMed", "dosage": "50mg", "frequency": "daily"},
  )
  assert med.status_code == 201
  med_id = int(med.json()["id"])

  upd = client.put(
    f"/api/patients/{patient_id}/clinical/medications/{med_id}",
    headers=headers,
    json={"medicationName": "TestMed2", "dosage": "50mg", "frequency": "daily"},
  )
  assert upd.status_code == 200

  delete = client.delete(
    f"/api/patients/{patient_id}/clinical/medications/{med_id}",
    headers=headers,
  )
  assert delete.status_code == 204


@pytest.mark.integration
def test_patient_clinical_router_returns_404_for_unknown_measure():
  token = login("admin@arcane.com")
  resp = client.put(
    f"/api/patients/{patient_id_by_ipp('PAT001')}/clinical/measures/999999",
    headers=auth_headers(token),
    json={"measureType": "WEIGHT", "measureUnit": "kg", "measureValue": 1},
  )
  assert resp.status_code == 404


@pytest.mark.integration
def test_patient_clinical_router_get_bundle():
  token = login("martin@hospital.com")
  patient_id = patient_id_by_ipp("PAT001")
  resp = client.get(
    f"/api/patients/{patient_id}/clinical",
    headers=auth_headers(token),
  )
  assert resp.status_code == 200
  body = resp.json()
  assert "mesureList" in body
