from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from .settings import settings


# NOTE: SQLAlchemy est intégré **en parallèle** de psycopg (db.py).
# On évite tout "side effect" au moment de l'import pour ne pas casser
# les environnements sans DB (tests unitaires, CI, etc.).
_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine:
  """Retourne un engine SQLAlchemy sync (lazy-init)."""
  global _engine
  if _engine is None:
    # Paramètres sûrs côté prod/dev:
    # - pool_pre_ping: évite les connexions mortes
    # - echo: debug SQL opt-in via settings
    _engine = create_engine(
      settings.database_url,
      pool_pre_ping=True,
      echo=getattr(settings, "sqlalchemy_echo", False),
      connect_args={"connect_timeout": settings.db_connect_timeout_seconds},
    )
  return _engine


def get_sessionmaker() -> sessionmaker[Session]:
  """Retourne un sessionmaker (lazy-init)."""
  global _SessionLocal
  if _SessionLocal is None:
    _SessionLocal = sessionmaker(
      bind=get_engine(),
      autocommit=False,
      autoflush=False,
      expire_on_commit=False,
    )
  return _SessionLocal


def get_db() -> Generator[Session, None, None]:
  """Dépendance FastAPI pour fournir une session SQLAlchemy."""
  db = get_sessionmaker()()
  try:
    yield db
  finally:
    db.close()


# Backward-compat: certains imports peuvent s'appuyer sur ces noms.
# Ils restent disponibles, mais sont initialisés à la demande.
def _engine_proxy() -> Engine:
  return get_engine()


engine = _engine_proxy()  # type: ignore[assignment]
SessionLocal = get_sessionmaker()

