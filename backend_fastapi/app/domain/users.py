from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class User:
  id: int
  username: str
  email: str
  role: str
  full_name: str | None = None
  is_active: bool = True
  password_hash: str | None = None

  @classmethod
  def from_row(cls, row: dict[str, Any]) -> "User":
    return cls(
      id=int(row["id"]),
      username=str(row.get("username") or ""),
      email=str(row.get("email") or ""),
      role=str(row.get("role") or ""),
      full_name=row.get("full_name"),
      is_active=bool(row.get("is_active", True)),
      password_hash=str(row["password_hash"]) if row.get("password_hash") is not None else None,
    )

  def to_public_dict(self) -> dict[str, Any]:
    return {
      "id": self.id,
      "username": self.username,
      "email": self.email,
      "role": self.role,
      "full_name": self.full_name,
      "is_active": self.is_active,
    }

