from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, Request, status
from pydantic import BaseModel, EmailStr, constr

from ..db import fetch_one, execute
from ..schemas import LoginIn, LoginOut, UserOut
from ..security import (
  create_access_token,
  create_refresh_token,
  decode_refresh_token,
  verify_password,
  pwd_context,
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

class RegisterIn(BaseModel):
  email: EmailStr
  username: constr(min_length=3, max_length=100)
  full_name: str | None = None
  # Bcrypt ne supporte que 72 octets : on borne à 72 caractères.
  password: constr(min_length=8, max_length=72)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn):
  # 1) Vérifier qu'aucun user n'a déjà cet email ou username
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

  # 2) Vérifier la longueur du mot de passe côté backend (sécurité / robustesse)
  #    Même si Pydantic borne déjà à 72 caractères, on ajoute une garde explicite
  #    pour éviter toute erreur basse-niveau de bcrypt et renvoyer une 400 claire.
  raw_password = payload.password or ""
  if len(raw_password.encode("utf-8")) > 72:
    from fastapi import status as _status

    raise HTTPException(
      status_code=_status.HTTP_400_BAD_REQUEST,
      detail="Password too long (max 72 characters).",
    )

  # 2bis) Log de debug pour cette session (longueur du mot de passe)
  # #region agent log
  try:
    import json as _json
    import time as _time

    log = {
      "sessionId": "9d5a7f",
      "runId": "pre-fix",
      "hypothesisId": "H1",
      "location": "app/routers/auth.py:register",
      "message": "register password length before hash",
      "data": {"length": len(raw_password)},
      "timestamp": int(_time.time() * 1000),
    }
    with open("debug-9d5a7f.log", "a", encoding="utf-8") as _f:
      _f.write(_json.dumps(log) + "\n")
  except Exception:
    # On ne casse jamais la requête pour un problème de log
    pass
  # #endregion agent log

  # 3) Hasher le mot de passe
  password_hash = pwd_context.hash(raw_password)

  # 4) Insérer le user avec rôle clinician et is_active = FALSE
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

  # 5) (optionnel) envoyer un email
  # TODO: send confirmation email to payload.email

  # 6) Réponse simple
  return {
    "message": "Account created, pending admin validation",
    "email": payload.email,
    "username": payload.username,
  }