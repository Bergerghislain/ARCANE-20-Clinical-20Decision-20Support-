from __future__ import annotations

from fastapi.testclient import TestClient

from ..app.main import app


client = TestClient(app)


def test_login_success_admin():
  # Utilise les données d'exemple insérées par setup_database.sql
  resp = client.post(
    "/api/auth/login",
    json={"identifier": "admin@arcane.com", "password": "password"},
  )
  assert resp.status_code == 200
  data = resp.json()
  assert "token" in data
  assert data["user"]["email"] == "admin@arcane.com"


def test_login_invalid_credentials():
  resp = client.post(
    "/api/auth/login",
    json={"identifier": "admin@arcane.com", "password": "wrong"},
  )
  assert resp.status_code == 401


def test_refresh_requires_cookie():
  # Sans cookie, refresh doit échouer : on utilise un nouveau client
  local_client = TestClient(app)
  resp = local_client.post("/api/auth/refresh")
  assert resp.status_code == 401

