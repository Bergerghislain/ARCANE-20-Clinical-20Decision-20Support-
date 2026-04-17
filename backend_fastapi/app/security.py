from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from .settings import settings


pwd_context = CryptContext(
  schemes=["bcrypt"],
  deprecated="auto",
  bcrypt__default_rounds=settings.bcrypt_rounds,
)


def verify_password(plain_password: str, password_hash: str) -> bool:
  if not isinstance(password_hash, str):
    return False
  # Compatibilité démo contrôlable par configuration.
  if settings.allow_demo_password_fallback:
    if plain_password == "password" and (
      not password_hash
      or password_hash.startswith("$2")
      or "YourHashedPasswordHere" in password_hash
    ):
      return True
  if password_hash.startswith("$2"):
    try:
      return pwd_context.verify(plain_password, password_hash)
    except Exception:
      return False
  return settings.allow_demo_password_fallback and plain_password == password_hash


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
  now = datetime.now(timezone.utc)
  expire = now + timedelta(minutes=settings.access_token_expire_minutes)
  payload: dict[str, Any] = {
    "sub": subject,
    "iss": settings.jwt_issuer,
    "aud": settings.jwt_audience,
    "iat": int(now.timestamp()),
    "exp": int(expire.timestamp()),
  }
  if extra_claims:
    payload.update(extra_claims)
  return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict[str, Any]:
  try:
    return jwt.decode(
      token,
      settings.jwt_secret,
      algorithms=["HS256"],
      audience=settings.jwt_audience,
      issuer=settings.jwt_issuer,
      options={"verify_aud": True, "verify_iss": True},
    )
  except JWTError as exc:
    raise ValueError("Invalid token") from exc


def create_refresh_token(subject: str) -> str:
  """Crée un refresh token JWT avec une durée de vie plus longue."""
  now = datetime.now(timezone.utc)
  expire = now + timedelta(days=settings.refresh_token_expire_days)
  payload: dict[str, Any] = {
    "sub": subject,
    "type": "refresh",
    "iss": settings.jwt_issuer,
    "aud": settings.jwt_audience,
    "iat": int(now.timestamp()),
    "exp": int(expire.timestamp()),
  }
  return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_refresh_token(token: str) -> dict[str, Any]:
  try:
    claims = jwt.decode(
      token,
      settings.jwt_secret,
      algorithms=["HS256"],
      audience=settings.jwt_audience,
      issuer=settings.jwt_issuer,
      options={"verify_aud": True, "verify_iss": True},
    )
  except JWTError as exc:
    raise ValueError("Invalid token") from exc

  if claims.get("type") != "refresh":
    raise ValueError("Invalid token type")
  return claims

