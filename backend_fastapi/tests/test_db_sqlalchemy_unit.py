from __future__ import annotations

import types

from backend_fastapi.app import db_sqlalchemy


def test_get_engine_lazy_init(monkeypatch):
  created = {"count": 0}

  def fake_create_engine(*args, **kwargs):  # noqa: ANN001
    created["count"] += 1
    return types.SimpleNamespace(url=args[0], kwargs=kwargs)

  monkeypatch.setattr(db_sqlalchemy, "create_engine", fake_create_engine)
  monkeypatch.setattr(
    db_sqlalchemy.settings.__class__,
    "database_url",
    property(lambda _self: "postgresql+psycopg://u:p@h:5432/db"),
  )
  # reset lazy singletons
  monkeypatch.setattr(db_sqlalchemy, "_engine", None, raising=False)
  monkeypatch.setattr(db_sqlalchemy, "_SessionLocal", None, raising=False)

  e1 = db_sqlalchemy.get_engine()
  e2 = db_sqlalchemy.get_engine()
  assert created["count"] == 1
  assert e1 is e2


def test_get_db_yields_and_closes_session(monkeypatch):
  closed = {"count": 0}

  class FakeSession:
    def close(self):  # noqa: ANN001
      closed["count"] += 1

  def fake_sessionmaker():  # noqa: ANN001
    return lambda: FakeSession()

  monkeypatch.setattr(db_sqlalchemy, "get_sessionmaker", fake_sessionmaker)

  gen = db_sqlalchemy.get_db()
  sess = next(gen)
  assert isinstance(sess, FakeSession)
  gen.close()
  assert closed["count"] == 1

