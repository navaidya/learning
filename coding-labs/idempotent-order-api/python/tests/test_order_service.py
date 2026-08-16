import sys
import threading
import unittest
sys.path.insert(0, "src")
from order_service import OrderService, Status

class OrderServiceTest(unittest.TestCase):
    def test_create_replay_conflict_invalid_and_concurrent(self):
        service = OrderService(); first = service.create("k", "book", 1200); replay = service.create("k", "book", 1200)
        self.assertEqual(first.status, Status.CREATED); self.assertEqual(replay.status, Status.REPLAYED); self.assertEqual(first.order.id, replay.order.id)
        self.assertEqual(service.create("k", "pen", 1200).status, Status.CONFLICT)
        self.assertEqual(service.create("", "book", 1).status, Status.INVALID)
        concurrent = OrderService(); threads = [threading.Thread(target=lambda: concurrent.create("same", "book", 1)) for _ in range(2)]
        [thread.start() for thread in threads]; [thread.join() for thread in threads]
        self.assertEqual(concurrent.order_count(), 1)

if __name__ == "__main__": unittest.main()
