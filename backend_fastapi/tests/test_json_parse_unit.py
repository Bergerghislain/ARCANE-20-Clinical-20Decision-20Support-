from __future__ import annotations

from backend_fastapi.app.infrastructure.ai.json_parse import extract_json_object


def test_extract_json_object_none_on_empty():
  assert extract_json_object("") is None
  assert extract_json_object("   ") is None


def test_extract_json_object_fast_path_dict():
  assert extract_json_object('{"a": 1}') == {"a": 1}


def test_extract_json_object_fast_path_rejects_non_dict():
  assert extract_json_object("[1,2,3]") is None


def test_extract_json_object_slow_path_text_around_json():
  text = "Réponse:\n\n{ \"conclusion\": \"ok\" }\n(fin)"
  assert extract_json_object(text) == {"conclusion": "ok"}


def test_extract_json_object_returns_none_when_no_braces():
  assert extract_json_object("no json here") is None


def test_extract_json_object_returns_none_on_invalid_json_candidate():
  assert extract_json_object("prefix { not valid } suffix") is None


def test_extract_json_object_handles_nested_json():
  text = 'Voici le résultat:\n{"content":"ok","sections":{"clinicalSynthesis":"s"}}\nFin'
  parsed = extract_json_object(text)
  assert parsed is not None
  assert parsed["content"] == "ok"


def test_extract_json_object_rejects_array_root():
  assert extract_json_object('{"a": [1,2]}') == {"a": [1, 2]}

