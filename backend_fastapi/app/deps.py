from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException, status

from .db import fetch_one
from .security import decode_token


def get_current_user(
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
    claims = decode_token(token)
  except ValueError:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid token",
    )

  user_id = claims.get("user_id")
  if not user_id:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid token claims",
    )

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
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="User not found or disabled",
    )
  return user


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]

