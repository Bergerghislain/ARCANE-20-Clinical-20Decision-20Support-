from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file=".env", extra="ignore")

  db_host: str = "localhost"
  db_port: int = 5432
  db_user: str = "postgres"
  db_password: str = "postgres"
  db_name: str = "arcane"

  # Timeout TCP vers PostgreSQL (secondes). Evite les blocages longs si le serveur DB est arrete.
  db_connect_timeout_seconds: int = 15

  @property
  def database_url(self) -> str:
    # SQLAlchemy URL (sync) pour PostgreSQL via psycopg3
    # Exemple: postgresql+psycopg://user:pass@host:5432/dbname
    user = self.db_user
    password = self.db_password
    host = self.db_host
    port = self.db_port
    name = self.db_name
    return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{name}"

  # Cache utilisateur pour resolve_access_token (find_by_id) — TTL court
  user_cache_ttl_seconds: float = 60.0

  # Cout bcrypt pour les **nouveaux** mots de passe (verify utilise le cout du hash existant)
  bcrypt_rounds: int = 10

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

  # === LLM / Qwen integration (backend-side proxy) ===
  # Provider: "openai_compatible" (vLLM/sglang/TGI OpenAI-style) or "disabled"
  llm_provider: str = "disabled"
  llm_base_url: str = "http://127.0.0.1:8001/v1"
  llm_api_key: str | None = None
  llm_model: str = "Qwen/Qwen3-4B"
  llm_timeout_seconds: float = 120.0

  # Generation defaults
  llm_temperature: float = 0.7
  llm_top_p: float = 0.9
  llm_max_tokens: int = 1200


settings = Settings()

