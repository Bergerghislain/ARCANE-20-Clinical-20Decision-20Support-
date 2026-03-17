from __future__ import annotations

from typing import Any, Callable

from ..errors import ApplicationError
from ..ports.admin_ports import AdminUserRepositoryPort
from ...domain.admin import AdminListStatus, ValidationAction


class AdminService:
  def __init__(self, repository: AdminUserRepositoryPort):
    self._repository = repository
    self._list_strategies: dict[AdminListStatus, Callable[[], list[dict[str, Any]]]] = {
      AdminListStatus.EN_ATTENTE: self._repository.list_pending_users,
      AdminListStatus.ACTIF: self._repository.list_active_users,
      AdminListStatus.REJETE: self._list_rejected_users,
    }
    self._validation_strategies: dict[ValidationAction, Callable[[int, str | None, dict[str, Any]], None]] = {
      ValidationAction.APPROVE: self._approve_user,
      ValidationAction.REJECT: self._reject_user,
    }

  def list_users(self, status_value: str) -> list[dict[str, Any]]:
    try:
      status_enum = AdminListStatus(status_value.upper())
    except ValueError:
      raise ApplicationError("Invalid status", 400)

    strategy = self._list_strategies[status_enum]
    return strategy()

  def validate_user(self, *, user_id: int, action: str, role: str | None) -> dict[str, Any]:
    user = self._repository.find_user_summary(user_id)
    if not user:
      raise ApplicationError("User not found", 404)

    try:
      action_enum = ValidationAction(action.upper())
    except ValueError:
      raise ApplicationError("Invalid action", 400)

    strategy = self._validation_strategies[action_enum]
    strategy(user_id, role, user)

    updated = self._repository.find_user_summary(user_id)
    if not updated:
      raise ApplicationError("Failed to update user", 500)
    return updated

  def _approve_user(self, user_id: int, role: str | None, current: dict[str, Any]) -> None:
    new_role = (role or current.get("role") or "clinician").lower()
    self._repository.approve_user(user_id, new_role)

  def _reject_user(self, user_id: int, _role: str | None, _current: dict[str, Any]) -> None:
    self._repository.reject_user(user_id)

  def _list_rejected_users(self) -> list[dict[str, Any]]:
    # Le schéma actuel n'a pas de statut rejeté dédié : on garde le comportement existant.
    return []

