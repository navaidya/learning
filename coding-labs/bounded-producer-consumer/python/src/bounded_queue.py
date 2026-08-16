from collections import deque
from threading import Condition
from time import monotonic

class BoundedQueue:
    def __init__(self, capacity):
        if capacity <= 0: raise ValueError("capacity must be positive")
        self._items, self._capacity, self._closed, self._condition = deque(), capacity, False, Condition()

    def offer(self, item, timeout):
        deadline = monotonic() + timeout
        with self._condition:
            while not self._closed and len(self._items) == self._capacity:
                remaining = deadline - monotonic()
                if remaining <= 0: return False
                self._condition.wait(remaining)
            if self._closed: return False
            self._items.append(item); self._condition.notify(); return True

    def poll(self, timeout):
        deadline = monotonic() + timeout
        with self._condition:
            while not self._items and not self._closed:
                remaining = deadline - monotonic()
                if remaining <= 0: return ("timeout", None)
                self._condition.wait(remaining)
            if self._items:
                item = self._items.popleft(); self._condition.notify(); return ("item", item)
            return ("closed", None)

    def close(self):
        with self._condition:
            self._closed = True; self._condition.notify_all()
