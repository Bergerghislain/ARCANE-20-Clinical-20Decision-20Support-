from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi.testclient import TestClient

from ..app.db import execute, fetch_one
from ..app.main import app


client = TestClient(app)


def _login(identifier: str, password: str = "password") -> str:
  resp = client.post(
    "/api/auth/login",
    json={"identifier": identifier, "password": password},
  )
  assert resp.status_code == 200
  return resp.json()["token"]


def _login_admin() -> str:
  return _login("admin@arcane.com")


def _login_martin() -> str:
  return _login("martin@hospital.com")


def _create_active_clinician(prefix: str = "test.clin") -> tuple[int, str]:
  suffix = uuid4().hex[:8]
  email = f"{prefix}.{suffix}@arcane.com"
  username = f"{prefix}_{suffix}".replace(".", "_")
  execute(
    """
    INSERT INTO users (username, email, password_hash, role, full_name, is_active)
    VALUES (%s, %s, %s, 'clinician', %s, TRUE)
    """,
    (username, email, "$2a$10$YourHashedPasswordHere", f"Dr {suffix}"),
  )
  row = fetch_one("SELECT id FROM users WHERE email = %s LIMIT 1", (email,))
  assert row is not None
  return int(row["id"]), email


def _delete_user_by_email(email: str) -> None:
  execute("DELETE FROM users WHERE email = %s", (email,))


def _user_id_by_email(email: str) -> int:
  row = fetch_one("SELECT id FROM users WHERE email = %s LIMIT 1", (email,))
  assert row is not None
  return int(row["id"])


def test_get_patients_requires_auth():
  resp = client.get("/api/patients")
  assert resp.status_code == 401


def test_get_patients_with_token():
  token = _login_admin()
  resp = client.get("/api/patients", headers={"Authorization": f"Bearer {token}"})
  assert resp.status_code == 200
  assert isinstance(resp.json(), list)


def test_clinician_only_sees_assigned_patients():
  admin_token = _login_admin()
  martin_token = _login_martin()
  martin_id = _user_id_by_email("martin@hospital.com")
  admin_headers = {"Authorization": f"Bearer {admin_token}"}
  martin_headers = {"Authorization": f"Bearer {martin_token}"}
  created_for_martin: int | None = None
  created_for_other: int | None = None
  other_email: str | None = None

  try:
    other_clinician_id, other_email = _create_active_clinician("scope.clin")
    created_for_martin_resp = client.post(
      "/api/patients",
      headers=admin_headers,
      json={"name": "Assigned Martin", "status": "active", "assigned_clinician_id": martin_id},
    )
    assert created_for_martin_resp.status_code == 201, created_for_martin_resp.text
    created_for_martin = int(created_for_martin_resp.json()["id"])

    created_for_other_resp = client.post(
      "/api/patients",
      headers=admin_headers,
      json={
        "name": "Assigned Other",
        "status": "active",
        "assigned_clinician_id": other_clinician_id,
      },
    )
    assert created_for_other_resp.status_code == 201, created_for_other_resp.text
    created_for_other = int(created_for_other_resp.json()["id"])

    visible_for_martin = client.get("/api/patients", headers=martin_headers)
    assert visible_for_martin.status_code == 200, visible_for_martin.text
    payload = visible_for_martin.json()
    visible_ids = {int(row["id_patient"]) for row in payload}
    assert created_for_martin in visible_ids
    assert created_for_other not in visible_ids
  finally:
    if created_for_martin is not None:
      execute("DELETE FROM patients WHERE id_patient = %s", (created_for_martin,))
    if created_for_other is not None:
      execute("DELETE FROM patients WHERE id_patient = %s", (created_for_other,))
    if other_email is not None:
      _delete_user_by_email(other_email)


def test_get_patients_supports_pagination():
  token = _login_admin()
  headers = {"Authorization": f"Bearer {token}"}
  first_page = client.get("/api/patients?limit=1&offset=0", headers=headers)
  second_page = client.get("/api/patients?limit=1&offset=1", headers=headers)

  assert first_page.status_code == 200
  assert second_page.status_code == 200
  first_payload = first_page.json()
  second_payload = second_page.json()
  assert isinstance(first_payload, list)
  assert isinstance(second_payload, list)
  assert len(first_payload) == 1
  assert len(second_payload) == 1
  assert first_payload[0]["id_patient"] != second_payload[0]["id_patient"]


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
    assert patient["birth_date"] == "1991-06-15"
    assert patient["birth_date_precision"] == "day"
  finally:
    if created_patient_id is not None:
      execute("DELETE FROM patients WHERE id_patient = %s", (created_patient_id,))


