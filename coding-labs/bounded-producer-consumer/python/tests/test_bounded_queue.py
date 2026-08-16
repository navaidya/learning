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

    def test_close_wakes_blocked_producer_and_consumer(self):
        producer_waiting = threading.Event(); producer_result = []
        blocked_producer = BoundedQueue(1, on_wait=producer_waiting.set); blocked_producer.offer("full", 0)
        producer = threading.Thread(target=lambda: producer_result.append(blocked_producer.offer("blocked", 1)))
        producer.start(); self.assertTrue(producer_waiting.wait(1)); blocked_producer.close(); producer.join(1)
        self.assertFalse(producer.is_alive()); self.assertEqual(producer_result, [False])
        consumer_waiting = threading.Event(); consumer_result = []
        blocked_consumer = BoundedQueue(1, on_wait=consumer_waiting.set)
        consumer = threading.Thread(target=lambda: consumer_result.append(blocked_consumer.poll(1)))
        consumer.start(); self.assertTrue(consumer_waiting.wait(1)); blocked_consumer.close(); consumer.join(1)
        self.assertFalse(consumer.is_alive()); self.assertEqual(consumer_result, [("closed", None)])

if __name__ == "__main__": unittest.main()
