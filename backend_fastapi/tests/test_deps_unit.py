from __future__ import annotations

import pytest
from fastapi import HTTPException

from backend_fastapi.app.deps import require_role


def test_require_role_allows_matching_role_case_insensitive():
  dep = require_role("Clinician", "ADMIN")
  assert dep({"role": "clinician"})["role"] == "clinician"
  assert dep({"role": "ADMIN"})["role"] == "ADMIN"


def test_require_role_rejects_missing_role():
  dep = require_role("admin")
  with pytest.raises(HTTPException) as exc:
    dep({})
  assert exc.value.status_code == 403


def test_require_role_rejects_unexpected_role():
  dep = require_role("admin")
  with pytest.raises(HTTPException) as exc:
    dep({"role": "researcher"})
  assert exc.value.status_code == 403

