from dataclasses import dataclass
from enum import Enum

class Outcome(Enum): SUCCESS = "success"; TIMEOUT = "timeout"; DEPENDENCY_FAILURE = "dependency_failure"
@dataclass(frozen=True)
class DependencyResult:
    outcome: Outcome
    value: str | None = None
    @classmethod
    def success(cls, value): return cls(Outcome.SUCCESS, value)
    @classmethod
    def timeout(cls): return cls(Outcome.TIMEOUT)
    @classmethod
    def failure(cls): return cls(Outcome.DEPENDENCY_FAILURE)
@dataclass(frozen=True)
class Response: outcome: Outcome; value: str | None
@dataclass(frozen=True)
class Event: name: str; request_id: str; outcome: str; duration_ms: int; dependency: str

class RequestPipeline:
    def __init__(self, dependency, sink, now_ms, dependency_name): self._dependency, self._sink, self._now, self._name = dependency, sink, now_ms, dependency_name
    def handle(self, request_id, deadline_ms):
        if not request_id or deadline_ms < 0: raise ValueError("request id and deadline required")
        started = self._now(); self._emit(Event("request_started", request_id, "", 0, self._name))
        try: result = self._dependency(request_id)
        except RuntimeError: result = DependencyResult.failure()
        elapsed = self._now() - started
        if elapsed > deadline_ms: result = DependencyResult.timeout()
        self._emit(Event("dependency_result", request_id, result.outcome.value, elapsed, self._name)); self._emit(Event("request_finished", request_id, result.outcome.value, elapsed, self._name))
        return Response(result.outcome, result.value)
    def _emit(self, event):
        try: self._sink(event)
        except RuntimeError: pass
