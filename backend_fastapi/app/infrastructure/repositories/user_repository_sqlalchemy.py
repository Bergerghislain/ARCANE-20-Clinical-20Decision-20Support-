from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ...domain.users import User
from ...models.user import UserModel
from .user_repository import SqlUserRepository


class SqlAlchemyUserReadRepository:
  """Repository SQLAlchemy (lecture uniquement).

  On commence petit: lecture utilisateur (auth/session) est un bon candidat
  car le contrat est simple et les effets de bord sont limités.
  """

  def __init__(self, session: Session):
    self._session = session

  def find_by_identifier(self, identifier: str) -> User | None:
    stmt = select(UserModel).where((UserModel.email == identifier) | (UserModel.username == identifier)).limit(1)
    row = self._session.execute(stmt).scalar_one_or_none()
    if row is None:
      return None
    return User.from_row(
      {
        "id": row.id,
        "username": row.username,
        "email": row.email,
        "role": row.role,
        "full_name": row.full_name,
        "is_active": row.is_active,
        "password_hash": row.password_hash,
      }
    )

  def find_by_id(self, user_id: int) -> User | None:
    stmt = select(UserModel).where(UserModel.id == user_id).limit(1)
    row = self._session.execute(stmt).scalar_one_or_none()
    if row is None:
      return None
    return User.from_row(
      {
        "id": row.id,
        "username": row.username,
        "email": row.email,
        "role": row.role,
        "full_name": row.full_name,
        "is_active": row.is_active,
      }
    )


class HybridUserRepository:
  """Repository hybride: SQLAlchemy pour la lecture, psycopg pour le reste.

  But: permettre de brancher SQLAlchemy sur un sous-ensemble (un “endpoint”/use-case)
  sans casser les endpoints existants qui utilisent des méthodes non migrées.
  """

  def __init__(self, session: Session):
    self._sa_read = SqlAlchemyUserReadRepository(session)
    self._legacy = SqlUserRepository()

  # === lecture migrée ===
  def find_by_identifier(self, identifier: str) -> User | None:
    return self._sa_read.find_by_identifier(identifier)

  def find_by_id(self, user_id: int) -> User | None:
    return self._sa_read.find_by_id(user_id)

  # === fallback psycopg (non migré) ===
  def exists_by_email_or_username(self, email: str, username: str) -> bool:
    return self._legacy.exists_by_email_or_username(email, username)

  def create_pending_clinician(self, *, email: str, username: str, full_name: str | None, password_hash: str) -> None:
    return self._legacy.create_pending_clinician(
      email=email,
      username=username,
      full_name=full_name,
      password_hash=password_hash,
    )

  def list_pending_users(self):
    return self._legacy.list_pending_users()

  def list_active_users(self):
    return self._legacy.list_active_users()

  def find_user_summary(self, user_id: int):
    return self._legacy.find_user_summary(user_id)

  def approve_user(self, user_id: int, role: str) -> None:
    return self._legacy.approve_user(user_id, role)

  def reject_user(self, user_id: int) -> None:
    return self._legacy.reject_user(user_id)

