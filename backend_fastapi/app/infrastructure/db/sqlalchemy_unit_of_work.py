from __future__ import annotations

from collections.abc import Callable

from sqlalchemy.orm import Session


class SqlAlchemyUnitOfWork:
  """Unité de travail SQLAlchemy (sync) pour transactions.

  Objectif: proposer une alternative propre au DbUnitOfWork psycopg,
  sans casser l'existant. Cette UoW est utilisable pour migrer des
  opérations progressivement vers SQLAlchemy (transaction + rollback).
  """

  def __init__(self, session_factory: Callable[[], Session]):
    self._session_factory = session_factory
    self.session: Session | None = None

  def __enter__(self) -> "SqlAlchemyUnitOfWork":
    self.session = self._session_factory()
    return self

  def __exit__(self, exc_type, exc, _tb) -> None:
    if self.session is None:
      return
    try:
      if exc_type is not None:
        self.session.rollback()
    finally:
      self.session.close()

  def commit(self) -> None:
    if self.session is not None:
      self.session.commit()

  def rollback(self) -> None:
    if self.session is not None:
      self.session.rollback()

