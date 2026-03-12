from __future__ import annotations

from datetime import datetime

from fastapi.testclient import TestClient

from ..app.db import execute
from ..app.main import app


client = TestClient(app)


def _login_admin() -> str:
  resp = client.post(
    "/api/auth/login",
    json={"identifier": "admin@arcane.com", "password": "password"},
  )
  assert resp.status_code == 200
  return resp.json()["token"]


def test_get_patients_requires_auth():
  resp = client.get("/api/patients")
  assert resp.status_code == 401


def test_get_patients_with_token():
  token = _login_admin()
  resp = client.get("/api/patients", headers={"Authorization": f"Bearer {token}"})
  assert resp.status_code == 200
  assert isinstance(resp.json(), list)


def test_demo_endpoint_compatible_with_previous_express_route():
  resp = client.get("/api/demo")
  assert resp.status_code == 200
  assert resp.json()["message"] == "Hello from FastAPI server"


def test_create_patient_accepts_legacy_express_payload():
  token = _login_admin()
  headers = {"Authorization": f"Bearer {token}"}
  created_patient_id: int | None = None

  try:
    create = client.post(
      "/api/patients",
      headers=headers,
      json={
        "name": "Legacy Payload Patient",
        "age": 34,
        "gender": "female",
        "birthDate": "1991-06-15",
        "status": "active",
        "condition": "Test condition",
      },
    )
    assert create.status_code == 201, create.text
    created_patient_id = int(create.json()["id"])

    fetched = client.get(f"/api/patients/{created_patient_id}", headers=headers)
    assert fetched.status_code == 200, fetched.text
    patient = fetched.json()
    assert patient["name"] == "Legacy Payload Patient"
    assert patient["sex"] == "FEMALE"
    assert patient["status"] == "active"
    assert patient["birth_date_year"] == 1991
    assert patient["birth_date_month"] == 6
    assert patient["birth_date_day"] == 15
  finally:
    if created_patient_id is not None:
      execute("DELETE FROM patients WHERE id_patient = %s", (created_patient_id,))


def test_update_patient_endpoint_matches_previous_express_behavior():
  token = _login_admin()
  headers = {"Authorization": f"Bearer {token}"}
  created_patient_id: int | None = None

  try:
    create = client.post(
      "/api/patients",
      headers=headers,
      json={"name": "Update Target", "status": "pending", "condition": "Initial"},
    )
    assert create.status_code == 201, create.text
    created_patient_id = int(create.json()["id"])

    update = client.put(
      f"/api/patients/{created_patient_id}",
      headers=headers,
      json={
        "status": "completed",
        "gender": "other",
        "age": 40,
        "condition": "Updated condition",
      },
    )
    assert update.status_code == 200, update.text
    payload = update.json()
    assert payload["status"] == "completed"
    assert payload["sex"] == "OTHER"
    assert payload["condition"] == "Updated condition"
    assert payload["birth_date_year"] == datetime.now().year - 40
  finally:
    if created_patient_id is not None:
      execute("DELETE FROM patients WHERE id_patient = %s", (created_patient_id,))

