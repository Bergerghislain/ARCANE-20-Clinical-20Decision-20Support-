from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from ..app.db import execute, fetch_one
from ..app.main import app


def _unique_identity(prefix: str) -> tuple[str, str]:
  suffix = uuid4().hex[:10]
  return (f"{prefix}.{suffix}@arcanehealth.org", f"{prefix}_{suffix}")


def _delete_user_by_email(email: str) -> None:
  execute("DELETE FROM users WHERE email = %s", (email,))


def _delete_user_by_username(username: str) -> None:
  execute("DELETE FROM users WHERE username = %s", (username,))


def _login(client: TestClient, identifier: str, password: str = "password") -> dict:
  resp = client.post(
    "/api/auth/login",
    json={"identifier": identifier, "password": password},
  )
  assert resp.status_code == 200, resp.text
  return resp.json()


def _admin_headers(client: TestClient) -> dict[str, str]:
  payload = _login(client, "admin@arcane.com")
  return {"Authorization": f"Bearer {payload['token']}"}


def _user_id_by_email(email: str) -> int:
  row = fetch_one(
    """
    SELECT id
    FROM users
    WHERE email = %s
    LIMIT 1
    """,
    (email,),
  )
  assert row is not None
  return int(row["id"])


def test_register_creates_inactive_clinician_pending_validation():
  email, username = _unique_identity("pending")
  _delete_user_by_email(email)
  _delete_user_by_username(username)

  try:
    with TestClient(app) as client:
      resp = client.post(
        "/api/auth/register",
        json={
          "email": email,
          "username": username,
          "full_name": "Dr Pending",
          "password": "StrongPass123!",
        },
      )
      assert resp.status_code == 201, resp.text
      payload = resp.json()
      assert "pending admin validation" in payload["message"]

      row = fetch_one(
        """
        SELECT email, username, role, is_active
        FROM users
        WHERE email = %s
        LIMIT 1
        """,
        (email,),
      )
      assert row is not None
      assert row["username"] == username
      assert row["role"] == "clinician"
      assert row["is_active"] is False
  finally:
    _delete_user_by_email(email)


def test_register_rejects_duplicate_email():
  email, username = _unique_identity("duplicate")
  second_username = f"{username}_2"
  _delete_user_by_email(email)
  _delete_user_by_username(username)
  _delete_user_by_username(second_username)

  try:
    with TestClient(app) as client:
      first = client.post(
        "/api/auth/register",
        json={
          "email": email,
          "username": username,
          "password": "StrongPass123!",
        },
      )
      assert first.status_code == 201, first.text

      duplicate = client.post(
        "/api/auth/register",
        json={
          "email": email,
          "username": second_username,
          "password": "StrongPass123!",
        },
      )
      assert duplicate.status_code == 400
      assert duplicate.json()["detail"] == "Email or username already in use"
  finally:
    _delete_user_by_email(email)
    _delete_user_by_username(username)
    _delete_user_by_username(second_username)


def test_register_rejects_password_longer_than_72_bytes():
  email, username = _unique_identity("longpwd")
  _delete_user_by_email(email)
  _delete_user_by_username(username)

  try:
    with TestClient(app) as client:
      # 19 emojis = 76 bytes en UTF-8, mais 19 caractères seulement.
      too_long_password = "🚀" * 19
      resp = client.post(
        "/api/auth/register",
        json={
          "email": email,
          "username": username,
          "password": too_long_password,
        },
      )
      assert resp.status_code == 400
      assert resp.json()["detail"] == "Password too long (max 72 characters)."
  finally:
    _delete_user_by_email(email)


def test_pending_user_cannot_login_until_admin_validation():
  email, username = _unique_identity("must_wait")
  _delete_user_by_email(email)
  _delete_user_by_username(username)

  try:
    with TestClient(app) as client:
      created = client.post(
        "/api/auth/register",
        json={
          "email": email,
          "username": username,
          "password": "StrongPass123!",
        },
      )
      assert created.status_code == 201, created.text

      login = client.post(
        "/api/auth/login",
        json={"identifier": email, "password": "StrongPass123!"},
      )
      assert login.status_code == 403
      assert login.json()["detail"] == "User disabled"
  finally:
    _delete_user_by_email(email)


def test_admin_can_list_pending_users_including_new_registration():
  email, username = _unique_identity("list_pending")
  _delete_user_by_email(email)
  _delete_user_by_username(username)

  try:
    with TestClient(app) as client:
      created = client.post(
        "/api/auth/register",
        json={
          "email": email,
          "username": username,
          "password": "StrongPass123!",
        },
      )
      assert created.status_code == 201, created.text

      headers = _admin_headers(client)
      pending = client.get("/api/admin/users?status=EN_ATTENTE", headers=headers)
      assert pending.status_code == 200
      rows = pending.json()
      assert any(row.get("email") == email for row in rows)
  finally:
    _delete_user_by_email(email)


