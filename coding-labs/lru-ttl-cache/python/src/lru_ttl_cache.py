from collections import OrderedDict

class LruTtlCache:
    def __init__(self, capacity, now_ms):
        if capacity <= 0: raise ValueError("capacity must be positive")
        self._capacity, self._now, self._entries = capacity, now_ms, OrderedDict()

    def put(self, key, value, ttl_ms):
        if ttl_ms < 0: raise ValueError("ttl must be non-negative")
        if key is None or value is None: raise ValueError("key and value are required")
        now = self._now()
        self._purge_expired(now)
        self._entries.pop(key, None)
        self._entries[key] = (value, now + ttl_ms)
        while len(self._entries) > self._capacity: self._entries.popitem(last=False)

    def get(self, key):
        if key is None: raise ValueError("key is required")
        entry = self._entries.get(key)
        if entry is None: return None
        if self._now() >= entry[1]: self._entries.pop(key); return None
        self._entries.move_to_end(key)
        return entry[0]

    def size(self): return len(self._entries)

    def _purge_expired(self, now):
        for key, (_, expires_at) in list(self._entries.items()):
            if now >= expires_at: self._entries.pop(key)
