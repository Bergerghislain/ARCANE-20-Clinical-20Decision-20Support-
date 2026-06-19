from __future__ import annotations

import pytest

from backend_fastapi.app.db import execute, fetch_one
from backend_fastapi.app.infrastructure.repositories.argos_repository import (
  SqlActivityLogRepository,
  SqlArgosRepository,
)
from backend_fastapi.tests.integration_helpers import patient_id_by_ipp


@pytest.mark.integration
def test_argos_repository_discussion_and_message_lifecycle():
  repo = SqlArgosRepository()
  activity = SqlActivityLogRepository()
  patient_id = patient_id_by_ipp("PAT001")
  clinician_row = fetch_one("SELECT id FROM users WHERE email = %s", ("martin@hospital.com",))
  assert clinician_row is not None
  clinician_id = int(clinician_row["id"])

  assert repo.patient_exists(patient_id) is True
  assert repo.patient_exists(999999) is False

  discussion = repo.create_discussion(
    patient_id=patient_id,
    clinician_id=clinician_id,
    title="Test ARGOS",
    context="Contexte clinique test",
  )
  assert discussion is not None
  discussion_id = int(discussion["id"])

  listed = repo.list_discussions(clinician_id, patient_id=patient_id)
  assert any(int(row["id"]) == discussion_id for row in listed)

  found = repo.find_discussion(discussion_id, clinician_id)
  assert found is not None
  assert repo.find_discussion(discussion_id, clinician_id + 9999) is None

  message = repo.create_message(
    discussion_id=discussion_id,
    message_type="user_query",
    content="Question test",
    sections=None,
    created_by=clinician_id,
  )
  assert message is not None
  messages = repo.list_messages(discussion_id)
  assert len(messages) >= 1

  response = repo.create_message(
    discussion_id=discussion_id,
    message_type="argos_response",
    content="Réponse test",
    sections={
      "clinicalSynthesis": "Synthèse",
      "hypotheses": ["H1"],
      "arguments": ["A1"],
      "nextSteps": ["S1"],
      "traceability": "Traçabilité",
    },
    created_by=None,
  )
  assert response is not None

  activity.write(
    user_id=clinician_id,
    action_type="argos_message_created",
    resource_type="argos_message",
    resource_id=int(response["id"]),
    details={"discussion_id": discussion_id},
    ip_address="127.0.0.1",
    user_agent="pytest",
  )

  execute("DELETE FROM argos_messages WHERE discussion_id = %s", (discussion_id,))
  execute("DELETE FROM argos_discussions WHERE id = %s", (discussion_id,))
