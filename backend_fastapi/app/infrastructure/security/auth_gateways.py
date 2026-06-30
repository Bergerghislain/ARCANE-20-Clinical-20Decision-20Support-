from __future__ import annotations

from ...security import (
  create_access_token,
  create_refresh_token,
  decode_refresh_token,
  decode_token,
  pwd_context,
  verify_password,
)


class PasswordGateway:
  def verify(self, plain_password: str, password_hash: str) -> bool:
    return verify_password(plain_password, password_hash)

  def hash(self, plain_password: str) -> str:
    return pwd_context.hash(plain_password)


class TokenGateway:
  def create_access(self, user_id: int, role: str | None) -> str:
    return create_access_token(
      subject=str(user_id),
      extra_claims={"user_id": user_id, "role": role},
    )

  def create_refresh(self, user_id: int) -> str:
    return create_refresh_token(subject=str(user_id))

  def decode_access(self, token: str) -> dict:
    return decode_token(token)

  def decode_refresh(self, token: str) -> dict:
    return decode_refresh_token(token)

