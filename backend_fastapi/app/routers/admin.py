from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel

from ..application.errors import ApplicationError
from ..application.services.admin_service import AdminService
from ..deps import AdminUser, get_admin_service


router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
def list_users(
  _admin: AdminUser,
  admin_service: Annotated[AdminService, Depends(get_admin_service)],
  status: str = Query("EN_ATTENTE", pattern="^(EN_ATTENTE|ACTIF|REJETE)$"),
) -> list[dict[str, Any]]:
  try:
    return admin_service.list_users(status)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


class ValidateUserIn(BaseModel):
  action: Literal["APPROVE", "REJECT"]
  role: Literal["clinician", "researcher", "admin"] | None = None


@router.post("/users/{user_id}/validate")
def validate_user(
  _admin: AdminUser,
  admin_service: Annotated[AdminService, Depends(get_admin_service)],
  user_id: int = Path(..., ge=1),
  payload: ValidateUserIn | None = None,
) -> dict[str, Any]:
  if payload is None:
    raise HTTPException(status_code=400, detail="Missing validation payload")

  try:
    return admin_service.validate_user(
      user_id=user_id,
      action=payload.action,
      role=payload.role,
    )
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

