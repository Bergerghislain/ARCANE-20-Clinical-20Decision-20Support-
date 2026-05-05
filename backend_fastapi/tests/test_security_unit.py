from __future__ import annotations

import pytest

from backend_fastapi.app import security


def test_verify_password_rejects_non_string_hash():
  assert security.verify_password("pw", None) is False  # type: ignore[arg-type]


def test_verify_password_demo_fallback_accepts_password_magic_for_placeholder_hash(monkeypatch: pytest.MonkeyPatch):
  # Couvre la branche allow_demo_password_fallback.
  monkeypatch.setattr(security.settings, "allow_demo_password_fallback", True)
  assert security.verify_password("password", "YourHashedPasswordHere") is True


def test_verify_password_bcrypt_hash_roundtrip(monkeypatch: pytest.MonkeyPatch):
  # Hash réel -> verify utilise passlib.
  monkeypatch.setattr(security.settings, "allow_demo_password_fallback", False)
  hashed = security.pwd_context.hash("StrongPass123!")
  assert security.verify_password("StrongPass123!", hashed) is True
  assert security.verify_password("wrong", hashed) is False


def test_create_and_decode_access_token_happy_path(monkeypatch: pytest.MonkeyPatch):
  monkeypatch.setattr(security.settings, "jwt_secret", "unit_test_secret")
  token = security.create_access_token("user-123", extra_claims={"role": "admin"})
  claims = security.decode_token(token)
  assert claims["sub"] == "user-123"
  assert claims["role"] == "admin"
  assert claims["aud"] == security.settings.jwt_audience
  assert claims["iss"] == security.settings.jwt_issuer


def test_decode_token_rejects_invalid_token():
  with pytest.raises(ValueError):
    security.decode_token("not-a-jwt")


def test_refresh_token_type_validation(monkeypatch: pytest.MonkeyPatch):
  monkeypatch.setattr(security.settings, "jwt_secret", "unit_test_secret")
  refresh = security.create_refresh_token("user-123")
  claims = security.decode_refresh_token(refresh)
  assert claims["sub"] == "user-123"
  assert claims["type"] == "refresh"

  # Un access token n'a pas le bon type.
  access = security.create_access_token("user-123")
  with pytest.raises(ValueError):
    security.decode_refresh_token(access)

