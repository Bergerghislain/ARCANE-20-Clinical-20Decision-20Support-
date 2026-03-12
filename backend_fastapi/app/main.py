from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .routers import admin, argos, auth, patients
from .settings import settings


def _parse_origins(value: str) -> list[str]:
  origins = [o.strip() for o in (value or "").split(",")]
  return [o for o in origins if o]


app = FastAPI(title="ARCANE API (FastAPI)", version="0.1.0")
SPA_DIST_DIR = Path(__file__).resolve().parents[2] / "dist" / "spa"


app.add_middleware(
  CORSMiddleware,
  allow_origins=_parse_origins(settings.cors_origins),
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.get("/api/ping")
def ping() -> dict[str, str]:
  return {"message": settings.ping_message}


@app.get("/api/demo")
def demo() -> dict[str, str]:
  return {"message": "Hello from FastAPI server"}


app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(argos.router)
app.include_router(admin.router)


def _is_inside_spa(path: Path) -> bool:
  try:
    path.resolve().relative_to(SPA_DIST_DIR.resolve())
    return True
  except ValueError:
    return False


if SPA_DIST_DIR.exists():
  @app.get("/", include_in_schema=False)
  def serve_index() -> FileResponse:
    return FileResponse(SPA_DIST_DIR / "index.html")

  @app.get("/{full_path:path}", include_in_schema=False)
  def serve_spa(full_path: str) -> FileResponse:
    if full_path.startswith("api/"):
      raise HTTPException(status_code=404, detail="API endpoint not found")

    requested_file = (SPA_DIST_DIR / full_path).resolve()
    if requested_file.is_file() and _is_inside_spa(requested_file):
      return FileResponse(requested_file)

    return FileResponse(SPA_DIST_DIR / "index.html")

