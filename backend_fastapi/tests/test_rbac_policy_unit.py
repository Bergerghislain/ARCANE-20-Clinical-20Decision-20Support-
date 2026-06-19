"""Tests unitaires du controle d'acces metier (politique patient + require_role)."""
from __future__ import annotations

import pytest
from fastapi import HTTPException

from backend_fastapi.app.application.errors import ApplicationError
from backend_fastapi.app.application.patient_profile_policy import assert_can_access_patient
from backend_fastapi.app.deps import require_role


# --- assert_can_access_patient ---
def test_admin_can_access_any_patient():
  # Un admin accede meme a un patient assigne a un autre clinicien.
  assert_can_access_patient(
    patient={"assigned_clinician_id": 99},
    requester_id=1,
    requester_role="admin",
  )


def test_assigned_clinician_can_access_own_patient():
  assert_can_access_patient(
    patient={"assigned_clinician_id": 10},
    requester_id=10,
    requester_role="clinician",
  )


def test_clinician_cannot_access_other_clinicians_patient():
  with pytest.raises(ApplicationError) as exc:
    assert_can_access_patient(
      patient={"assigned_clinician_id": 99},
      requester_id=10,
      requester_role="clinician",
    )
  assert exc.value.status_code == 403


def test_patient_without_clinician_raises_500():
  with pytest.raises(ApplicationError) as exc:
    assert_can_access_patient(
      patient={"assigned_clinician_id": None},
      requester_id=10,
      requester_role="clinician",
    )
  assert exc.value.status_code == 500


def test_role_is_case_insensitive_for_admin():
  assert_can_access_patient(
    patient={"assigned_clinician_id": 99},
    requester_id=1,
    requester_role="ADMIN",
  )


# --- require_role ---
def test_require_role_allows_matching_role():
  dep = require_role("clinician", "admin")
  user = {"id": 1, "role": "clinician"}
  assert dep(user) is user


def test_require_role_is_case_insensitive():
  dep = require_role("clinician")
  user = {"id": 1, "role": "Clinician"}
  assert dep(user) is user


def test_require_role_denies_wrong_role():
  dep = require_role("admin")
  with pytest.raises(HTTPException) as exc:
    dep({"id": 1, "role": "clinician"})
  assert exc.value.status_code == 403


def test_require_role_denies_missing_role():
  dep = require_role("admin")
  with pytest.raises(HTTPException) as exc:
    dep({"id": 1})
  assert exc.value.status_code == 403
