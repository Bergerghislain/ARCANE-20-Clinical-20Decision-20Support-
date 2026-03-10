from __future__ import annotations

from typing import Any

import psycopg
from psycopg.rows import dict_row

from .settings import settings


def _connect(autocommit: bool) -> psycopg.Connection[Any]:
  return psycopg.connect(
    host=settings.db_host,
    port=settings.db_port,
    user=settings.db_user,
    password=settings.db_password,
    dbname=settings.db_name,
    row_factory=dict_row,
    autocommit=autocommit,
  )


def get_conn() -> psycopg.Connection[Any]:
  """Connexion en autocommit (requêtes simples)."""
  return _connect(autocommit=True)


def get_conn_tx() -> psycopg.Connection[Any]:
  """Connexion sans autocommit pour les transactions manuelles."""
  return _connect(autocommit=False)


def fetch_one(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute(query, params)
      return cur.fetchone()


def fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute(query, params)
      rows = cur.fetchall()
      return list(rows or [])


def execute(query: str, params: tuple[Any, ...] = ()) -> int:
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute(query, params)
      return cur.rowcount

