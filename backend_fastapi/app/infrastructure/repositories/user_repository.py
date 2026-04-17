from __future__ import annotations

from typing import Any

from ...db import execute, fetch_all, fetch_one
from ...domain.users import User
from ..cache.user_by_id_cache import get_cached_user, invalidate_user, set_cached_user


class SqlUserRepository:
  def find_by_identifier(self, identifier: str) -> User | None:
    row = fetch_one(
      """
      SELECT id, username, email, role, full_name, is_active, password_hash
      FROM users
      WHERE email = %s OR username = %s
      LIMIT 1
      """,
      (identifier, identifier),
    )
    if not row:
      return None
    return User.from_row(row)

  def find_by_id(self, user_id: int) -> User | None:
    cached = get_cached_user(user_id)
    if cached is not None:
      return cached
    row = fetch_one(
      """
      SELECT id, username, email, role, full_name, is_active
      FROM users
      WHERE id = %s
      LIMIT 1
      """,
      (user_id,),
    )
    if not row:
      return None
    user = User.from_row(row)
    set_cached_user(user_id, user)
    return user

  def exists_by_email_or_username(self, email: str, username: str) -> bool:
    existing = fetch_one(
      """
      SELECT id
      FROM users
      WHERE email = %s OR username = %s
      LIMIT 1
      """,
      (email, username),
    )
    return existing is not None

  def create_pending_clinician(
    self,
    *,
    email: str,
    username: str,
    full_name: str | None,
    password_hash: str,
  ) -> None:
    execute(
      """
      INSERT INTO users (username, email, password_hash, role, full_name, is_active)
      VALUES (%s, %s, %s, %s, %s, FALSE)
      """,
      (username, email, password_hash, "clinician", full_name),
    )

  def list_pending_users(self) -> list[dict[str, Any]]:
    rows = fetch_all(
      """
      SELECT id, email, username, role, is_active
      FROM users
      WHERE is_active = FALSE
      ORDER BY created_at DESC
      """,
    )
    return rows

  def list_active_users(self) -> list[dict[str, Any]]:
    rows = fetch_all(
      """
      SELECT id, email, username, role, is_active
      FROM users
      WHERE is_active = TRUE
      ORDER BY created_at DESC
      """,
    )
    return rows

  def find_user_summary(self, user_id: int) -> dict[str, Any] | None:
    return fetch_one(
      """
      SELECT id, email, username, role, is_active
      FROM users
      WHERE id = %s
      LIMIT 1
      """,
      (user_id,),
    )

  def approve_user(self, user_id: int, role: str) -> None:
    execute(
      """
      UPDATE users
      SET is_active = TRUE,
          role = %s,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = %s
      """,
      (role, user_id),
    )
    invalidate_user(user_id)

  def reject_user(self, user_id: int) -> None:
    execute(
      """
      UPDATE users
      SET is_active = FALSE,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = %s
      """,
      (user_id,),
    )
    invalidate_user(user_id)

