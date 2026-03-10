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

  cors_origins: str = "http://localhost:8080"


settings = Settings()

