from __future__ import annotations

import time

import pytest

from backend_fastapi.app.application.services.argos_service import ArgosService
from backend_fastapi.app.infrastructure.repositories.patient_repository import (
  _coerce_health_info,
  _extract_profile_record,
)
from backend_fastapi.tests.test_argos_service_unit import _ActivityLog, _Repo

pytestmark = pytest.mark.perf


def test_extract_profile_record_many_iterations_is_fast():
  hi = {
    "manual_profile": {
      "schemaVersion": 1,
      "patientId": "1",
      "diagnosis": "x" * 400,
      "pathologySummary": "y",
      "analyses": [],
      "report": {"conclusion": "c", "reasoning": "r", "sources": ["s"]},
    },
    "manual_profile_version": 9,
    "manual_profile_schema_version": 2,
  }
  t0 = time.perf_counter()
  for _ in range(3000):
    rec = _extract_profile_record(_coerce_health_info(hi))
    assert rec is not None and rec["profile_version"] == 9
  assert time.perf_counter() - t0 < 2.0


def test_argos_service_list_discussions_hot_path():
  repo = _Repo()
  log = _ActivityLog()
  service = ArgosService(repo, log)
  service.create_discussion(payload={"patient_id": 1, "title": "A"}, clinician_id=3, ip_address=None, user_agent=None)
  t0 = time.perf_counter()
  for _ in range(2000):
    service.list_discussions(clinician_id=3)
  assert time.perf_counter() - t0 < 2.0
