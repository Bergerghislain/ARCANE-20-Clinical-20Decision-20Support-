from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from ..errors import ApplicationError
from ..ports.auth_ports import (
  LoginAttemptPort,
  PasswordPort,
  TokenPort,
  UserRepositoryPort,
)
from ...domain import login_throttle
from ...domain.users import User


class AuthService:
  def __init__(
    self,
    user_repository: UserRepositoryPort,
    password_port: PasswordPort,
    token_port: TokenPort,
    login_attempts: LoginAttemptPort | None = None,
    *,
    max_attempts: int = 5,
    window_seconds: int = 900,
    lock_seconds: int = 900,
  ):
    self._users = user_repository
    self._passwords = password_port
    self._tokens = token_port
    self._login_attempts = login_attempts
    self._max_attempts = max_attempts
    self._window_seconds = window_seconds
    self._lock_seconds = lock_seconds

  def login(self, identifier: str, password: str) -> dict[str, Any]:
    key = (identifier or "").strip().lower()

    # 1) Verrou actif ? On echoue vite, sans meme verifier le mot de passe.
    self._raise_if_locked(key)

    user = self._users.find_by_identifier(identifier)
    # 2) Identifiant inconnu: on compte aussi l'echec (anti-enumeration) puis 401.
    if not user:
      self._register_failed_attempt(key)
      raise ApplicationError("Invalid credentials", 401)
    if user.is_active is False:
      raise ApplicationError("User disabled", 403)

    # 3) Mauvais mot de passe: on incremente le compteur (et on verrouille au seuil).
    if not user.password_hash or not self._passwords.verify(password, user.password_hash):
      self._register_failed_attempt(key)
      raise ApplicationError("Invalid credentials", 401)

    # 4) Succes: on remet le compteur a zero.
    if self._login_attempts is not None:
      self._login_attempts.reset(key)
    return self._build_login_payload(user)

  def _raise_if_locked(self, key: str) -> None:
    if self._login_attempts is None:
      return
    now = datetime.now(UTC)
    state = self._login_attempts.get_state(key)
    if login_throttle.is_locked(state, now):
      retry_after = login_throttle.seconds_until_unlock(state, now)
      raise ApplicationError(
        "Trop de tentatives. Compte temporairement verrouille, "
        f"reessayez dans {retry_after} secondes.",
        429,
      )

  def _register_failed_attempt(self, key: str) -> None:
    if self._login_attempts is None:
      return
    now = datetime.now(UTC)
    state = self._login_attempts.get_state(key)
    new_state = login_throttle.register_failure(
      state,
      now,
      max_attempts=self._max_attempts,
      window_seconds=self._window_seconds,
      lock_seconds=self._lock_seconds,
    )
    self._login_attempts.save_state(key, new_state)

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

