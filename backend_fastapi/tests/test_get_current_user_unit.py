from __future__ import annotations

import pytest
from fastapi import HTTPException

from backend_fastapi.app.application.errors import ApplicationError
from backend_fastapi.app.deps import get_current_user


class _User:
  def __init__(self, role: str = "admin"):
    self.role = role

  def to_public_dict(self):  # noqa: ANN001
    return {"id": 1, "role": self.role}


class _Auth:
  def __init__(self, user=None, err: ApplicationError | None = None):  # noqa: ANN001
    self._user = user
    self._err = err
    self.last_token: str | None = None

  def resolve_access_token(self, token: str):  # noqa: ANN001
    self.last_token = token
    if self._err:
      raise self._err
    return self._user or _User()


def test_get_current_user_requires_authorization_header():
  with pytest.raises(HTTPException) as exc:
    get_current_user(_Auth(), authorization=None)
  assert exc.value.status_code == 401
  assert exc.value.detail == "Missing Authorization header"


@pytest.mark.parametrize(
  "authorization",
  ["Bearer", "Basic abc", "bearer", "Token abc"],
)
def test_get_current_user_rejects_invalid_authorization_header(authorization: str):
  with pytest.raises(HTTPException) as exc:
    get_current_user(_Auth(), authorization=authorization)
  assert exc.value.status_code == 401
  assert exc.value.detail == "Invalid Authorization header"


def test_get_current_user_accepts_lowercase_bearer_and_keeps_token_whitespace():
  auth = _Auth(user=_User(role="admin"))
  out = get_current_user(auth, authorization="bearer   abc.def")
  assert out["role"] == "admin"
  # Intentionnellement: deps.py ne strippe pas le token, il le transmet tel quel.
  assert auth.last_token == "  abc.def"


def test_get_current_user_resolves_token_and_returns_public_dict():
  auth = _Auth(user=_User(role="clinician"))
  out = get_current_user(auth, authorization="Bearer abc.def")
  assert auth.last_token == "abc.def"
  assert out == {"id": 1, "role": "clinician"}


def test_get_current_user_maps_application_error_to_http_exception():
  auth = _Auth(err=ApplicationError("Invalid token", 401))
  with pytest.raises(HTTPException) as exc:
    get_current_user(auth, authorization="Bearer bad")
  assert exc.value.status_code == 401
  assert exc.value.detail == "Invalid token"

