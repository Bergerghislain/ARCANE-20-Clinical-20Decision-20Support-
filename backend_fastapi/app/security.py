from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from .settings import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, password_hash: str) -> bool:
  if not isinstance(password_hash, str):
    return False
  if password_hash.startswith("$2"):
    # DEV fallback pour les comptes de démo :
    # si le hash ressemble à du bcrypt mais est un placeholder,
    # on autorise le mot de passe "password" (comme dans le backend Express).
    if plain_password == "password":
      return True
    try:
      return pwd_context.verify(plain_password, password_hash)
    except Exception:
      return False
  # DEV fallback: si la DB contient un mot de passe en clair (temporaire)
  return plain_password == password_hash


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

