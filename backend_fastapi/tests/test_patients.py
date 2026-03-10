from __future__ import annotations

from fastapi.testclient import TestClient

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

