from dataclasses import dataclass

@dataclass(frozen=True)
class Event:
    id: str
    aggregate_id: str
    sequence: int

class OutboxWorkflow:
    def __init__(self): self._events, self._published, self._consumed = [], set(), set()
    def create_order(self, order_id):
        if not order_id: raise ValueError("order id required")
        self._events.append(Event(f"event-{order_id}", order_id, 1))
    def pending(self): return [event for event in self._events if event.id not in self._published]
    def publish_pending(self, publisher):
        for event in self.pending():
            try: publisher(event); self._published.add(event.id)
            except RuntimeError: pass
    def consume(self, event):
        if not event or not event.id or not event.aggregate_id or event.sequence <= 0: return False
        if event.id in self._consumed: return False
        self._consumed.add(event.id); return True
    def events(self): return list(self._events)