def test_create_patient_rejects_unknown_fields_with_strict_dto():
  token = _login_admin()
  headers = {"Authorization": f"Bearer {token}"}
  resp = client.post(
    "/api/patients",
    headers=headers,
    json={
      "name": "Strict DTO",
      "status": "active",
      "unexpected_field": "should_fail",
    },
  )
  assert resp.status_code == 422


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
    expected_year = datetime.now().year - 40
    assert payload["birth_date_year"] == expected_year
    assert payload["birth_date"] == f"{expected_year}-01-01"
    assert payload["birth_date_precision"] == "year"
  finally:
    if created_patient_id is not None:
      execute("DELETE FROM patients WHERE id_patient = %s", (created_patient_id,))


def test_update_patient_rejects_unknown_fields_with_strict_dto():
  token = _login_admin()
  headers = {"Authorization": f"Bearer {token}"}
  created_patient_id: int | None = None

  try:
    create = client.post(
      "/api/patients",
      headers=headers,
      json={"name": "Strict Update Target", "status": "pending"},
    )
    assert create.status_code == 201, create.text
    created_patient_id = int(create.json()["id"])

    update = client.put(
      f"/api/patients/{created_patient_id}",
      headers=headers,
      json={"unexpected_field": "should_fail"},
    )
    assert update.status_code == 422
  finally:
    if created_patient_id is not None:
      execute("DELETE FROM patients WHERE id_patient = %s", (created_patient_id,))


def test_admin_can_reassign_patient_to_another_clinician():
  admin_token = _login_admin()
  martin_token = _login_martin()
  martin_id = _user_id_by_email("martin@hospital.com")
  admin_headers = {"Authorization": f"Bearer {admin_token}"}
  martin_headers = {"Authorization": f"Bearer {martin_token}"}
  created_patient_id: int | None = None
  other_email: str | None = None

  try:
    other_clinician_id, other_email = _create_active_clinician("reassign.clin")
    other_clinician_token = _login(other_email)
    other_clinician_headers = {"Authorization": f"Bearer {other_clinician_token}"}

    create_resp = client.post(
      "/api/patients",
      headers=admin_headers,
      json={
        "name": "Reassign Target",
        "status": "pending",
        "assigned_clinician_id": martin_id,
      },
    )
    assert create_resp.status_code == 201, create_resp.text
    created_patient_id = int(create_resp.json()["id"])

    martin_before = client.get(
      f"/api/patients/{created_patient_id}",
      headers=martin_headers,
    )
    assert martin_before.status_code == 200, martin_before.text

    reassign_resp = client.post(
      f"/api/patients/{created_patient_id}/assign",
      headers=admin_headers,
      json={"clinician_id": other_clinician_id},
    )
    assert reassign_resp.status_code == 200, reassign_resp.text
    assert reassign_resp.json()["assigned_clinician_id"] == other_clinician_id

    martin_after = client.get(
      f"/api/patients/{created_patient_id}",
      headers=martin_headers,
    )
    assert martin_after.status_code == 403

    other_after = client.get(
      f"/api/patients/{created_patient_id}",
      headers=other_clinician_headers,
    )
    assert other_after.status_code == 200, other_after.text
  finally:
    if created_patient_id is not None:
      execute("DELETE FROM patients WHERE id_patient = %s", (created_patient_id,))
    if other_email is not None:
      _delete_user_by_email(other_email)


