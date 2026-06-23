"""Persistance des tentatives de connexion (table login_attempts)."""
from __future__ import annotations

from ...db import execute, fetch_one
from ...domain.login_throttle import AttemptState


class SqlLoginAttemptRepository:
  def get_state(self, identifier: str) -> AttemptState | None:
    row = fetch_one(
      """
      SELECT fail_count, locked_until, last_attempt_at
      FROM login_attempts
      WHERE identifier = %s
      """,
      (identifier,),
    )
    if not row:
      return None
    return AttemptState(
      fail_count=int(row.get("fail_count") or 0),
      locked_until=row.get("locked_until"),
      last_attempt_at=row.get("last_attempt_at"),
    )

  def save_state(self, identifier: str, state: AttemptState) -> None:
    execute(
      """
      INSERT INTO login_attempts (identifier, fail_count, locked_until, last_attempt_at)
      VALUES (%s, %s, %s, %s)
      ON CONFLICT (identifier) DO UPDATE
        SET fail_count = EXCLUDED.fail_count,
            locked_until = EXCLUDED.locked_until,
            last_attempt_at = EXCLUDED.last_attempt_at
      """,
      (identifier, state.fail_count, state.locked_until, state.last_attempt_at),
    )

  def reset(self, identifier: str) -> None:
    execute("DELETE FROM login_attempts WHERE identifier = %s", (identifier,))
