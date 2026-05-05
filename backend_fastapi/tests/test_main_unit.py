from __future__ import annotations

from pathlib import Path

from backend_fastapi.app import main


def test_parse_origins_splits_and_trims_and_removes_empty():
  assert main._parse_origins(" http://a, ,http://b  ,") == ["http://a", "http://b"]


def test_is_inside_spa_rejects_path_outside_spa(tmp_path: Path):
  # On pointe temporairement SPA_DIST_DIR vers tmp_path/spa
  spa = tmp_path / "spa"
  spa.mkdir()
  inside = spa / "index.html"
  inside.write_text("ok", encoding="utf-8")

  old = main.SPA_DIST_DIR
  try:
    main.SPA_DIST_DIR = spa
    assert main._is_inside_spa(inside) is True
    assert main._is_inside_spa(tmp_path / "other.txt") is False
  finally:
    main.SPA_DIST_DIR = old

