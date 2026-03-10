from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Path, Query, status
from pydantic import BaseModel

from ..db import fetch_all, fetch_one, execute
from ..deps import AdminUser


router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
def list_users(
  _admin: AdminUser,
  status: str = Query("EN_ATTENTE", pattern="^(EN_ATTENTE|ACTIF|REJETE)$"),
) -> list[dict[str, Any]]:
  """
  Liste les comptes utilisateurs pour l'administration.

  - EN_ATTENTE: is_active = FALSE
  - ACTIF:      is_active = TRUE
  - REJETE:     réservé pour une éventuelle colonne 'status' dédiée
  """
  status_upper = status.upper()

  if status_upper == "EN_ATTENTE":
    rows = fetch_all(
      """
      SELECT id, email, username, role, is_active
      FROM users
      WHERE is_active = FALSE
      ORDER BY created_at DESC
      """,
    )
  elif status_upper == "ACTIF":
    rows = fetch_all(
      """
      SELECT id, email, username, role, is_active
      FROM users
      WHERE is_active = TRUE
      ORDER BY created_at DESC
      """,
    )
  else:  # "REJETE" - pas encore géré finement, on retourne une liste vide pour le moment
    rows = []

  return rows


class ValidateUserIn(BaseModel):
  action: Literal["APPROVE", "REJECT"]
  role: Literal["clinician", "researcher", "admin"] | None = None


@router.post("/users/{user_id}/validate")
def validate_user(
  _admin: AdminUser,
  user_id: int = Path(..., ge=1),
  payload: ValidateUserIn | None = None,
) -> dict[str, Any]:
  """Valide ou rejette un compte utilisateur."""
  user = fetch_one(
    """
    SELECT id, email, username, role, is_active
    FROM users
    WHERE id = %s
    LIMIT 1
    """,
    (user_id,),
  )
  if not user:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="User not found",
    )

  if payload is None:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Missing validation payload",
    )

  action = payload.action.upper()

  if action == "APPROVE":
    # Choisir le rôle final : celui fourni ou celui existant (fallback clinician)
    new_role = (payload.role or user.get("role") or "clinician").lower()
    execute(
      """
      UPDATE users
      SET is_active = TRUE,
          role = %s,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = %s
      """,
      (new_role, user_id),
    )
  elif action == "REJECT":
    # Marque le compte comme inactif (on pourrait aussi stocker un statut dédié)
    execute(
      """
      UPDATE users
      SET is_active = FALSE,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = %s
      """,
      (user_id,),
    )
  else:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Invalid action",
    )

  updated = fetch_one(
    """
    SELECT id, email, username, role, is_active
    FROM users
    WHERE id = %s
    LIMIT 1
    """,
    (user_id,),
  )
  if not updated:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="Failed to update user",
    )

  # TODO: envoyer un email de bienvenue / refus ici si besoin

  return updated

