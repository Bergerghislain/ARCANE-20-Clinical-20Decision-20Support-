from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, patients, argos, admin
from .settings import settings


def _parse_origins(value: str) -> list[str]:
  origins = [o.strip() for o in (value or "").split(",")]
  return [o for o in origins if o]


app = FastAPI(title="ARCANE API (FastAPI)", version="0.1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=_parse_origins(settings.cors_origins),
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.get("/api/ping")
def ping() -> dict[str, str]:
  return {"message": "ping"}


app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(argos.router)
app.include_router(admin.router)

