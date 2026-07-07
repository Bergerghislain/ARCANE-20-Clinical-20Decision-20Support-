from __future__ import annotations

import pytest

from backend_fastapi.app.db import execute
from backend_fastapi.tests.integration_helpers import auth_headers, client, login, patient_id_by_ipp


def _cleanup_discussion(discussion_id: int) -> None:
  execute("DELETE FROM argos_messages WHERE discussion_id = %s", (discussion_id,))
  execute("DELETE FROM argos_discussions WHERE id = %s", (discussion_id,))


@pytest.mark.integration
def test_argos_router_create_discussion_send_message_reload_history_intact():
  """Créer discussion → envoyer message → recharger (GET) → historique intact."""
  token = login("martin@hospital.com")
  headers = auth_headers(token)
  patient_id = patient_id_by_ipp("PAT001")

  create = client.post(
    "/api/argos/discussions",
    headers=headers,
    json={"patient_id": patient_id, "title": "Test persistance ARGOS"},
  )
  assert create.status_code == 201, create.text
  discussion_id = int(create.json()["id"])

  try:
    user_msg = client.post(
      f"/api/argos/discussions/{discussion_id}/messages",
      headers=headers,
      json={
        "message_type": "user_query",
        "content": "Quelle est la prochaine étape clinique ?",
      },
    )
    assert user_msg.status_code == 201, user_msg.text
    user_msg_id = int(user_msg.json()["id"])

    argos_msg = client.post(
      f"/api/argos/discussions/{discussion_id}/messages",
      headers=headers,
      json={
        "message_type": "argos_response",
        "content": "Synthèse clinique de test",
        "sections": {
          "clinicalSynthesis": "Synthèse",
          "hypotheses": ["Option A"],
          "arguments": ["Argument 1"],
          "nextSteps": ["Étape 1"],
          "traceability": "Source test",
        },
      },
    )
    assert argos_msg.status_code == 201, argos_msg.text
    argos_msg_id = int(argos_msg.json()["id"])

    # Simule un rechargement navigateur : nouvelle lecture HTTP sans état client.
    reload = client.get(
      f"/api/argos/discussions/{discussion_id}/messages",
      headers=headers,
    )
    assert reload.status_code == 200, reload.text
    messages = reload.json()
    assert len(messages) == 2

    by_id = {int(m["id"]): m for m in messages}
    assert by_id[user_msg_id]["message_type"] == "user_query"
    assert by_id[user_msg_id]["content"] == "Quelle est la prochaine étape clinique ?"
    assert by_id[argos_msg_id]["message_type"] == "argos_response"
    assert by_id[argos_msg_id]["sections"]["clinicalSynthesis"] == "Synthèse"
  finally:
    _cleanup_discussion(discussion_id)


@pytest.mark.integration
def test_argos_router_list_discussions_after_message():
  token = login("martin@hospital.com")
  headers = auth_headers(token)
  patient_id = patient_id_by_ipp("PAT001")

  create = client.post(
    "/api/argos/discussions",
    headers=headers,
    json={"patient_id": patient_id, "title": "Discussion liste ARGOS"},
  )
  assert create.status_code == 201, create.text
  discussion_id = int(create.json()["id"])

  try:
    post = client.post(
      f"/api/argos/discussions/{discussion_id}/messages",
      headers=headers,
      json={"message_type": "user_query", "content": "Message liste"},
    )
    assert post.status_code == 201, post.text

    listed = client.get(
      f"/api/argos/discussions?patient_id={patient_id}",
      headers=headers,
    )
    assert listed.status_code == 200, listed.text
    ids = {int(row["id"]) for row in listed.json()}
    assert discussion_id in ids
  finally:
    _cleanup_discussion(discussion_id)


@pytest.mark.integration
def test_argos_router_admin_can_create_and_list_discussions():
  """Les admins doivent accéder à ARGOS comme les cliniciens (pas de 403)."""
  token = login("admin@arcane.com")
  headers = auth_headers(token)
  patient_id = patient_id_by_ipp("PAT001")

  create = client.post(
    "/api/argos/discussions",
    headers=headers,
    json={"patient_id": patient_id, "title": "Discussion admin ARGOS"},
  )
  assert create.status_code == 201, create.text
  discussion_id = int(create.json()["id"])

  try:
    listed = client.get(
      f"/api/argos/discussions?patient_id={patient_id}",
      headers=headers,
    )
    assert listed.status_code == 200, listed.text
    ids = {int(row["id"]) for row in listed.json()}
    assert discussion_id in ids
  finally:
    _cleanup_discussion(discussion_id)


@pytest.mark.integration
def test_argos_router_other_clinician_cannot_read_messages():
  martin_token = login("martin@hospital.com")
  leclerc_token = login("leclerc@hospital.com")
  patient_id = patient_id_by_ipp("PAT003")

  create = client.post(
    "/api/argos/discussions",
    headers=auth_headers(leclerc_token),
    json={"patient_id": patient_id, "title": "Discussion privée Leclerc"},
  )
  assert create.status_code == 201, create.text
  discussion_id = int(create.json()["id"])

  try:
    denied = client.get(
      f"/api/argos/discussions/{discussion_id}/messages",
      headers=auth_headers(martin_token),
    )
    assert denied.status_code == 404
  finally:
    _cleanup_discussion(discussion_id)
