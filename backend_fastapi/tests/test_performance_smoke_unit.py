from __future__ import annotations

import pytest

from backend_fastapi.app.application.services.argos_service import ArgosService
from backend_fastapi.app.infrastructure.repositories.patient_repository import (
  _coerce_health_info,
  _extract_profile_record,
)
from backend_fastapi.tests.test_argos_service_unit import _ActivityLog, _Repo

pytestmark = pytest.mark.perf


def test_bench_extract_profile_record(benchmark):
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

  def run() -> None:
    rec = _extract_profile_record(_coerce_health_info(hi))
    assert rec is not None and rec["profile_version"] == 9

  benchmark(run)


def test_bench_argos_list_discussions(benchmark):
  repo = _Repo()
  log = _ActivityLog()
  service = ArgosService(repo, log)
  service.create_discussion(
    payload={"patient_id": 1, "title": "A"},
    clinician_id=3,
    ip_address=None,
    user_agent=None,
  )

  def run() -> None:
    rows = service.list_discussions(clinician_id=3)
    assert len(rows) == 1

  benchmark(run)
