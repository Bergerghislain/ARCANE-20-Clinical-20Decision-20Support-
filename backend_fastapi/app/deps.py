from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException, status

from .application.errors import ApplicationError
from .application.services.admin_service import AdminService
from .application.services.argos_service import ArgosService
from .application.services.auth_service import AuthService
from .application.services.patient_service import PatientService
from .application.services.ai_service import AiService
from .infrastructure.repositories.argos_repository import (
  SqlActivityLogRepository,
  SqlArgosRepository,
)
from .infrastructure.repositories.patient_repository import SqlPatientRepository
from .infrastructure.repositories.user_repository import SqlUserRepository
from .infrastructure.security.auth_gateways import PasswordGateway, TokenGateway
from .infrastructure.ai.openai_compatible_client import OpenAiCompatibleClient


def get_user_repository() -> SqlUserRepository:
  return SqlUserRepository()


def get_patient_repository() -> SqlPatientRepository:
  return SqlPatientRepository()


def get_argos_repository() -> SqlArgosRepository:
  return SqlArgosRepository()


def get_activity_log_repository() -> SqlActivityLogRepository:
  return SqlActivityLogRepository()


def get_password_gateway() -> PasswordGateway:
  return PasswordGateway()


def get_token_gateway() -> TokenGateway:
  return TokenGateway()


def get_auth_service(
  users: Annotated[SqlUserRepository, Depends(get_user_repository)],
  passwords: Annotated[PasswordGateway, Depends(get_password_gateway)],
  tokens: Annotated[TokenGateway, Depends(get_token_gateway)],
) -> AuthService:
  return AuthService(users, passwords, tokens)


def get_admin_service(
  users: Annotated[SqlUserRepository, Depends(get_user_repository)],
) -> AdminService:
  return AdminService(users)


def get_patient_service(
  patients: Annotated[SqlPatientRepository, Depends(get_patient_repository)],
) -> PatientService:
  return PatientService(patients)


def get_argos_service(
  argos_repo: Annotated[SqlArgosRepository, Depends(get_argos_repository)],
  activity_repo: Annotated[SqlActivityLogRepository, Depends(get_activity_log_repository)],
) -> ArgosService:
  return ArgosService(argos_repo, activity_repo)


def get_llm_client() -> OpenAiCompatibleClient:
  return OpenAiCompatibleClient()


def get_ai_service(
  llm: Annotated[OpenAiCompatibleClient, Depends(get_llm_client)],
) -> AiService:
  return AiService(llm)


def get_current_user(
  auth_service: Annotated[AuthService, Depends(get_auth_service)],
  authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
  if not authorization:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Missing Authorization header",
    )

  scheme, _, token = authorization.partition(" ")
  if scheme.lower() != "bearer" or not token:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid Authorization header",
    )

  try:
    user = auth_service.resolve_access_token(token)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

  return user.to_public_dict()


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]


def require_role(*roles: str):
  def _dep(user: CurrentUser) -> dict[str, Any]:
    role = str(user.get("role") or "").lower()
    if role not in [r.lower() for r in roles]:
      raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions",
      )
    return user

  return _dep


ClinicianUser = Annotated[dict[str, Any], Depends(require_role("clinician"))]
AdminUser = Annotated[dict[str, Any], Depends(require_role("admin"))]
ClinicianOrAdminUser = Annotated[
  dict[str, Any],
  Depends(require_role("clinician", "admin")),
]

