from dataclasses import dataclass
from enum import Enum
from threading import RLock

class Status(Enum): PENDING = "pending"; PUBLISHED = "published"
@dataclass(frozen=True)
class Event:
    id: str
    aggregate_id: str
    sequence: int
    status: Status = Status.PENDING
    retries: int = 0
@dataclass(frozen=True)
class PublishResult:
    event_id: str
    published: bool
    retries: int

class OutboxWorkflow:
    def __init__(self): self._events, self._orders, self._consumed, self._lock = [], set(), set(), RLock()
    def create_order(self, order_id):
        if not order_id: raise ValueError("order id required")
        with self._lock:
            if order_id in self._orders: return False
            self._orders.add(order_id); self._events.append(Event(f"event-{order_id}", order_id, 1)); return True
    def pending(self):
        with self._lock: return [event for event in self._events if event.status is Status.PENDING]
    def publish_pending(self, publisher):
        results = []
        for event in self.pending():
            try: publisher(event); results.append(self._update(event, Status.PUBLISHED, event.retries))
            except RuntimeError: results.append(self._update(event, Status.PENDING, event.retries + 1))
        return results
    def _update(self, event, status, retries):
        with self._lock:
            for index, current in enumerate(self._events):
                if current.id == event.id: self._events[index] = Event(event.id, event.aggregate_id, event.sequence, status, retries); break
        return PublishResult(event.id, status is Status.PUBLISHED, retries)
    def consume(self, event):
        if not event or not event.id or not event.aggregate_id or event.sequence <= 0: return False
        with self._lock:
            if event.id in self._consumed: return False
            self._consumed.add(event.id); return True
    def events(self):
        with self._lock: return list(self._events)
