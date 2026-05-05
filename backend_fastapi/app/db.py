from __future__ import annotations

from typing import Any

from .db_sqlalchemy import get_engine


def _rows_to_dicts(cursor, rows):  # noqa: ANN001
  if not rows:
    return []
  columns = [col[0] for col in (cursor.description or [])]
  out: list[dict[str, Any]] = []
  for row in rows:
    if isinstance(row, dict):
      out.append(dict(row))
    else:
      out.append({columns[i]: row[i] for i in range(len(columns))})
  return out


def _row_to_dict(cursor, row):  # noqa: ANN001
  if row is None:
    return None
  if isinstance(row, dict):
    return dict(row)
  columns = [col[0] for col in (cursor.description or [])]
  return {columns[i]: row[i] for i in range(len(columns))}


def get_conn():
  """Retourne une connexion DBAPI depuis le pool SQLAlchemy.

  SQLAlchemy devient la référence pour:
  - pool de connexions
  - pre-ping
  - config driver (postgresql+psycopg)
  """
  conn = get_engine().raw_connection()
  # Comportement historique: get_conn() était en autocommit.
  try:
    conn.autocommit = True
  except Exception:
    pass
  return conn


def get_conn_tx():
  """Connexion transactionnelle (autocommit désactivé)."""
  conn = get_conn()
  # DBAPI connection (psycopg3) expose généralement .autocommit
  try:
    conn.autocommit = False
  except Exception:
    pass
  return conn


def fetch_one(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
  conn = get_conn()
  try:
    cur = conn.cursor()
    try:
      cur.execute(query, params)
      row = cur.fetchone()
      # Les INSERT/UPDATE/DELETE peuvent être exécutés via fetch_one (RETURNING ...).
      # En psycopg, on était en autocommit; ici on commit explicitement pour garder
      # la compatibilité comportementale.
      q = (query or "").lstrip().upper()
      if q.startswith(("INSERT", "UPDATE", "DELETE")):
        try:
          conn.commit()
        except Exception:
          pass
      return _row_to_dict(cur, row)
    finally:
      cur.close()
  finally:
    conn.close()


def fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
  conn = get_conn()
  try:
    cur = conn.cursor()
    try:
      cur.execute(query, params)
      rows = cur.fetchall()
      return _rows_to_dicts(cur, rows)
    finally:
      cur.close()
  finally:
    conn.close()


def execute(query: str, params: tuple[Any, ...] = ()) -> int:
  conn = get_conn()
  try:
    cur = conn.cursor()
    try:
      cur.execute(query, params)
      try:
        conn.commit()
      except Exception:
        pass
      return int(getattr(cur, "rowcount", 0) or 0)
    finally:
      cur.close()
  finally:
    conn.close()
