from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file=".env", extra="ignore")

  db_host: str = "localhost"
  db_port: int = 5432
  db_user: str = "postgres"
  db_password: str = "postgres"
  db_name: str = "arcane"

  jwt_secret: str = "change_me_dev_only"
  jwt_issuer: str = "arcane"
  jwt_audience: str = "arcane-client"
  access_token_expire_minutes: int = 60
  ping_message: str = "ping"

  # Durée de vie des refresh tokens (jours)
  refresh_token_expire_days: int = 7

  # Cookies (pour refresh_token)
  cookie_domain: str | None = None
  cookie_secure: bool = False
  cookie_samesite: str = "lax"

  cors_origins: str = "http://localhost:8080"

  # Compatibilité démo: autoriser le mot de passe "password" sur des hashes factices.
  # À désactiver en production.
  allow_demo_password_fallback: bool = True


settings = Settings()

