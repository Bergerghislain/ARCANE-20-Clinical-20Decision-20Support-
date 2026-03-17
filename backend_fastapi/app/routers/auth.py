from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from ..application.errors import ApplicationError
from ..application.services.auth_service import AuthService
from ..deps import get_auth_service
from ..schemas import LoginIn, LoginOut, RegisterIn, UserOut
from ..settings import settings


router = APIRouter(prefix="/api/auth", tags=["auth"])


REFRESH_COOKIE_NAME = "arcane_refresh_token"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
  response.set_cookie(
    key=REFRESH_COOKIE_NAME,
    value=refresh_token,
    httponly=True,
    secure=settings.cookie_secure,
    samesite=settings.cookie_samesite,
    domain=settings.cookie_domain,
    path="/",
  )


def _clear_refresh_cookie(response: Response) -> None:
  response.delete_cookie(
    key=REFRESH_COOKIE_NAME,
    domain=settings.cookie_domain,
    path="/",
  )


def _to_login_out(payload: dict[str, Any]) -> LoginOut:
  user = payload["user"]
  return LoginOut(
    token=str(payload["token"]),
    user=UserOut(
      id=int(user.id),
      username=str(user.username),
      email=str(user.email),
      role=str(user.role),
      full_name=user.full_name,
    ),
  )


@router.post("/login", response_model=LoginOut)
def login(
  payload: LoginIn,
  response: Response,
  auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> LoginOut:
  try:
    session = auth_service.login(payload.identifier, payload.password)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

  _set_refresh_cookie(response, str(session["refresh_token"]))
  return _to_login_out(session)


@router.post("/refresh", response_model=LoginOut)
def refresh_token(
  request: Request,
  response: Response,
  auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> LoginOut:
  cookie = request.cookies.get(REFRESH_COOKIE_NAME)
  if not cookie:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

  try:
    session = auth_service.refresh(cookie)
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

  _set_refresh_cookie(response, str(session["refresh_token"]))
  return _to_login_out(session)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
  _clear_refresh_cookie(response)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
  payload: RegisterIn,
  auth_service: Annotated[AuthService, Depends(get_auth_service)],
):
  try:
    return auth_service.register(
      email=str(payload.email),
      username=str(payload.username),
      full_name=payload.full_name,
      password=str(payload.password),
    )
  except ApplicationError as error:
    raise HTTPException(status_code=error.status_code, detail=error.detail)