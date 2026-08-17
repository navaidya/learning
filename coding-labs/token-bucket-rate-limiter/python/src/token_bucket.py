from dataclasses import dataclass
from threading import Lock

@dataclass(frozen=True)
class Decision:
    allowed: bool
    remaining_tokens: int
    retry_after_ms: int

class TokenBucket:
    def __init__(self, capacity, tokens_per_second, now_ms):
        if capacity <= 0 or tokens_per_second < 0: raise ValueError("invalid capacity or rate")
        self._capacity, self._rate, self._now = capacity, tokens_per_second, now_ms
        self._tokens, self._updated_at, self._lock = float(capacity), now_ms(), Lock()

    def try_acquire(self, cost):
        if cost <= 0 or cost > self._capacity: raise ValueError("cost must be within capacity")
        with self._lock:
            now = max(self._now(), self._updated_at); elapsed = now - self._updated_at; self._updated_at = now
            self._tokens = min(self._capacity, self._tokens + elapsed * self._rate / 1000)
            if self._tokens >= cost:
                self._tokens -= cost
                return Decision(True, int(self._tokens), 0)
            retry = 2**63 - 1 if self._rate == 0 else int(-(-(cost - self._tokens) * 1000 // self._rate))
            return Decision(False, int(self._tokens), retry)
