"""Tests de la piste d'audit (activity_logs) sur les donnees patient."""
from __future__ import annotations

from unittest.mock import MagicMock

from backend_fastapi.app.application.services.patient_clinical_service import (
  PatientClinicalService,
)
from backend_fastapi.app.application.services.patient_service import PatientService


def _patient(assigned=10):
  return {"id_patient": 1, "assigned_clinician_id": assigned}


# --- PatientService ---
def test_get_patient_writes_audit():
  repo = MagicMock()
  repo.find_patient.return_value = _patient()
  audit = MagicMock()
  svc = PatientService(repo, activity_log=audit)

  svc.get_patient(1, requester_id=99, requester_role="admin", ip_address="1.2.3.4", user_agent="UA")

  audit.write.assert_called_once()
  kwargs = audit.write.call_args.kwargs
  assert kwargs["action_type"] == "patient_viewed"
  assert kwargs["resource_id"] == 1
  assert kwargs["ip_address"] == "1.2.3.4"


def test_reassign_patient_writes_audit():
  repo = MagicMock()
  repo.find_patient.return_value = _patient(assigned=5)
  repo.is_clinician.return_value = True
  repo.reassign_patient.return_value = {"id_patient": 1, "assigned_clinician_id": 7}
  audit = MagicMock()
  svc = PatientService(repo, activity_log=audit)

  svc.reassign_patient(1, new_clinician_id=7, requester_id=99, requester_role="admin")

  kwargs = audit.write.call_args.kwargs
  assert kwargs["action_type"] == "patient_reassigned"
  assert kwargs["details"] == {"from": 5, "to": 7}


def test_audit_failure_does_not_break_request():
  repo = MagicMock()
  repo.find_patient.return_value = _patient()
  audit = MagicMock()
  audit.write.side_effect = RuntimeError("audit DB down")
  svc = PatientService(repo, activity_log=audit)

  # L'audit echoue mais la lecture du dossier doit reussir.
  out = svc.get_patient(1, requester_id=99, requester_role="admin")
  assert out["id_patient"] == 1


def test_no_audit_when_disabled():
  repo = MagicMock()
  repo.find_patient.return_value = _patient()
  svc = PatientService(repo)  # pas d'activity_log
  out = svc.get_patient(1, requester_id=99, requester_role="admin")
  assert out["id_patient"] == 1


# --- PatientClinicalService (point de passage unique des ecritures) ---
def test_clinical_write_writes_audit():
  patient_repo = MagicMock()
  patient_repo.find_patient.return_value = _patient(assigned=10)
  write_repo = MagicMock()
  write_repo.create_measure.return_value = {"id": 5}
  audit = MagicMock()
  svc = PatientClinicalService(patient_repo, write_repo, activity_log=audit)

  svc.create_measure(1, {"measureType": "WEIGHT", "measureUnit": "kg"}, requester_id=10, requester_role="clinician")

  kwargs = audit.write.call_args.kwargs
  assert kwargs["action_type"] == "patient_clinical_modified"
  assert kwargs["resource_id"] == 1


def test_clinical_audit_failure_does_not_break():
  patient_repo = MagicMock()
  patient_repo.find_patient.return_value = _patient(assigned=10)
  write_repo = MagicMock()
  write_repo.create_measure.return_value = {"id": 5}
  audit = MagicMock()
  audit.write.side_effect = RuntimeError("audit down")
  svc = PatientClinicalService(patient_repo, write_repo, activity_log=audit)

  out = svc.create_measure(1, {"measureType": "WEIGHT", "measureUnit": "kg"}, requester_id=10, requester_role="clinician")
  assert out["id"] == 5