def test_non_admin_cannot_access_admin_endpoints():
  with TestClient(app) as client:
    clinician = _login(client, "martin@hospital.com")
    headers = {"Authorization": f"Bearer {clinician['token']}"}

    list_resp = client.get("/api/admin/users?status=EN_ATTENTE", headers=headers)
    assert list_resp.status_code == 403

    validate_resp = client.post(
      "/api/admin/users/1/validate",
      headers=headers,
      json={"action": "APPROVE", "role": "clinician"},
    )
    assert validate_resp.status_code == 403


def test_admin_can_promote_active_clinician_to_admin_and_new_admin_has_same_access():
  email, username = _unique_identity("promote")
  _delete_user_by_email(email)
  _delete_user_by_username(username)

  try:
    with TestClient(app) as client:
      created = client.post(
        "/api/auth/register",
        json={
          "email": email,
          "username": username,
          "password": "StrongPass123!",
        },
      )
      assert created.status_code == 201, created.text
      user_id = _user_id_by_email(email)

      admin_headers = _admin_headers(client)

      approve_clinician = client.post(
        f"/api/admin/users/{user_id}/validate",
        headers=admin_headers,
        json={"action": "APPROVE", "role": "clinician"},
      )
      assert approve_clinician.status_code == 200, approve_clinician.text
      clinician_payload = approve_clinician.json()
      assert clinician_payload["role"] == "clinician"
      assert clinician_payload["is_active"] is True

      promote_admin = client.post(
        f"/api/admin/users/{user_id}/validate",
        headers=admin_headers,
        json={"action": "APPROVE", "role": "admin"},
      )
      assert promote_admin.status_code == 200, promote_admin.text
      admin_payload = promote_admin.json()
      assert admin_payload["role"] == "admin"
      assert admin_payload["is_active"] is True

      promoted_login = client.post(
        "/api/auth/login",
        json={"identifier": email, "password": "StrongPass123!"},
      )
      assert promoted_login.status_code == 200, promoted_login.text
      promoted_token = promoted_login.json()["token"]
      promoted_headers = {"Authorization": f"Bearer {promoted_token}"}

      # Même droits d'administration que les admins existants.
      admin_page = client.get("/api/admin/users?status=ACTIF", headers=promoted_headers)
      assert admin_page.status_code == 200

      # Même accès aux endpoints cliniciens/admin.
      patients_page = client.get("/api/patients", headers=promoted_headers)
      assert patients_page.status_code == 200
  finally:
    _delete_user_by_email(email)


def test_admin_can_reject_user_and_rejected_user_cannot_login():
  email, username = _unique_identity("reject")
  _delete_user_by_email(email)
  _delete_user_by_username(username)

  try:
    with TestClient(app) as client:
      created = client.post(
        "/api/auth/register",
        json={
          "email": email,
          "username": username,
          "password": "StrongPass123!",
        },
      )
      assert created.status_code == 201, created.text
      user_id = _user_id_by_email(email)

      admin_headers = _admin_headers(client)
      rejected = client.post(
        f"/api/admin/users/{user_id}/validate",
        headers=admin_headers,
        json={"action": "REJECT"},
      )
      assert rejected.status_code == 200, rejected.text
      assert rejected.json()["is_active"] is False

      login = client.post(
        "/api/auth/login",
        json={"identifier": email, "password": "StrongPass123!"},
      )
      assert login.status_code == 403
      assert login.json()["detail"] == "User disabled"
  finally:
    _delete_user_by_email(email)


def test_refresh_then_logout_invalidates_session_cookie_flow():
  with TestClient(app) as client:
    login = client.post(
      "/api/auth/login",
      json={"identifier": "admin@arcane.com", "password": "password"},
    )
    assert login.status_code == 200, login.text
    assert "arcane_refresh_token" in (login.headers.get("set-cookie") or "")

    refreshed = client.post("/api/auth/refresh")
    assert refreshed.status_code == 200, refreshed.text
    assert "token" in refreshed.json()

    logout = client.post("/api/auth/logout")
    assert logout.status_code == 204, logout.text

    after_logout_refresh = client.post("/api/auth/refresh")
    assert after_logout_refresh.status_code == 401


def test_researcher_cannot_access_patients_endpoint():
  with TestClient(app) as client:
    researcher = _login(client, "jane@research.com")
    headers = {"Authorization": f"Bearer {researcher['token']}"}
    patients = client.get("/api/patients", headers=headers)
    assert patients.status_code == 403
