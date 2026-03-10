from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..db import fetch_one
from ..schemas import LoginIn, LoginOut, UserOut
from ..security import create_access_token, verify_password


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn) -> LoginOut:
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

