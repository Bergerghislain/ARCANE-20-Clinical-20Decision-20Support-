"""Helpers partagés pour les tests d'intégration backend."""
from __future__ import annotations

from fastapi.testclient import TestClient

from backend_fastapi.app.db import fetch_one
from backend_fastapi.app.main import app
from backend_fastapi.app.security import pwd_context

client = TestClient(app)
_DEMO_PASSWORD_HASH = pwd_context.hash("password")


def login(identifier: str, password: str = "password") -> str:
  resp = client.post(
    "/api/auth/login",
    json={"identifier": identifier, "password": password},
  )
  assert resp.status_code == 200, resp.text
  return resp.json()["token"]


def auth_headers(token: str) -> dict[str, str]:
  return {"Authorization": f"Bearer {token}"}


def patient_id_by_ipp(ipp: str) -> int:
  row = fetch_one("SELECT id_patient FROM patients WHERE ipp = %s LIMIT 1", (ipp,))
  assert row is not None, f"Patient {ipp} introuvable (seeds requis)"
  return int(row["id_patient"])
