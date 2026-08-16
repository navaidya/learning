import sys
import threading
import unittest
sys.path.insert(0, "src")
from token_bucket import TokenBucket

class TokenBucketTest(unittest.TestCase):
    def test_refill_validation_and_atomic_burst(self):
        now = [0]
        bucket = TokenBucket(2, 1, lambda: now[0])
        self.assertTrue(bucket.try_acquire(1).allowed); self.assertTrue(bucket.try_acquire(1).allowed)
        self.assertFalse(bucket.try_acquire(1).allowed)
        now[0] = 1000; self.assertTrue(bucket.try_acquire(1).allowed)
        now[0] = 101000; self.assertTrue(bucket.try_acquire(1).allowed); self.assertTrue(bucket.try_acquire(1).allowed)
        retry = TokenBucket(3, 2, lambda: now[0]); retry.try_acquire(3)
        self.assertEqual(retry.try_acquire(1).retry_after_ms, 500)
        self.assertEqual(retry.try_acquire(1).retry_after_ms, 500)
        now[0] = 101500; retry.try_acquire(1); now[0] = 101000
        self.assertFalse(retry.try_acquire(1).allowed)
        with self.assertRaises(ValueError): bucket.try_acquire(0)
        burst = TokenBucket(2, 0, lambda: 0); allowed = []
        threads = [threading.Thread(target=lambda: allowed.append(burst.try_acquire(1).allowed)) for _ in range(5)]
        [thread.start() for thread in threads]; [thread.join() for thread in threads]
        self.assertEqual(sum(allowed), 2)

if __name__ == "__main__": unittest.main()
