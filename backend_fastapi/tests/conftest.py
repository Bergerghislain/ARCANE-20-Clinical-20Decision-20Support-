from __future__ import annotations

import os
from collections.abc import Iterable

import pytest

# IMPORTANT:
# Certains modules de tests instancient TestClient(app) au moment de l'import.
# Les variables d'environnement doivent donc être positionnées AVANT l'import
# de l'app (sinon settings.py est initialisé avec des valeurs inattendues).
os.environ.setdefault("JWT_SECRET", "test_secret")
os.environ.setdefault("JWT_ISSUER", "arcane")
os.environ.setdefault("JWT_AUDIENCE", "arcane-client")
# Les seeds (seed_demo.py) utilisent de VRAIS hashes bcrypt : les tests
# d'intégration ne dépendent plus du fallback démo, qui reste désactivé.
os.environ.setdefault("ALLOW_DEMO_PASSWORD_FALLBACK", "false")


def _db_available() -> bool:
  # On essaie un import léger + une connexion rapide.
  # IMPORTANT: certains tests d'intégration supposent aussi que la base est
  # migrée (alembic upgrade head) ET seedée (seed_demo.py : users + patients).
  # Sur un poste sans DB (ou DB vide), on préfère skipper ces tests plutôt
  # que d'échouer, tout en conservant l'exécution complète en CI.
  try:
    from backend_fastapi.app import db
    from backend_fastapi.app.settings import settings

    # Réduit drastiquement l'attente si PostgreSQL n'est pas démarré.
    settings.db_connect_timeout_seconds = 1
    conn = db.get_conn()
    conn.close()

    # Vérifie que le schéma + seeds ARCANE existent (seed_demo.py).
    # Un simple "admin@arcane.com" ne suffit pas: on veut éviter de faire tourner
    # les tests d'intégration contre une DB existante non-initialisée ARCANE,
    # ce qui produit des 401/404 trompeurs.
    seeded = db.fetch_one(
      """
      SELECT
        (SELECT COUNT(*) FROM users WHERE email IN (%s, %s, %s, %s)) AS users_ok,
        (SELECT COUNT(*) FROM patients WHERE ipp IN (%s, %s)) AS patients_ok
      """,
      (
        "admin@arcane.com",
        "martin@hospital.com",
        "leclerc@hospital.com",
        "jane@research.com",
        "PAT001",
        "PAT002",
      ),
    )
    if not seeded:
      return False
    return int(seeded.get("users_ok") or 0) >= 4 and int(seeded.get("patients_ok") or 0) >= 2
  except Exception:
    return False


@pytest.fixture(autouse=True)
def _test_env_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
  # Rend les tests déterministes et évite les surprises d'environnement.
  monkeypatch.setenv("JWT_SECRET", os.getenv("JWT_SECRET", "test_secret"))
  monkeypatch.setenv("JWT_ISSUER", os.getenv("JWT_ISSUER", "arcane"))
  monkeypatch.setenv("JWT_AUDIENCE", os.getenv("JWT_AUDIENCE", "arcane-client"))
  # Fallback démo désactivé : l'auth des tests repose sur de vrais hashes bcrypt.
  monkeypatch.setenv(
    "ALLOW_DEMO_PASSWORD_FALLBACK",
    os.getenv("ALLOW_DEMO_PASSWORD_FALLBACK", "false"),
  )


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
  # Les tests existants sont très "end-to-end" et supposent une DB déjà
  # initialisée (setup_database.sql). Sur un poste sans DB, on préfère
  # exécuter les tests unitaires + coverage plutôt que d'échouer.
  db_ok = _db_available()

  integration_files: Iterable[str] = (
    os.path.join("tests", "test_auth.py"),
    os.path.join("tests", "test_patients.py"),
    os.path.join("tests", "test_auth_admin_workflow.py"),
    os.path.join("tests", "test_patient_clinical_write_integration.py"),
    os.path.join("tests", "test_argos_repository_integration.py"),
    os.path.join("tests", "test_patient_clinical_router_integration.py"),
    os.path.join("tests", "test_rbac_access.py"),
    os.path.join("tests", "test_openai_compatible_integration.py"),
  )

  for item in items:
    node_path = str(item.fspath)
    if any(node_path.endswith(p) for p in integration_files):
      item.add_marker(pytest.mark.integration)
      if not db_ok:
        item.add_marker(pytest.mark.skip(reason="PostgreSQL indisponible (tests d'intégration ignorés)."))

