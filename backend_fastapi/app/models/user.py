from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class UserModel(Base):
  """Mapping minimal de la table `users` (compat schéma existant)."""

  __tablename__ = "users"

  id: Mapped[int] = mapped_column(primary_key=True)
  username: Mapped[str] = mapped_column(String(100))
  email: Mapped[str] = mapped_column(String(255))
  role: Mapped[str] = mapped_column(String(50))
  full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
  is_active: Mapped[bool] = mapped_column(Boolean, default=True)
  password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

