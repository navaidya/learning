import sys
import threading
import unittest
sys.path.insert(0, "src")
from outbox import OutboxWorkflow, Event, Status

class OutboxWorkflowTest(unittest.TestCase):
    def test_status_retry_duplicate_order_and_consumer_deduplication(self):
        workflow = OutboxWorkflow()
        self.assertTrue(workflow.create_order("o-1")); self.assertFalse(workflow.create_order("o-1"))
        self.assertTrue(workflow.create_order("o-2")); self.assertEqual(len(workflow.pending()), 2)
        failures = workflow.publish_pending(lambda event: (_ for _ in ()).throw(RuntimeError("down")))
        self.assertTrue(all(not result.published and result.retries == 1 for result in failures))
        successes = workflow.publish_pending(lambda event: None)
        self.assertTrue(all(result.published for result in successes)); self.assertEqual(len(workflow.pending()), 0)
        event = workflow.events()[0]
        self.assertEqual(event.status, Status.PUBLISHED); self.assertEqual(event.retries, 1)
        self.assertTrue(workflow.consume(event)); self.assertFalse(workflow.consume(event))
        self.assertFalse(workflow.consume(Event("", "", 0)))

    def test_concurrent_duplicate_create_stays_single_event(self):
        workflow = OutboxWorkflow(); threads = [threading.Thread(target=lambda: workflow.create_order("same")) for _ in range(4)]
        [thread.start() for thread in threads]; [thread.join() for thread in threads]
        self.assertEqual(len(workflow.events()), 1)

if __name__ == "__main__": unittest.main()
