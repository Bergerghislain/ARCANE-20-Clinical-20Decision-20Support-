from __future__ import annotations

import threading
import time
from typing import TYPE_CHECKING

from ...settings import settings

if TYPE_CHECKING:
  from ...domain.users import User

_lock = threading.Lock()
_entries: dict[int, tuple[float, "User"]] = {}


def _ttl() -> float:
  return max(5.0, float(settings.user_cache_ttl_seconds))


def get_cached_user(user_id: int) -> User | None:
  now = time.monotonic()
  with _lock:
    hit = _entries.get(user_id)
    if not hit:
      return None
    expires_at, user = hit
    if now >= expires_at:
      del _entries[user_id]
      return None
    return user


def set_cached_user(user_id: int, user: User) -> None:
  with _lock:
    _entries[user_id] = (time.monotonic() + _ttl(), user)


def invalidate_user(user_id: int) -> None:
  with _lock:
    _entries.pop(user_id, None)


def clear_all_users() -> None:
  with _lock:
    _entries.clear()
