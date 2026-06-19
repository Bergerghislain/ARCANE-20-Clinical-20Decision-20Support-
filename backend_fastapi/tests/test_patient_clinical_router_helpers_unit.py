from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from backend_fastapi.app.application.errors import ApplicationError
from backend_fastapi.app.routers import patient_clinical as router_mod


def test_handle_maps_application_error():
  with pytest.raises(HTTPException) as exc:
    router_mod._handle(ApplicationError("denied", 403))
  assert exc.value.status_code == 403


def test_user_ids_extracts_role():
  uid, role = router_mod._user_ids({"id": 7, "role": "clinician"})
  assert uid == 7
  assert role == "clinician"
