import sys
import unittest
sys.path.insert(0, "src")
from retry_policy import RetryPolicy, RetryableFailure, PermanentFailure

class RetryPolicyTest(unittest.TestCase):
    def test_retry_jitter_permanent_and_budget(self):
        now, delays, attempts = [0], [], [0]
        policy = RetryPolicy(3, 100, 10, 50, lambda: now[0], lambda delay: (delays.append(delay), now.__setitem__(0, now[0] + delay)), lambda: 0.5)
        def operation():
            attempts[0] += 1
            if attempts[0] == 1: raise RetryableFailure("temporary")
            return "ok"
        result = policy.execute(operation)
        self.assertTrue(result.success); self.assertEqual(result.attempts, 2); self.assertEqual(delays, [5])
        immediate_sleeps = []
        immediate = RetryPolicy(3, 100, 10, 50, lambda: 0, immediate_sleeps.append, lambda: 1)
        immediate_result = immediate.execute(lambda: "first-attempt")
        self.assertTrue(immediate_result.success); self.assertEqual(immediate_result.attempts, 1); self.assertEqual(immediate_sleeps, [])
        self.assertEqual(RetryPolicy(3, 0, 10, 50, lambda: 0, lambda _: None, lambda: 1).execute(lambda: (_ for _ in ()).throw(RetryableFailure("x"))).attempts, 1)
        self.assertFalse(policy.execute(lambda: (_ for _ in ()).throw(PermanentFailure("bad"))).success)
        capped = []
        exhausted = RetryPolicy(3, 1000, 100, 150, lambda: 0, capped.append, lambda: 1)
        self.assertEqual(exhausted.execute(lambda: (_ for _ in ()).throw(RetryableFailure("x"))).attempts, 3)
        self.assertEqual(capped, [100, 150])

if __name__ == "__main__": unittest.main()
