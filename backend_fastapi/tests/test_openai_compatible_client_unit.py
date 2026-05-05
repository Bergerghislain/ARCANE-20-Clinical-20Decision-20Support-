from __future__ import annotations

import types

import pytest

from backend_fastapi.app.application.errors import ApplicationError
from backend_fastapi.app.infrastructure.ai.openai_compatible_client import OpenAiCompatibleClient
from backend_fastapi.app.settings import settings


def test_openai_client_raises_503_when_provider_disabled():
  old = settings.llm_provider
  try:
    settings.llm_provider = "disabled"
    with pytest.raises(ApplicationError) as exc:
      OpenAiCompatibleClient().chat([{"role": "user", "content": "hi"}])
    assert exc.value.status_code == 503
  finally:
    settings.llm_provider = old


def test_openai_client_wraps_http_status_error(monkeypatch: pytest.MonkeyPatch):
  old = settings.llm_provider
  try:
    settings.llm_provider = "openai_compatible"

    class _Resp:
      status_code = 400

      def json(self):  # noqa: ANN001
        return {}

    class _Client:
      def __init__(self, *args, **kwargs):  # noqa: ANN001
        pass

      def __enter__(self):  # noqa: ANN001
        return self

      def __exit__(self, *args):  # noqa: ANN001
        return None

      def post(self, *args, **kwargs):  # noqa: ANN001
        return _Resp()

    import backend_fastapi.app.infrastructure.ai.openai_compatible_client as mod

    monkeypatch.setattr(mod, "httpx", types.SimpleNamespace(Client=_Client, RequestError=Exception))
    with pytest.raises(ApplicationError) as exc:
      OpenAiCompatibleClient().chat([{"role": "user", "content": "hi"}])
    assert exc.value.status_code == 502
  finally:
    settings.llm_provider = old

