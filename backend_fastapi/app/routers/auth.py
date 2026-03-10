from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, Request, status

from ..db import fetch_one
from ..schemas import LoginIn, LoginOut, UserOut
from ..security import (
  create_access_token,
  create_refresh_token,
  decode_refresh_token,
  verify_password,
)
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


@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn, response: Response) -> LoginOut:
  user = fetch_one(
    """
    SELECT id, username, email, role, full_name, password_hash, is_active
    FROM users
    WHERE email = %s OR username = %s
    LIMIT 1
    """,
    (payload.identifier, payload.identifier),
  )

  if not user:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
  if user.get("is_active") is False:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User disabled")

  password_hash = user.get("password_hash") or ""
  if not verify_password(payload.password, str(password_hash)):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

  token = create_access_token(
    subject=str(user["id"]),
    extra_claims={"user_id": int(user["id"]), "role": user.get("role")},
  )

  refresh = create_refresh_token(subject=str(user["id"]))
  _set_refresh_cookie(response, refresh)

  return LoginOut(
    token=token,
    user=UserOut(
      id=int(user["id"]),
      username=str(user.get("username") or ""),
      email=str(user.get("email") or ""),
      role=str(user.get("role") or ""),
      full_name=user.get("full_name"),
    ),
  )


@router.post("/refresh", response_model=LoginOut)
def refresh_token(request: Request, response: Response) -> LoginOut:
  cookie = request.cookies.get(REFRESH_COOKIE_NAME)
  if not cookie:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

  try:
    claims = decode_refresh_token(cookie)
  except ValueError:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

  user_id = claims.get("sub")
  if not user_id:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

  user = fetch_one(
    """
    SELECT id, username, email, role, full_name, is_active
    FROM users
    WHERE id = %s
    LIMIT 1
    """,
    (int(user_id),),
  )
  if not user or user.get("is_active") is False:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or disabled")

  # Nouveau jeton d'accès
  access = create_access_token(
    subject=str(user["id"]),
    extra_claims={"user_id": int(user["id"]), "role": user.get("role")},
  )
  # On peut aussi regénérer un refresh token (rotation simple)
  new_refresh = create_refresh_token(subject=str(user["id"]))
  _set_refresh_cookie(response, new_refresh)

  return LoginOut(
    token=access,
    user=UserOut(
      id=int(user["id"]),
      username=str(user.get("username") or ""),
      email=str(user.get("email") or ""),
      role=str(user.get("role") or ""),
      full_name=user.get("full_name"),
    ),
  )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
  _clear_refresh_cookie(response)

