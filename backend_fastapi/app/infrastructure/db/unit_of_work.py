from __future__ import annotations

from typing import Any

from ...db import get_conn_tx


class DbUnitOfWork:
  """Unité de travail minimale pour les transactions SQL."""

  def __init__(self):
    self.conn: Any | None = None
    self.cursor: Any | None = None

  def __enter__(self) -> "DbUnitOfWork":
    self.conn = get_conn_tx()
    self.cursor = self.conn.cursor()
    return self

  def __exit__(self, exc_type, exc, _tb) -> None:
    if self.conn is None:
      return
    if exc_type is not None:
      self.conn.rollback()
    self.conn.close()

  def commit(self) -> None:
    if self.conn is not None:
      self.conn.commit()

  def rollback(self) -> None:
    if self.conn is not None:
      self.conn.rollback()