def test_non_admin_cannot_reassign_patient():
  admin_token = _login_admin()
  martin_token = _login_martin()
  martin_id = _user_id_by_email("martin@hospital.com")
  admin_headers = {"Authorization": f"Bearer {admin_token}"}
  martin_headers = {"Authorization": f"Bearer {martin_token}"}
  created_patient_id: int | None = None
  other_email: str | None = None

  try:
    other_clinician_id, other_email = _create_active_clinician("forbidden.clin")
    create_resp = client.post(
      "/api/patients",
      headers=admin_headers,
      json={
        "name": "Forbidden Reassign",
        "status": "pending",
        "assigned_clinician_id": martin_id,
      },
    )
    assert create_resp.status_code == 201, create_resp.text
    created_patient_id = int(create_resp.json()["id"])

    forbidden = client.post(
      f"/api/patients/{created_patient_id}/assign",
      headers=martin_headers,
      json={"clinician_id": other_clinician_id},
    )
    assert forbidden.status_code == 403
  finally:
    if created_patient_id is not None:
      execute("DELETE FROM patients WHERE id_patient = %s", (created_patient_id,))
    if other_email is not None:
      _delete_user_by_email(other_email)


def test_patient_profile_requires_auth():
  resp = client.get("/api/patients/1/profile")
  assert resp.status_code == 401


def test_patient_profile_roundtrip_persisted_in_backend():
  token = _login_admin()
  headers = {"Authorization": f"Bearer {token}"}
  created_patient_id: int | None = None

  try:
    create = client.post(
      "/api/patients",
      headers=headers,
      json={"name": "Profile Target", "status": "pending", "condition": "Initial"},
    )
    assert create.status_code == 201, create.text
    created_patient_id = int(create.json()["id"])

    save_profile = client.put(
      f"/api/patients/{created_patient_id}/profile",
      headers=headers,
      json={
        "schemaVersion": 1,
        "diagnosis": "Sarcome localement avance",
        "pathologySummary": "Patient symptomatique avec douleur locale.",
        "analyses": [
          {
            "name": "CRP",
            "value": "18",
            "unit": "mg/L",
            "referenceRange": "< 5",
            "date": "2026-03-15",
          }
        ],
        "report": {
          "conclusion": "Poursuivre bilan d'extension.",
          "reasoning": "Inflammation elevee + contexte clinique compatible.",
          "sources": ["Guideline locale", "Synthese RCP"],
        },
      },
    )
    assert save_profile.status_code == 200, save_profile.text
    saved_payload = save_profile.json()
    assert saved_payload["source"] == "persisted"
    assert saved_payload["profile"]["patientId"] == str(created_patient_id)
    assert saved_payload["profile"]["diagnosis"] == "Sarcome localement avance"
    assert saved_payload["profile"]["schemaVersion"] == 2
    assert saved_payload["profile"]["profileVersion"] == 1
    assert saved_payload["profile_version"] == 1
    assert saved_payload["stored_schema_version"] == 2
    assert isinstance(saved_payload["profile"]["reportMeta"]["generator"], str)

    loaded_profile = client.get(
      f"/api/patients/{created_patient_id}/profile",
      headers=headers,
    )
    assert loaded_profile.status_code == 200, loaded_profile.text
    loaded_payload = loaded_profile.json()
    assert loaded_payload["source"] == "persisted"
    assert loaded_payload["profile"]["patientId"] == str(created_patient_id)
    assert loaded_payload["profile"]["report"]["conclusion"] == "Poursuivre bilan d'extension."
    assert loaded_payload["profile"]["profileVersion"] == 1
    assert loaded_payload["profile_version"] == 1
  finally:
    if created_patient_id is not None:
      execute("DELETE FROM patients WHERE id_patient = %s", (created_patient_id,))


def test_patient_profile_returns_404_for_unknown_patient():
  token = _login_admin()
  headers = {"Authorization": f"Bearer {token}"}
  resp = client.get("/api/patients/999999/profile", headers=headers)
  assert resp.status_code == 404


