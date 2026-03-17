from __future__ import annotations

from typing import Any

from ..errors import ApplicationError
from ..ports.auth_ports import PasswordPort, TokenPort, UserRepositoryPort
from ...domain.users import User


class AuthService:
  def __init__(
    self,
    user_repository: UserRepositoryPort,
    password_port: PasswordPort,
    token_port: TokenPort,
  ):
    self._users = user_repository
    self._passwords = password_port
    self._tokens = token_port

  def login(self, identifier: str, password: str) -> dict[str, Any]:
    user = self._users.find_by_identifier(identifier)
    if not user:
      raise ApplicationError("Invalid credentials", 401)
    if user.is_active is False:
      raise ApplicationError("User disabled", 403)

    if not user.password_hash or not self._passwords.verify(password, user.password_hash):
      raise ApplicationError("Invalid credentials", 401)

    return self._build_login_payload(user)

  def refresh(self, refresh_token: str) -> dict[str, Any]:
    try:
      claims = self._tokens.decode_refresh(refresh_token)
    except ValueError:
      raise ApplicationError("Invalid refresh token", 401)

    user_id_raw = claims.get("sub")
    if not user_id_raw:
      raise ApplicationError("Invalid refresh token", 401)

    try:
      user_id = int(user_id_raw)
    except (TypeError, ValueError):
      raise ApplicationError("Invalid refresh token", 401)

    user = self._users.find_by_id(user_id)
    if not user or user.is_active is False:
      raise ApplicationError("User not found or disabled", 401)

    return self._build_login_payload(user)

  def register(
    self,
    *,
    email: str,
    username: str,
    full_name: str | None,
    password: str,
  ) -> dict[str, str]:
    if self._users.exists_by_email_or_username(email, username):
      raise ApplicationError("Email or username already in use", 400)

    if len(password.encode("utf-8")) > 72:
      raise ApplicationError("Password too long (max 72 characters).", 400)

    password_hash = self._passwords.hash(password)
    self._users.create_pending_clinician(
      email=email,
      username=username,
      full_name=full_name,
      password_hash=password_hash,
    )
    return {
      "message": "Account created, pending admin validation",
      "email": email,
      "username": username,
    }

  def resolve_access_token(self, token: str) -> User:
    try:
      claims = self._tokens.decode_access(token)
    except ValueError:
      raise ApplicationError("Invalid token", 401)

    user_id_raw = claims.get("user_id") or claims.get("sub")
    if not user_id_raw:
      raise ApplicationError("Invalid token claims", 401)

    try:
      user_id = int(user_id_raw)
    except (TypeError, ValueError):
      raise ApplicationError("Invalid token claims", 401)

    user = self._users.find_by_id(user_id)
    if not user or user.is_active is False:
      raise ApplicationError("User not found or disabled", 401)
    return user

  def _build_login_payload(self, user: User) -> dict[str, Any]:
    return {
      "token": self._tokens.create_access(user.id, user.role),
      "refresh_token": self._tokens.create_refresh(user.id),
      "user": user,
    }

