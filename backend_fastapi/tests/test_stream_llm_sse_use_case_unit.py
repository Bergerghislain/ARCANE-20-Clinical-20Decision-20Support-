from __future__ import annotations

import asyncio

import pytest
from backend_fastapi.app.application.errors import ApplicationError
from backend_fastapi.app.application.use_cases.stream_llm_sse import StreamLlmSseUseCase
from backend_fastapi.app.infrastructure.ai.mock_llm_client import MockJsonLlmClient


def test_stream_llm_sse_use_case_raises_when_port_none():
  uc = StreamLlmSseUseCase(None)
  with pytest.raises(ApplicationError) as exc:
    uc.iter_events([])
  assert exc.value.status_code == 503


def test_stream_llm_sse_use_case_yields_done_with_mock():
  uc = StreamLlmSseUseCase(MockJsonLlmClient())

  async def run() -> list[str]:
    chunks: list[str] = []
    async for line in uc.iter_events(
      [
        {"role": "system", "content": "Tu es un assistant clinique."},
        {"role": "user", "content": "{}"},
      ],
    ):
      chunks.append(line)
    return chunks

  chunks = asyncio.run(run())
  assert any("[DONE]" in c for c in chunks)
