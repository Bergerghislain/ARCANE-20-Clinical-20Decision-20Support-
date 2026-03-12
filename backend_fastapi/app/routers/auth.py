from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, constr

from ..db import execute, fetch_one
from ..schemas import LoginIn, LoginOut, UserOut
from ..security import (
  create_access_token,
  create_refresh_token,
  decode_refresh_token,
  pwd_context,
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

  access = create_access_token(
    subject=str(user["id"]),
    extra_claims={"user_id": int(user["id"]), "role": user.get("role")},
  )
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


class RegisterIn(BaseModel):
  email: EmailStr
  username: constr(min_length=3, max_length=100)
  full_name: str | None = None
  # Bcrypt ne supporte que 72 octets : on borne à 72 caractères.
  password: constr(min_length=8, max_length=72)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn):
  existing = fetch_one(
    """
    SELECT id
    FROM users
    WHERE email = %s OR username = %s
    LIMIT 1
    """,
    (payload.email, payload.username),
  )
  if existing:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Email or username already in use",
    )

  raw_password = payload.password or ""
  if len(raw_password.encode("utf-8")) > 72:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Password too long (max 72 characters).",
    )

  password_hash = pwd_context.hash(raw_password)

  execute(
    """
    INSERT INTO users (username, email, password_hash, role, full_name, is_active)
    VALUES (%s, %s, %s, %s, %s, FALSE)
    """,
    (
      payload.username,
      payload.email,
      password_hash,
      "clinician",
      payload.full_name,
    ),
  )

  return {
    "message": "Account created, pending admin validation",
    "email": payload.email,
    "username": payload.username,
  }