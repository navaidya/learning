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
@dataclass(frozen=True)
class Metric: name: str; outcome: str; value: int

class RequestPipeline:
    def __init__(self, dependency, event_sink, metric_sink, now_ms, dependency_name): self._dependency, self._events, self._metrics, self._now, self._name = dependency, event_sink, metric_sink, now_ms, dependency_name
    def handle(self, request_id, deadline_ms):
        if not isinstance(request_id, str): raise ValueError("request id and deadline required")
        request_id = request_id.strip()
        if not request_id or deadline_ms < 0: raise ValueError("request id and deadline required")
        started = self._now(); self._emit(Event("request_started", request_id, "in_progress", 0, self._name))
        try: result = self._dependency(request_id)
        except RuntimeError: result = DependencyResult.failure()
        elapsed = self._now() - started
        if elapsed > deadline_ms: result = DependencyResult.timeout()
        outcome = result.outcome.value
        self._emit(Event("dependency_result", request_id, outcome, elapsed, self._name)); self._emit(Event("request_finished", request_id, outcome, elapsed, self._name)); self._metric(Metric("request_latency_ms", outcome, elapsed)); self._metric(Metric("request_outcome_total", outcome, 1))
        return Response(result.outcome, result.value)
    def _emit(self, event):
        try: self._events(event)
        except RuntimeError: pass
    def _metric(self, metric):
        try: self._metrics(metric)
        except RuntimeError: pass
