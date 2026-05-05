from __future__ import annotations

import os
from typing import Iterable

import pytest


def _db_available() -> bool:
  # On essaie un import léger + une connexion rapide.
  try:
    from backend_fastapi.app import db
    from backend_fastapi.app.settings import settings

    # Réduit drastiquement l'attente si PostgreSQL n'est pas démarré.
    settings.db_connect_timeout_seconds = 1
    conn = db.get_conn()
    conn.close()
    return True
  except Exception:
    return False


@pytest.fixture(autouse=True)
def _test_env_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
  # Rend les tests déterministes et évite les surprises d'environnement.
  monkeypatch.setenv("JWT_SECRET", os.getenv("JWT_SECRET", "test_secret"))
  monkeypatch.setenv("JWT_ISSUER", os.getenv("JWT_ISSUER", "arcane"))
  monkeypatch.setenv("JWT_AUDIENCE", os.getenv("JWT_AUDIENCE", "arcane-client"))


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
  # Les tests existants sont très "end-to-end" et supposent une DB déjà
  # initialisée (setup_database.sql). Sur un poste sans DB, on préfère
  # exécuter les tests unitaires + coverage plutôt que d'échouer.
  db_ok = _db_available()

  integration_files: Iterable[str] = (
    os.path.join("tests", "test_auth.py"),
    os.path.join("tests", "test_patients.py"),
    os.path.join("tests", "test_auth_admin_workflow.py"),
  )

  for item in items:
    node_path = str(item.fspath)
    if any(node_path.endswith(p) for p in integration_files):
      item.add_marker(pytest.mark.integration)
      if not db_ok:
        item.add_marker(pytest.mark.skip(reason="PostgreSQL indisponible (tests d'intégration ignorés)."))

