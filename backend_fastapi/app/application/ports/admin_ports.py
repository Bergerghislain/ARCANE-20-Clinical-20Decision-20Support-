from __future__ import annotations

from typing import Any, Protocol


class AdminUserRepositoryPort(Protocol):
  def list_pending_users(self) -> list[dict[str, Any]]:
    ...

  def list_active_users(self) -> list[dict[str, Any]]:
    ...

  def find_user_summary(self, user_id: int) -> dict[str, Any] | None:
    ...

  def approve_user(self, user_id: int, role: str) -> None:
    ...

  def reject_user(self, user_id: int) -> None:
    ...