def test_patient_profile_enforces_optimistic_locking():
  token = _login_admin()
  headers = {"Authorization": f"Bearer {token}"}
  created_patient_id: int | None = None

  try:
    create = client.post(
      "/api/patients",
      headers=headers,
      json={"name": "Optimistic Lock", "status": "pending", "condition": "Initial"},
    )
    assert create.status_code == 201, create.text
    created_patient_id = int(create.json()["id"])

    first_save = client.put(
      f"/api/patients/{created_patient_id}/profile",
      headers=headers,
      json={
        "schemaVersion": 1,
        "diagnosis": "Diagnostic v1",
        "pathologySummary": "Premiere version de profil",
        "analyses": [],
        "report": {
          "conclusion": "Conclusion v1",
          "reasoning": "Reasoning v1",
          "sources": ["Source v1"],
        },
      },
    )
    assert first_save.status_code == 200, first_save.text

    missing_version = client.put(
      f"/api/patients/{created_patient_id}/profile",
      headers=headers,
      json={
        "schemaVersion": 2,
        "diagnosis": "Diagnostic sans version",
        "pathologySummary": "Ecriture sans profileVersion",
        "analyses": [],
        "report": {
          "conclusion": "Conclusion no-version",
          "reasoning": "Reasoning no-version",
          "sources": ["Source no-version"],
        },
      },
    )
    assert missing_version.status_code == 409
    assert "Profile version is required" in missing_version.json()["detail"]

    current = client.get(f"/api/patients/{created_patient_id}/profile", headers=headers)
    assert current.status_code == 200, current.text
    current_version = int(current.json()["profile_version"])
    assert current_version == 1

    stale_save = client.put(
      f"/api/patients/{created_patient_id}/profile",
      headers=headers,
      json={
        "schemaVersion": 2,
        "profileVersion": current_version - 1,
        "diagnosis": "Diagnostic stale",
        "pathologySummary": "Ecriture stale",
        "analyses": [],
        "report": {
          "conclusion": "Conclusion stale",
          "reasoning": "Reasoning stale",
          "sources": ["Source stale"],
        },
      },
    )
    assert stale_save.status_code == 409
    assert "Profile version conflict detected" in stale_save.json()["detail"]

    successful_save = client.put(
      f"/api/patients/{created_patient_id}/profile",
      headers=headers,
      json={
        "schemaVersion": 2,
        "profileVersion": current_version,
        "diagnosis": "Diagnostic v2",
        "pathologySummary": "Ecriture avec bonne version",
        "analyses": [],
        "report": {
          "conclusion": "Conclusion v2",
          "reasoning": "Reasoning v2",
          "sources": ["Source v2"],
        },
      },
    )
    assert successful_save.status_code == 200, successful_save.text
    assert successful_save.json()["profile_version"] == 2
    assert successful_save.json()["profile"]["profileVersion"] == 2
  finally:
    if created_patient_id is not None:
      execute("DELETE FROM patients WHERE id_patient = %s", (created_patient_id,))


def test_patient_profile_validates_clinical_month_ranges_and_extra_fields():
  token = _login_admin()
  headers = {"Authorization": f"Bearer {token}"}
  created_patient_id: int | None = None

  try:
    create = client.post(
      "/api/patients",
      headers=headers,
      json={"name": "Validation Target", "status": "pending", "condition": "Initial"},
    )
    assert create.status_code == 201, create.text
    created_patient_id = int(create.json()["id"])

    invalid_month = client.put(
      f"/api/patients/{created_patient_id}/profile",
      headers=headers,
      json={
        "schemaVersion": 1,
        "diagnosis": "Validation test",
        "pathologySummary": "Validation test",
        "analyses": [],
        "report": {
          "conclusion": "ok",
          "reasoning": "ok",
          "sources": ["ok"],
        },
        "clinicalData": {
          "ipp": "arcane1",
          "birthDateYear": 1962,
          "birthDateMonth": 13,
          "sex": "MALE",
          "deathDateYear": 2022,
          "deathDateMonth": 3,
          "lastVisitDateYear": 2022,
          "lastVisitDateMonth": 3,
          "lastNewsDateYear": 2022,
          "lastNewsDateMonth": 3,
          "medication": [],
          "surgery": [],
          "primaryCancer": [],
          "biologicalSpecimenList": [],
          "mesureList": [],
        },
      },
    )
    assert invalid_month.status_code == 422

    extra_field_in_report = client.put(
      f"/api/patients/{created_patient_id}/profile",
      headers=headers,
      json={
        "schemaVersion": 1,
        "diagnosis": "Validation test",
        "pathologySummary": "Validation test",
        "analyses": [],
        "report": {
          "conclusion": "ok",
          "reasoning": "ok",
          "sources": ["ok"],
          "unexpected": "should fail",
        },
      },
    )
    assert extra_field_in_report.status_code == 422
  finally:
    if created_patient_id is not None:
      execute("DELETE FROM patients WHERE id_patient = %s", (created_patient_id,))

