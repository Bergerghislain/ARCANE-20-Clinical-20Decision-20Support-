from __future__ import annotations

from typing import Any

from ...db import get_conn_tx


class _DictCursor:
  """Proxy cursor qui retourne des dicts (compat psycopg dict_row)."""

  def __init__(self, inner):  # noqa: ANN001
    self._inner = inner

  def execute(self, query: str, params: tuple[Any, ...] = ()):  # noqa: ANN001
    return self._inner.execute(query, params)

  @property
  def description(self):  # noqa: ANN001
    return self._inner.description

  def fetchone(self):  # noqa: ANN001
    row = self._inner.fetchone()
    if row is None:
      return None
    if isinstance(row, dict):
      return dict(row)
    cols = [c[0] for c in (self._inner.description or [])]
    return {cols[i]: row[i] for i in range(len(cols))}

  def fetchall(self):  # noqa: ANN001
    rows = self._inner.fetchall()
    if not rows:
      return []
    if isinstance(rows[0], dict):
      return [dict(r) for r in rows]
    cols = [c[0] for c in (self._inner.description or [])]
    return [{cols[i]: r[i] for i in range(len(cols))} for r in rows]

  def close(self) -> None:
    try:
      self._inner.close()
    except Exception:
      pass


class DbUnitOfWork:
  """Unité de travail minimale pour les transactions SQL."""

  def __init__(self):
    self.conn: Any | None = None
    self.cursor: Any | None = None

  def __enter__(self) -> DbUnitOfWork:
    self.conn = get_conn_tx()
    self.cursor = _DictCursor(self.conn.cursor())
    return self

  def __exit__(self, exc_type, exc, _tb) -> None:
    if self.conn is None:
      return
    if exc_type is not None:
      self.conn.rollback()
    if self.cursor is not None:
      try:
        self.cursor.close()
      except Exception:
        pass
    self.conn.close()

  def commit(self) -> None:
    if self.conn is not None:
      self.conn.commit()

  def rollback(self) -> None:
    if self.conn is not None:
      self.conn.rollback()

