import sys
import unittest
sys.path.insert(0, "src")
from lru_ttl_cache import LruTtlCache

class LruTtlCacheTest(unittest.TestCase):
    def test_recency_expiry_and_validation(self):
        now = [100]
        cache = LruTtlCache(2, lambda: now[0])
        cache.put("a", "A", 10); cache.put("b", "B", 100)
        self.assertEqual(cache.get("a"), "A")
        cache.put("c", "C", 100)
        self.assertIsNone(cache.get("b"))
        now[0] = 110
        self.assertIsNone(cache.get("a"))
        cache.put("z", "Z", 0); self.assertIsNone(cache.get("z"))
        with self.assertRaises(ValueError): LruTtlCache(0, lambda: 0)

if __name__ == "__main__": unittest.main()
