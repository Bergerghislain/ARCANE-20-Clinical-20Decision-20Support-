from __future__ import annotations

from typing import Protocol

from ...domain.users import User


class UserRepositoryPort(Protocol):
  def find_by_identifier(self, identifier: str) -> User | None:
    ...

  def find_by_id(self, user_id: int) -> User | None:
    ...

  def exists_by_email_or_username(self, email: str, username: str) -> bool:
    ...

  def create_pending_clinician(
    self,
    *,
    email: str,
    username: str,
    full_name: str | None,
    password_hash: str,
  ) -> None:
    ...


class PasswordPort(Protocol):
  def verify(self, plain_password: str, password_hash: str) -> bool:
    ...

  def hash(self, plain_password: str) -> str:
    ...


class TokenPort(Protocol):
  def create_access(self, user_id: int, role: str | None) -> str:
    ...

  def create_refresh(self, user_id: int) -> str:
    ...

  def decode_access(self, token: str) -> dict:
    ...

  def decode_refresh(self, token: str) -> dict:
    ...

