from dataclasses import dataclass
from enum import Enum
from threading import Lock

class Status(Enum): CREATED = "created"; REPLAYED = "replayed"; CONFLICT = "conflict"; INVALID = "invalid"
@dataclass(frozen=True)
class Order: id: str; fingerprint: str; amount_cents: int
@dataclass(frozen=True)
class Result: status: Status; order: Order | None

class OrderService:
    def __init__(self): self._records, self._next_id, self._lock = {}, 0, Lock()
    def create(self, key, item, amount_cents):
        if not key or not key.strip() or not item or not item.strip() or amount_cents <= 0: return Result(Status.INVALID, None)
        fingerprint = f"{item}:{amount_cents}"
        with self._lock:
            existing = self._records.get(key)
            if existing: return Result(Status.REPLAYED if existing.fingerprint == fingerprint else Status.CONFLICT, existing)
            self._next_id += 1; order = Order(f"order-{self._next_id}", fingerprint, amount_cents); self._records[key] = order
            return Result(Status.CREATED, order)
    def order_count(self):
        with self._lock: return len(self._records)
