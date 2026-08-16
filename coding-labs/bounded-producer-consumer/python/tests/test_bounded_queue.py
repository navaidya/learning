import sys
import threading
import unittest
sys.path.insert(0, "src")
from bounded_queue import BoundedQueue

class BoundedQueueTest(unittest.TestCase):
    def test_timeout_fifo_and_drain_on_close(self):
        queue = BoundedQueue(1)
        self.assertTrue(queue.offer("first", 0))
        self.assertFalse(queue.offer("second", 0.001))
        self.assertEqual(queue.poll(0), ("item", "first"))
        self.assertEqual(queue.poll(0.001)[0], "timeout")
        queue.offer("drain", 0); queue.close(); queue.close()
        self.assertEqual(queue.poll(0), ("item", "drain"))
        self.assertEqual(queue.poll(0)[0], "closed")
        self.assertFalse(queue.offer("late", 0))
        handoff = BoundedQueue(1); received = []
        thread = threading.Thread(target=lambda: received.append(handoff.poll(0.1)))
        thread.start(); self.assertTrue(handoff.offer("handoff", 0.1)); thread.join()
        self.assertEqual(received, [("item", "handoff")])

if __name__ == "__main__": unittest.main()
